package cn.jongwong.service.impl;

import cn.jongwong.authz.AuthzService;
import cn.jongwong.authz.Capability;
import cn.jongwong.authz.ResourceOwnership;
import cn.jongwong.authz.locator.DocumentResourceLocator;
import cn.jongwong.domain.entity.User;
import cn.jongwong.domain.repository.UserRepository;
import cn.jongwong.entity.PencilDocument;
import cn.jongwong.entity.PencilDocumentHistory;
import cn.jongwong.entity.PencilDocumentAiReview;
import cn.jongwong.exception.ApiException;
import cn.jongwong.repository.PencilDocumentHistoryRepository;
import cn.jongwong.repository.PencilDocumentAiReviewRepository;
import cn.jongwong.repository.PencilFileRepository;
import cn.jongwong.ro.CreateAiReviewRequest;
import cn.jongwong.ro.PencilDocumentAiReviewListResponse;
import cn.jongwong.ro.PencilDocumentAiReviewResponse;
import cn.jongwong.ro.UpdateAiReviewRequest;
import cn.jongwong.security.SecurityUtils;
import cn.jongwong.service.PencilDocumentAiReviewService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class PencilDocumentAiReviewServiceImpl implements PencilDocumentAiReviewService {

    static final int MAX_PAYLOAD_CHARS = 2_000_000;
    static final int MAX_TITLE = 500;

    private final PencilFileRepository pencilFileRepository;
    private final PencilDocumentAiReviewRepository reviewRepository;
    private final PencilDocumentHistoryRepository historyRepository;
    private final UserRepository userRepository;
    private final SecurityUtils securityUtils;
    private final AuthzService authzService;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional(readOnly = true)
    public PencilDocumentAiReviewListResponse list(String documentKey) {
        PencilDocument document = requireDocument(documentKey, Capability.VIEW);
        List<PencilDocumentAiReview> reviews =
                reviewRepository.findByDocumentIdAndIsDeletedOrderByCreatedAtDesc(document.getId(), 0);
        Map<String, PencilDocumentHistory> histories = loadHistories(document.getId(), reviews);
        Map<String, User> users = lookupUsers(reviews);
        return PencilDocumentAiReviewListResponse.builder()
                .reviews(reviews.stream()
                        .map(review -> toResponse(document, review, histories.get(review.getHistoryId()), users, false))
                        .toList())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public PencilDocumentAiReviewResponse get(String documentKey, String reviewId) {
        PencilDocument document = requireDocument(documentKey, Capability.VIEW);
        PencilDocumentAiReview review = requireReview(document.getId(), reviewId);
        PencilDocumentHistory history = historyRepository
                .findByIdAndDocumentIdAndIsDeleted(review.getHistoryId(), document.getId(), 0)
                .orElse(null);
        Map<String, User> users = lookupUsers(List.of(review));
        return toResponse(document, review, history, users, true);
    }

    @Override
    @Transactional
    public PencilDocumentAiReviewResponse create(String documentKey, CreateAiReviewRequest request) {
        PencilDocument document = requireDocument(documentKey, Capability.EDIT);
        User user = requireUser();
        if (request == null) {
            throw ApiException.badRequest("Review is required");
        }
        String historyId = trimRequired(request.getHistoryId(), "history_id");
        PencilDocumentHistory history = requireHistory(document.getId(), historyId);
        String payloadText = requirePayload(request.getPayload());
        Counts counts = countPayload(payloadText);
        String status = normalizeStatus(request.getStatus());
        String title = trimTitle(request.getTitle());
        long now = System.currentTimeMillis();
        PencilDocumentAiReview review = reviewRepository.save(PencilDocumentAiReview.builder()
                .id(UUID.randomUUID().toString())
                .documentId(document.getId())
                .documentKey(document.getKey())
                .title(title)
                .status(status)
                .historyId(history.getId())
                .payload(payloadText)
                .markerCount(counts.markers)
                .commentCount(counts.comments)
                .createdBy(user.getId())
                .createdAt(now)
                .updatedBy(user.getId())
                .updatedAt(now)
                .isDeleted(0)
                .build());
        return toResponse(document, review, history, Map.of(user.getId(), user), true);
    }

    @Override
    @Transactional
    public PencilDocumentAiReviewResponse update(
            String documentKey,
            String reviewId,
            UpdateAiReviewRequest request
    ) {
        PencilDocument document = requireDocument(documentKey, Capability.EDIT);
        User user = requireUser();
        if (request == null) {
            throw ApiException.badRequest("Review update is required");
        }
        PencilDocumentAiReview review = requireReview(document.getId(), reviewId);
        if (request.getPayload() != null) {
            String payloadText = requirePayload(request.getPayload());
            Counts counts = countPayload(payloadText);
            review.setPayload(payloadText);
            review.setMarkerCount(counts.markers);
            review.setCommentCount(counts.comments);
        }
        if (request.getTitle() != null) {
            review.setTitle(trimTitle(request.getTitle()));
        }
        if (request.getStatus() != null) {
            review.setStatus(normalizeStatus(request.getStatus()));
        }
        PencilDocumentHistory history;
        if (StringUtils.hasText(request.getHistoryId())) {
            history = requireHistory(document.getId(), request.getHistoryId().trim());
            review.setHistoryId(history.getId());
        } else {
            history = historyRepository
                    .findByIdAndDocumentIdAndIsDeleted(review.getHistoryId(), document.getId(), 0)
                    .orElse(null);
        }
        long now = System.currentTimeMillis();
        review.setUpdatedBy(user.getId());
        review.setUpdatedAt(now);
        reviewRepository.save(review);
        Map<String, User> users = lookupUsers(List.of(review));
        users.put(user.getId(), user);
        return toResponse(document, review, history, users, true);
    }

    @Override
    @Transactional
    public void delete(String documentKey, String reviewId) {
        PencilDocument document = requireDocument(documentKey, Capability.EDIT);
        User user = requireUser();
        PencilDocumentAiReview review = requireReview(document.getId(), reviewId);
        long now = System.currentTimeMillis();
        review.setIsDeleted(1);
        review.setUpdatedBy(user.getId());
        review.setUpdatedAt(now);
        reviewRepository.save(review);
    }

    private Map<String, PencilDocumentHistory> loadHistories(
            String documentId,
            List<PencilDocumentAiReview> reviews
    ) {
        Map<String, PencilDocumentHistory> histories = new HashMap<>();
        for (PencilDocumentAiReview review : reviews) {
            if (review.getHistoryId() == null || histories.containsKey(review.getHistoryId())) {
                continue;
            }
            historyRepository.findByIdAndDocumentIdAndIsDeleted(review.getHistoryId(), documentId, 0)
                    .ifPresent(history -> histories.put(history.getId(), history));
        }
        return histories;
    }

    private Map<String, User> lookupUsers(List<PencilDocumentAiReview> reviews) {
        Set<String> ids = new HashSet<>();
        for (PencilDocumentAiReview review : reviews) {
            if (review.getCreatedBy() != null) {
                ids.add(review.getCreatedBy());
            }
            if (review.getUpdatedBy() != null) {
                ids.add(review.getUpdatedBy());
            }
        }
        if (ids.isEmpty()) {
            return Map.of();
        }
        Map<String, User> users = new HashMap<>();
        for (User user : userRepository.findAllById(ids)) {
            users.put(user.getId(), user);
        }
        return users;
    }

    private PencilDocument requireDocument(String documentKey, Capability capability) {
        ResourceOwnership ownership =
                authzService.requireOwnership(DocumentResourceLocator.TYPE, documentKey);
        String userId = securityUtils.getCurrentUserId();
        if (!StringUtils.hasText(userId)) {
            throw ApiException.unauthorized("Authentication required");
        }
        authzService.requireCapability(ownership, userId, capability);
        return pencilFileRepository
                .findById(ownership.resourceId())
                .orElseThrow(() -> ApiException.notFound("Document not found: " + documentKey));
    }

    private PencilDocumentAiReview requireReview(String documentId, String reviewId) {
        return reviewRepository.findByIdAndDocumentIdAndIsDeleted(reviewId, documentId, 0)
                .orElseThrow(() -> ApiException.notFound("AI review not found"));
    }

    private PencilDocumentHistory requireHistory(String documentId, String historyId) {
        return historyRepository.findByIdAndDocumentIdAndIsDeleted(historyId, documentId, 0)
                .orElseThrow(() -> ApiException.badRequest("history_id must belong to this document"));
    }

    private User requireUser() {
        User user = securityUtils.getCurrentUser();
        if (user == null || user.getId() == null) {
            throw ApiException.unauthorized("Sign in to save AI reviews");
        }
        return user;
    }

    private PencilDocumentAiReviewResponse toResponse(
            PencilDocument document,
            PencilDocumentAiReview review,
            PencilDocumentHistory history,
            Map<String, User> users,
            boolean includePayload
    ) {
        User author = users.get(review.getCreatedBy());
        User updater = review.getUpdatedBy() == null ? null : users.get(review.getUpdatedBy());
        PencilDocumentAiReviewResponse.PencilDocumentAiReviewResponseBuilder builder =
                PencilDocumentAiReviewResponse.builder()
                        .id(review.getId())
                        .documentId(review.getDocumentId() != null ? review.getDocumentId() : document.getId())
                        .documentKey(review.getDocumentKey() != null ? review.getDocumentKey() : document.getKey())
                        .title(review.getTitle())
                        .status(review.getStatus())
                        .historyId(review.getHistoryId())
                        .historyTitle(history == null ? null : history.getTitle())
                        .historyCreatedAt(history == null ? null : history.getCreatedAt())
                        .markerCount(review.getMarkerCount())
                        .commentCount(review.getCommentCount())
                        .createdBy(review.getCreatedBy())
                        .createdByName(author == null ? null : author.getName())
                        .createdByAvatar(author == null ? null : author.getAvatar())
                        .createdAt(review.getCreatedAt())
                        .updatedBy(review.getUpdatedBy())
                        .updatedByName(updater == null ? null : updater.getName())
                        .updatedAt(review.getUpdatedAt());
        if (includePayload) {
            builder.payload(parsePayload(review.getPayload()));
        }
        return builder.build();
    }

    private String requirePayload(JsonNode payload) {
        if (payload == null || payload.isNull()) {
            throw ApiException.badRequest("payload is required");
        }
        if (!payload.isObject()) {
            throw ApiException.badRequest("payload must be a JSON object");
        }
        String text;
        try {
            text = objectMapper.writeValueAsString(payload);
        } catch (Exception error) {
            throw ApiException.badRequest("payload is invalid JSON");
        }
        if (text.length() > MAX_PAYLOAD_CHARS) {
            throw ApiException.badRequest("payload is too large");
        }
        return text;
    }

    private JsonNode parsePayload(String payload) {
        try {
            return objectMapper.readTree(payload);
        } catch (Exception error) {
            log.warn("Stored AI review payload is not valid JSON");
            return objectMapper.createObjectNode();
        }
    }

    private Counts countPayload(String payloadText) {
        try {
            JsonNode root = objectMapper.readTree(payloadText);
            JsonNode markers = root.get("markers");
            if (markers == null || !markers.isArray()) {
                return new Counts(0, 0);
            }
            int markerCount = markers.size();
            int commentCount = 0;
            for (JsonNode marker : markers) {
                JsonNode comments = marker.get("comments");
                if (comments != null && comments.isArray()) {
                    commentCount += comments.size();
                }
            }
            return new Counts(markerCount, commentCount);
        } catch (Exception error) {
            return new Counts(0, 0);
        }
    }

    private static String normalizeStatus(String status) {
        if (status == null || status.isBlank()) {
            return PencilDocumentAiReview.STATUS_COMPLETED;
        }
        String trimmed = status.trim().toLowerCase();
        if (PencilDocumentAiReview.STATUS_DRAFT.equals(trimmed)
                || PencilDocumentAiReview.STATUS_COMPLETED.equals(trimmed)) {
            return trimmed;
        }
        throw ApiException.badRequest("status must be draft or completed");
    }

    private static String trimTitle(String title) {
        if (title == null) {
            return null;
        }
        String trimmed = title.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        return trimmed.length() > MAX_TITLE ? trimmed.substring(0, MAX_TITLE) : trimmed;
    }

    private static String trimRequired(String value, String field) {
        if (value == null || value.isBlank()) {
            throw ApiException.badRequest(field + " is required");
        }
        return value.trim();
    }

    private record Counts(int markers, int comments) {
    }
}
