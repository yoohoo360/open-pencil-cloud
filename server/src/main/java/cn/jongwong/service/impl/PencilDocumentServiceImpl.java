package cn.jongwong.service.impl;

import cn.jongwong.authz.AccessRole;
import cn.jongwong.authz.AuthzService;
import cn.jongwong.authz.Capability;
import cn.jongwong.authz.ResourceOwnership;
import cn.jongwong.authz.locator.DocumentResourceLocator;
import cn.jongwong.common.ConvertUtils;
import cn.jongwong.entity.PencilDocument;
import cn.jongwong.entity.PencilDocumentRecent;
import cn.jongwong.exception.ApiException;
import cn.jongwong.repository.PencilChangeRepository;
import cn.jongwong.repository.PencilDocumentCommentRepository;
import cn.jongwong.repository.PencilDocumentCommentThreadRepository;
import cn.jongwong.repository.PencilDocumentHistoryRepository;
import cn.jongwong.repository.PencilDocumentLibraryRefRepository;
import cn.jongwong.repository.PencilDocumentRecentRepository;
import cn.jongwong.repository.PencilFileRepository;
import cn.jongwong.repository.PencilNodeChangeRepository;
import cn.jongwong.ro.PencilDocumentRequest;
import cn.jongwong.ro.PencilDocumentResponse;
import cn.jongwong.security.SecurityUtils;
import cn.jongwong.service.OssService;
import cn.jongwong.service.PencilDocumentService;
import cn.jongwong.storage.DocumentKeys;
import cn.jongwong.storage.StorageObjectPaths;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
public class PencilDocumentServiceImpl implements PencilDocumentService {

    private static final int MAX_RETRY = 8;
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final byte[] BLANK_SCENE_GRAPH_JSON =
            "{\"format\":\"openpencil-scene-graph\",\"version\":1,\"nodes\":{}}".getBytes(StandardCharsets.UTF_8);

    @Autowired
    private OssService ossService;

    @Autowired
    private PencilFileRepository pencilFileRepository;

    @Autowired
    private PencilDocumentRecentRepository recentRepository;

    @Autowired
    private PencilDocumentHistoryRepository historyRepository;

    @Autowired
    private PencilDocumentCommentThreadRepository commentThreadRepository;

    @Autowired
    private PencilDocumentCommentRepository commentRepository;

    @Autowired
    private PencilDocumentLibraryRefRepository libraryRefRepository;

    @Autowired
    private PencilChangeRepository changeRepository;

    @Autowired
    private PencilNodeChangeRepository nodeChangeRepository;

    @Autowired
    private SecurityUtils securityUtils;

    @Autowired
    private AuthzService authzService;

    @Override
    @Transactional
    public PencilDocumentResponse create(PencilDocumentRequest request) {
        String userId = requireUserId();
        String teamId = blankToNull(request.getTeamId());
        authzService.assertOrgMember(userId, teamId);

        String key = generateUniqueKey();
        String directory = StorageObjectPaths.documentDirectory("op", key);
        String storedPath =
                ossService.upload(directory, StorageObjectPaths.documentJsonFileName(key), BLANK_SCENE_GRAPH_JSON);

        long now = System.currentTimeMillis();
        PencilDocument file = PencilDocument.builder()
                .key(key)
                .name(request.getName())
                .description(request.getDescription())
                .teamId(teamId)
                .projectId(blankToNull(request.getProjectId()))
                .ownerId(userId)
                .allowCopy(true)
                .url(storedPath)
                .isDeleted(0)
                .createdAt(now)
                .version("1.0.0")
                .updatedAt(now)
                .build();

        PencilDocument saved = pencilFileRepository.save(file);
        ResourceOwnership ownership = DocumentResourceLocator.toOwnership(saved);
        authzService.ensureOwnerAdminGrant(ownership, userId);
        log.info("文件创建成功: key={}, owner={}, org={}", saved.getKey(), userId, teamId);
        return toResponse(saved, userId);
    }

