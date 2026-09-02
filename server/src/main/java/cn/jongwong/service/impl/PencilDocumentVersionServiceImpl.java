package main.java.cn.jongwong.service.impl;

import cn.jongwong.domain.entity.User;
import cn.jongwong.domain.repository.UserRepository;
import cn.jongwong.entity.PencilDocument;
import cn.jongwong.entity.PencilDocumentHistory;
import cn.jongwong.exception.ApiException;
import cn.jongwong.repository.PencilDocumentHistoryRepository;
import cn.jongwong.repository.PencilFileRepository;
import cn.jongwong.ro.PencilDocumentVersionListResponse;
import cn.jongwong.ro.PencilDocumentVersionResponse;
import cn.jongwong.ro.UpdateDocumentVersionRequest;
import cn.jongwong.security.SecurityUtils;
import cn.jongwong.service.OssService;
import cn.jongwong.service.PencilDocumentVersionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Clock;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class PencilDocumentVersionServiceImpl implements PencilDocumentVersionService {

    public static final int MAX_AUTOSAVES = 30;
    private static final int DEFAULT_NAMED_LIMIT = 20;
    private static final int MAX_NAMED_LIMIT = 50;
    private static final int MAX_TITLE = 200;
    private static final int MAX_DESCRIPTION = 2000;

    private final PencilFileRepository pencilFileRepository;
    private final PencilDocumentHistoryRepository historyRepository;
    private final UserRepository userRepository;
    private final OssService ossService;
    private final SecurityUtils securityUtils;

    @Override
    @Transactional(readOnly = true)
    public PencilDocumentVersionListResponse list(String documentKey, Long namedBefore, Integer namedLimit) {
        PencilDocument document = requireDocument(documentKey);
        int limit = namedLimit == null ? DEFAULT_NAMED_LIMIT : namedLimit;
        if (limit < 1) {
            limit = 1;
        }
        if (limit > MAX_NAMED_LIMIT) {
            limit = MAX_NAMED_LIMIT;
        }

        PageRequest page = PageRequest.of(0, limit + 1);
        List<PencilDocumentHistory> named;
        if (namedBefore == null) {
            named = historyRepository.findByDocumentIdAndKindAndIsDeletedOrderByCreatedAtDesc(
                    document.getId(), PencilDocumentHistory.KIND_NAMED, 0, page);
        } else {
            named = historyRepository.findByDocumentIdAndKindAndIsDeletedAndCreatedAtLessThanOrderByCreatedAtDesc(
                    document.getId(), PencilDocumentHistory.KIND_NAMED, 0, namedBefore, page);
        }
        boolean hasMore = named.size() > limit;
        if (hasMore) {
            named = new ArrayList<>(named.subList(0, limit));
        }

        List<PencilDocumentHistory> autosaves =
                historyRepository.findByDocumentIdAndKindAndIsDeletedOrderByCreatedAtDesc(
                        document.getId(), PencilDocumentHistory.KIND_AUTOSAVE, 0);

        Map<String, String> names = userNames(named, autosaves);
        return PencilDocumentVersionListResponse.builder()
                .currentUpdatedAt(document.getUpdatedAt())
                .autosaveCount((long) autosaves.size())
                .autosaves(autosaves.stream().map(row -> toResponse(document, row, names)).toList())
                .named(named.stream().map(row -> toResponse(document, row, names)).toList())
                .namedHasMore(hasMore)
                .build();
    }

    @Override
    @Transactional
    public PencilDocumentVersionResponse create(
            String documentKey,
            String kind,
            String title,
            String description,
            MultipartFile file
    ) {
        PencilDocument document = requireDocument(documentKey);
        String normalizedKind = normalizeKind(kind);
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("History snapshot file is required");
        }

        String historyId = UUID.randomUUID().toString();
        String stamp = historyStamp();
        String fileName = figFileName(document.getName());
        String directory = "fig/" + documentKey + "/" + stamp;
        String objectPath = "/" + directory + "/" + fileName;
        try {
            ossService.upload(directory, fileName, file.getBytes());
        } catch (IOException error) {
            throw ApiException.internalError("Failed to store history snapshot");
        }

        User user = securityUtils.getCurrentUser();
        PencilDocumentHistory saved = historyRepository.save(PencilDocumentHistory.builder()
                .id(historyId)
                .documentId(document.getId())
                .documentKey(document.getKey())
                .kind(normalizedKind)
                .title(trimToNull(title, MAX_TITLE))
                .description(trimToNull(description, MAX_DESCRIPTION))
                .url(objectPath)
                .createdBy(user != null ? user.getId() : null)
                .createdAt(System.currentTimeMillis())
                .isDeleted(0)
                .build());

        if (PencilDocumentHistory.KIND_AUTOSAVE.equals(normalizedKind)) {
            pruneAutosaves(document.getId());
        }
        return toResponse(document, saved, userNameMap(user));
    }

    @Override
    @Transactional
    public PencilDocumentVersionResponse update(
            String documentKey,
            String versionId,
            UpdateDocumentVersionRequest request
    ) {
        PencilDocument document = requireDocument(documentKey);
        PencilDocumentHistory history = requireHistory(document.getId(), versionId);
        if (!PencilDocumentHistory.KIND_NAMED.equals(history.getKind())) {
            throw ApiException.badRequest("Only named versions can be edited");
        }
        if (request.getTitle() != null) {
            history.setTitle(trimToNull(request.getTitle(), MAX_TITLE));
        }
        if (request.getDescription() != null) {
            history.setDescription(trimToNull(request.getDescription(), MAX_DESCRIPTION));
        }
        return toResponse(document, historyRepository.save(history), lookupUserNames(List.of(history)));
    }

    @Override
    @Transactional
    public PencilDocumentVersionResponse restore(String documentKey, String versionId) {
        PencilDocument document = requireDocument(documentKey);
        PencilDocumentHistory history = requireHistory(document.getId(), versionId);
        String livePath = ossPath(document.getUrl());
        if (!ossService.copy(ossPath(history.getUrl()), livePath)) {
            throw ApiException.internalError("Failed to restore history snapshot");
        }
        document.setUpdatedAt(System.currentTimeMillis());
        pencilFileRepository.save(document);
        return toResponse(document, history, lookupUserNames(List.of(history)));
    }

    private void pruneAutosaves(String documentId) {
        List<PencilDocumentHistory> autosaves =
                historyRepository.findByDocumentIdAndKindAndIsDeletedOrderByCreatedAtDesc(
                        documentId, PencilDocumentHistory.KIND_AUTOSAVE, 0);
        if (autosaves.size() <= MAX_AUTOSAVES) {
            return;
        }
        for (PencilDocumentHistory extra : autosaves.subList(MAX_AUTOSAVES, autosaves.size())) {
            extra.setIsDeleted(1);
            historyRepository.save(extra);
            ossService.delete(ossPath(extra.getUrl()));
        }
    }

    private PencilDocument requireDocument(String documentKey) {
        return pencilFileRepository.findByKeyAndIsDeleted(documentKey, 0)
                .orElseThrow(() -> ApiException.notFound("Document not found: " + documentKey));
    }

    private PencilDocumentHistory requireHistory(String documentId, String historyId) {
        return historyRepository.findByIdAndDocumentIdAndIsDeleted(historyId, documentId, 0)
                .orElseThrow(() -> ApiException.notFound("History not found"));
    }

    @SafeVarargs
    private Map<String, String> userNames(List<PencilDocumentHistory>... groups) {
        List<PencilDocumentHistory> rows = new ArrayList<>();
        for (List<PencilDocumentHistory> group : groups) {
            rows.addAll(group);
        }
        return lookupUserNames(rows);
    }

    private Map<String, String> lookupUserNames(List<PencilDocumentHistory> rows) {
        Set<String> ids = rows.stream()
                .map(PencilDocumentHistory::getCreatedBy)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        if (ids.isEmpty()) {
            return Map.of();
        }
        Map<String, String> names = new HashMap<>();
        for (User user : userRepository.findAllById(ids)) {
            names.put(user.getId(), user.getName());
        }
        return names;
    }

    private static Map<String, String> userNameMap(User user) {
        if (user == null || user.getId() == null) {
            return Map.of();
        }
        return Map.of(user.getId(), user.getName());
    }

    private PencilDocumentVersionResponse toResponse(
            PencilDocument document,
            PencilDocumentHistory history,
            Map<String, String> names
    ) {
        String createdBy = history.getCreatedBy();
        String documentKey = history.getDocumentKey() != null ? history.getDocumentKey() : document.getKey();
        return PencilDocumentVersionResponse.builder()
                .id(history.getId())
                .documentId(history.getDocumentId() != null ? history.getDocumentId() : document.getId())
                .documentKey(documentKey)
                .kind(history.getKind())
                .title(history.getTitle())
                .description(history.getDescription())
                .url(history.getUrl())
                .createdBy(createdBy)
                .createdByName(createdBy == null ? null : names.get(createdBy))
                .createdAt(history.getCreatedAt())
                .build();
    }

    private static String normalizeKind(String kind) {
        String value = kind == null ? PencilDocumentHistory.KIND_NAMED : kind.trim().toLowerCase(Locale.ROOT);
        if (PencilDocumentHistory.KIND_NAMED.equals(value) || PencilDocumentHistory.KIND_AUTOSAVE.equals(value)) {
            return value;
        }
        throw ApiException.badRequest("kind must be named or autosave");
    }

    private static String trimToNull(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        return trimmed.length() > maxLength ? trimmed.substring(0, maxLength) : trimmed;
    }

    static String historyStamp() {
        return historyStamp(Clock.systemDefaultZone());
    }

    static String historyStamp(Clock clock) {
        return DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS")
                .withZone(clock.getZone())
                .format(clock.instant());
    }

    static String figFileName(String documentName) {
        String name = documentName == null || documentName.isBlank() ? "document" : documentName.trim();
        name = name.replace("\\", "_").replace("/", "_");
        if (name.toLowerCase(Locale.ROOT).endsWith(".fig")) {
            return name;
        }
        return name + ".fig";
    }

    static String ossPath(String url) {
        if (url == null) {
            return "";
        }
        String path = url.trim();
        while (path.startsWith("/")) {
            path = path.substring(1);
        }
        return path;
    }
}