    @Override
    @Transactional
    public Boolean updateThumbnail(String key, MultipartFile file) {
        String userId = requireUserId();
        ResourceOwnership ownership = authzService.requireOwnership(DocumentResourceLocator.TYPE, key);
        authzService.requireCapability(ownership, userId, Capability.EDIT);
        PencilDocument doc = pencilFileRepository
                .findById(ownership.resourceId())
                .orElseThrow(() -> ApiException.notFound("Document not found"));

        String documentUrl = doc.getUrl();
        if (documentUrl == null || documentUrl.isBlank()) {
            throw ApiException.badRequest("文档存储路径不存在: " + key);
        }
        String directory = StorageObjectPaths.documentFolder(documentUrl);
        String fileName = StorageObjectPaths.THUMBNAIL_FILE_NAME;
        String existing = doc.getThumbnailUrl();
        try {
            String storedPath = ossService.upload(directory, fileName, file.getBytes());
            if (!storedPath.equals(existing)) {
                doc.setThumbnailUrl(storedPath);
            }
            doc.setUpdatedAt(System.currentTimeMillis());
            pencilFileRepository.save(doc);
            return true;
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    @Transactional
    public PencilDocumentResponse getByKey(String key) {
        String userId = requireUserId();
        ResourceOwnership ownership = authzService.requireOwnership(DocumentResourceLocator.TYPE, key);
        authzService.requireCapability(ownership, userId, Capability.VIEW);
        PencilDocument file = pencilFileRepository
                .findById(ownership.resourceId())
                .orElseThrow(() -> ApiException.notFound("Document not found"));
        touchRecent(userId, file);
        PencilDocumentResponse response = toResponse(file, userId);
        response.setLastOpenedAt(Instant.ofEpochMilli(System.currentTimeMillis()));
        return response;
    }

    @Override
    public List<PencilDocumentResponse> getAllFiles(String teamId, boolean personalOnly, boolean recentOnly) {
        String userId = requireUserId();
        if (recentOnly) {
            return getRecentFiles(userId);
        }
        String orgFilter = blankToNull(teamId);
        boolean systemAdmin = authzService.isSystemFullAccess(userId, DocumentResourceLocator.TYPE);
        List<PencilDocument> all = pencilFileRepository.findByIsDeletedOrderByUpdatedAtDesc(0);
        List<PencilDocumentResponse> result = new ArrayList<>();
        for (PencilDocument doc : all) {
            boolean personal = !StringUtils.hasText(doc.getTeamId());
            if (personalOnly && !personal) {
                continue;
            }
            if (orgFilter != null) {
                if (personal) {
                    continue;
                }
                if (!orgFilter.equals(doc.getTeamId())) {
                    continue;
                }
            }
            ResourceOwnership ownership = DocumentResourceLocator.toOwnership(doc);
            if (systemAdmin || authzService.canAccess(ownership, userId)) {
                result.add(toResponse(doc, userId));
            }
        }
        return result;
    }

    private List<PencilDocumentResponse> getRecentFiles(String userId) {
        List<PencilDocumentRecent> recents = recentRepository.findByUserIdOrderByOpenedAtDesc(userId);
        if (recents.isEmpty()) {
            return List.of();
        }
        boolean systemAdmin = authzService.isSystemFullAccess(userId, DocumentResourceLocator.TYPE);
        List<PencilDocumentResponse> result = new ArrayList<>();
        int limit = 40;
        for (PencilDocumentRecent recent : recents) {
            if (result.size() >= limit) {
                break;
            }
            PencilDocument doc = pencilFileRepository.findById(recent.getDocumentId()).orElse(null);
            if (doc == null || (doc.getIsDeleted() != null && doc.getIsDeleted() != 0)) {
                continue;
            }
            ResourceOwnership ownership = DocumentResourceLocator.toOwnership(doc);
            if (!(systemAdmin || authzService.canAccess(ownership, userId))) {
                continue;
            }
            PencilDocumentResponse response = toResponse(doc, userId);
            Long openedAt = recent.getOpenedAt();
            if (openedAt != null) {
                response.setLastOpenedAt(Instant.ofEpochMilli(openedAt));
            }
            result.add(response);
        }
        result.sort((a, b) -> {
            long ao = a.getLastOpenedAt() != null ? a.getLastOpenedAt().toEpochMilli() : 0L;
            long bo = b.getLastOpenedAt() != null ? b.getLastOpenedAt().toEpochMilli() : 0L;
            return Long.compare(bo, ao);
        });
        return result;
    }

    private void touchRecent(String userId, PencilDocument file) {
        long now = System.currentTimeMillis();
        PencilDocumentRecent recent = recentRepository
                .findByUserIdAndDocumentId(userId, file.getId())
                .orElseGet(() -> PencilDocumentRecent.builder()
                        .userId(userId)
                        .documentId(file.getId())
                        .documentKey(file.getKey())
                        .createdAt(now)
                        .build());
        recent.setDocumentKey(file.getKey());
        recent.setOpenedAt(now);
        recent.setUpdatedAt(now);
        recentRepository.save(recent);
    }

    @Override
    @Transactional
    public PencilDocumentResponse update(String key, PencilDocumentRequest request) {
        String userId = requireUserId();
        ResourceOwnership ownership = authzService.requireOwnership(DocumentResourceLocator.TYPE, key);
        authzService.requireCapability(ownership, userId, Capability.EDIT);
        PencilDocument existing = pencilFileRepository
                .findById(ownership.resourceId())
                .orElseThrow(() -> ApiException.notFound("Document not found"));

        if (request.getName() != null) {
            existing.setName(request.getName());
        }
        if (request.getDescription() != null) {
            existing.setDescription(request.getDescription());
        }
        if (request.getTeamId() != null) {
            authzService.requireCapability(ownership, userId, Capability.MANAGE_ACCESS);
            String nextTeam = blankToNull(request.getTeamId());
            authzService.assertOrgMember(userId, nextTeam);
            existing.setTeamId(nextTeam);
        }
        if (request.getProjectId() != null) {
            existing.setProjectId(blankToNull(request.getProjectId()));
        }
        if (request.getVersion() != null) {
            existing.setVersion(request.getVersion());
        }

        existing.setUpdatedAt(System.currentTimeMillis());
        PencilDocument updated = pencilFileRepository.save(existing);
        return toResponse(updated, userId);
    }

    @Override
    @Transactional
    public void delete(String key) {
        String userId = requireUserId();
        ResourceOwnership ownership = authzService.requireOwnership(DocumentResourceLocator.TYPE, key);
        authzService.requireCapability(ownership, userId, Capability.DELETE);
        PencilDocument existing = pencilFileRepository
                .findById(ownership.resourceId())
                .orElseThrow(() -> ApiException.notFound("Document not found"));

        commentRepository.deleteByDocumentId(existing.getId());
        commentThreadRepository.deleteByDocumentId(existing.getId());
        historyRepository.deleteByDocumentId(existing.getId());
        libraryRefRepository.deleteByDocumentKey(existing.getKey());
        recentRepository.deleteByDocumentId(existing.getId());
        changeRepository.deleteByFileId(existing.getId());
        nodeChangeRepository.deleteByFileId(existing.getId());
        authzService.deleteAllForResource(DocumentResourceLocator.TYPE, existing.getId());

        String folder = StorageObjectPaths.documentFolder(existing.getUrl());
        if (folder != null && !folder.isBlank()) {
            ossService.deletePrefix(folder);
        }

        pencilFileRepository.delete(existing);
        log.info("文件已删除: key={}", key);
    }

    private PencilDocumentResponse toResponse(PencilDocument saved, String userId) {
        PencilDocumentResponse response = ConvertUtils.convert(saved, PencilDocumentResponse.class);
        ResourceOwnership ownership = DocumentResourceLocator.toOwnership(saved);
        response.setPersonal(ownership.isPersonal());
        AccessRole role = authzService.resolveRole(ownership, userId).orElse(null);
        if (role != null) {
            response.setMyRole(role.wire());
            response.setCapabilities(authzService.capabilityWires(ownership, userId));
        }
        return response;
    }

    private String requireUserId() {
        String userId = securityUtils.getCurrentUserId();
        if (!StringUtils.hasText(userId)) {
            throw ApiException.unauthorized("Authentication required");
        }
        return userId;
    }

    private static String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private String generateUniqueKey() {
        for (int i = 0; i < MAX_RETRY; i++) {
            String key = DocumentKeys.random(RANDOM);
            if (!pencilFileRepository.existsByKeyAndIsDeleted(key, 0)) {
                return key;
            }
            log.warn("KEY 冲突: {}, 重试第 {} 次", key, i + 1);
        }
        throw new RuntimeException("Failed to generate a unique document key");
    }
}
