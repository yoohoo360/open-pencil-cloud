package main.java.cn.jongwong.service.impl;

import cn.jongwong.domain.entity.User;
import cn.jongwong.domain.repository.UserRepository;
import cn.jongwong.entity.PencilDocument;
import cn.jongwong.entity.PencilDocumentComment;
import cn.jongwong.entity.PencilDocumentCommentThread;
import cn.jongwong.exception.ApiException;
import cn.jongwong.repository.PencilDocumentCommentRepository;
import cn.jongwong.repository.PencilDocumentCommentThreadRepository;
import cn.jongwong.repository.PencilFileRepository;
import cn.jongwong.ro.CreateCommentReplyRequest;
import cn.jongwong.ro.CreateCommentThreadRequest;
import cn.jongwong.ro.PencilDocumentCommentListResponse;
import cn.jongwong.ro.PencilDocumentCommentResponse;
import cn.jongwong.ro.PencilDocumentCommentThreadResponse;
import cn.jongwong.ro.ResolveCommentThreadRequest;
import cn.jongwong.ro.UpdateCommentRequest;
import cn.jongwong.security.SecurityUtils;
import cn.jongwong.service.PencilDocumentCommentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class PencilDocumentCommentServiceImpl implements PencilDocumentCommentService {

    static final int MAX_BODY = 4000;

    private final PencilFileRepository pencilFileRepository;
    private final PencilDocumentCommentThreadRepository threadRepository;
    private final PencilDocumentCommentRepository commentRepository;
    private final UserRepository userRepository;
    private final SecurityUtils securityUtils;

    @Override
    @Transactional(readOnly = true)
    public PencilDocumentCommentListResponse list(String documentKey, String pageId, Boolean resolved) {
        PencilDocument document = requireDocument(documentKey);
        List<PencilDocumentCommentThread> threads = loadThreads(document.getId(), pageId, resolved);
        Map<String, List<PencilDocumentComment>> commentsByThread = loadComments(threads);
        Map<String, User> users = lookupUsers(threads, commentsByThread);
        return PencilDocumentCommentListResponse.builder()
                .threads(threads.stream()
                        .map(thread -> toThreadResponse(
                                document,
                                thread,
                                commentsByThread.getOrDefault(thread.getId(), List.of()),
                                users
                        ))
                        .toList())
                .build();
    }

    @Override
    @Transactional
    public PencilDocumentCommentThreadResponse createThread(String documentKey, CreateCommentThreadRequest request) {
        PencilDocument document = requireDocument(documentKey);
        User user = requireUser();
        if (request == null) {
            throw ApiException.badRequest("Comment is required");
        }
        String pageId = trimRequired(request.getPageId(), "page_id");
        if (request.getX() == null || request.getY() == null) {
            throw ApiException.badRequest("x and y are required");
        }
        String body = requireBody(request.getBody());
        long now = System.currentTimeMillis();
        String threadId = UUID.randomUUID().toString();
        PencilDocumentCommentThread thread = threadRepository.save(PencilDocumentCommentThread.builder()
                .id(threadId)
                .documentId(document.getId())
                .documentKey(document.getKey())
                .pageId(pageId)
                .nodeId(trimToNull(request.getNodeId()))
                .x(request.getX())
                .y(request.getY())
                .resolved(0)
                .createdBy(user.getId())
                .createdAt(now)
                .updatedAt(now)
                .isDeleted(0)
                .build());
        PencilDocumentComment comment = commentRepository.save(PencilDocumentComment.builder()
                .id(UUID.randomUUID().toString())
                .threadId(thread.getId())
                .documentId(document.getId())
                .documentKey(document.getKey())
                .body(body)
                .createdBy(user.getId())
                .createdAt(now)
                .updatedAt(now)
                .isDeleted(0)
                .build());
        return toThreadResponse(document, thread, List.of(comment), Map.of(user.getId(), user));
    }

    @Override
    @Transactional
    public PencilDocumentCommentResponse reply(
            String documentKey,
            String threadId,
            CreateCommentReplyRequest request
    ) {
        PencilDocument document = requireDocument(documentKey);
        User user = requireUser();
        PencilDocumentCommentThread thread = requireThread(document.getId(), threadId);
        String body = requireBody(request == null ? null : request.getBody());
        long now = System.currentTimeMillis();
        PencilDocumentComment comment = commentRepository.save(PencilDocumentComment.builder()
                .id(UUID.randomUUID().toString())
                .threadId(thread.getId())
                .documentId(document.getId())
                .documentKey(document.getKey())
                .body(body)
                .createdBy(user.getId())
                .createdAt(now)
                .updatedAt(now)
                .isDeleted(0)
                .build());
        thread.setUpdatedAt(now);
        threadRepository.save(thread);
        return toCommentResponse(document, comment, Map.of(user.getId(), user));
    }

    @Override
    @Transactional
    public PencilDocumentCommentResponse updateComment(
            String documentKey,
            String threadId,
            String commentId,
            UpdateCommentRequest request
    ) {
        PencilDocument document = requireDocument(documentKey);
        User user = requireUser();
        requireThread(document.getId(), threadId);
        PencilDocumentComment comment = requireComment(document.getId(), threadId, commentId);
        if (!user.getId().equals(comment.getCreatedBy())) {
            throw ApiException.forbidden("Only the author can edit this comment");
        }
        comment.setBody(requireBody(request == null ? null : request.getBody()));
        comment.setUpdatedAt(System.currentTimeMillis());
        commentRepository.save(comment);
        return toCommentResponse(document, comment, Map.of(user.getId(), user));
    }

    @Override
    @Transactional
    public void deleteComment(String documentKey, String threadId, String commentId) {
        PencilDocument document = requireDocument(documentKey);
        User user = requireUser();
        PencilDocumentCommentThread thread = requireThread(document.getId(), threadId);
        PencilDocumentComment comment = requireComment(document.getId(), threadId, commentId);
        if (!user.getId().equals(comment.getCreatedBy())) {
            throw ApiException.forbidden("Only the author can delete this comment");
        }
        long now = System.currentTimeMillis();
        comment.setIsDeleted(1);
        comment.setUpdatedAt(now);
        commentRepository.save(comment);
        if (commentRepository.countByThreadIdAndIsDeleted(thread.getId(), 0) == 0) {
            thread.setIsDeleted(1);
            thread.setUpdatedAt(now);
            threadRepository.save(thread);
        } else {
            thread.setUpdatedAt(now);
            threadRepository.save(thread);
        }
    }

    @Override
    @Transactional
    public PencilDocumentCommentThreadResponse resolve(
            String documentKey,
            String threadId,
            ResolveCommentThreadRequest request
    ) {
        PencilDocument document = requireDocument(documentKey);
        User user = requireUser();
        if (request == null || request.getResolved() == null) {
            throw ApiException.badRequest("resolved is required");
        }
        PencilDocumentCommentThread thread = requireThread(document.getId(), threadId);
        long now = System.currentTimeMillis();
        if (Boolean.TRUE.equals(request.getResolved())) {
            thread.setResolved(1);
            thread.setResolvedBy(user.getId());
            thread.setResolvedAt(now);
        } else {
            thread.setResolved(0);
            thread.setResolvedBy(null);
            thread.setResolvedAt(null);
        }
        thread.setUpdatedAt(now);
        threadRepository.save(thread);
        List<PencilDocumentComment> comments =
                commentRepository.findByThreadIdAndIsDeletedOrderByCreatedAtAsc(thread.getId(), 0);
        Map<String, User> users = lookupUsers(List.of(thread), Map.of(thread.getId(), comments));
        users.put(user.getId(), user);
        return toThreadResponse(document, thread, comments, users);
    }

    private List<PencilDocumentCommentThread> loadThreads(String documentId, String pageId, Boolean resolved) {
        boolean hasPage = pageId != null && !pageId.isBlank();
        if (resolved == null) {
            if (hasPage) {
                return threadRepository.findByDocumentIdAndPageIdAndIsDeletedOrderByUpdatedAtDesc(
                        documentId, pageId.trim(), 0);
            }
            return threadRepository.findByDocumentIdAndIsDeletedOrderByUpdatedAtDesc(documentId, 0);
        }
        int flag = Boolean.TRUE.equals(resolved) ? 1 : 0;
        if (hasPage) {
            return threadRepository.findByDocumentIdAndPageIdAndIsDeletedAndResolvedOrderByUpdatedAtDesc(
                    documentId, pageId.trim(), 0, flag);
        }
        return threadRepository.findByDocumentIdAndIsDeletedAndResolvedOrderByUpdatedAtDesc(documentId, 0, flag);
    }

    private Map<String, List<PencilDocumentComment>> loadComments(List<PencilDocumentCommentThread> threads) {
        if (threads.isEmpty()) {
            return Map.of();
        }
        List<String> ids = threads.stream().map(PencilDocumentCommentThread::getId).toList();
        Map<String, List<PencilDocumentComment>> grouped = new HashMap<>();
        for (PencilDocumentComment comment : commentRepository.findByThreadIdInAndIsDeletedOrderByCreatedAtAsc(ids, 0)) {
            grouped.computeIfAbsent(comment.getThreadId(), key -> new ArrayList<>()).add(comment);
        }
        return grouped;
    }

    private Map<String, User> lookupUsers(
            List<PencilDocumentCommentThread> threads,
            Map<String, List<PencilDocumentComment>> commentsByThread
    ) {
        Set<String> ids = new HashSet<>();
        for (PencilDocumentCommentThread thread : threads) {
            if (thread.getCreatedBy() != null) {
                ids.add(thread.getCreatedBy());
            }
            if (thread.getResolvedBy() != null) {
                ids.add(thread.getResolvedBy());
            }
        }
        for (List<PencilDocumentComment> comments : commentsByThread.values()) {
            for (PencilDocumentComment comment : comments) {
                if (comment.getCreatedBy() != null) {
                    ids.add(comment.getCreatedBy());
                }
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

    private PencilDocument requireDocument(String documentKey) {
        return pencilFileRepository.findByKeyAndIsDeleted(documentKey, 0)
                .orElseThrow(() -> ApiException.notFound("Document not found: " + documentKey));
    }

    private PencilDocumentCommentThread requireThread(String documentId, String threadId) {
        return threadRepository.findByIdAndDocumentIdAndIsDeleted(threadId, documentId, 0)
                .orElseThrow(() -> ApiException.notFound("Comment thread not found"));
    }

    private PencilDocumentComment requireComment(String documentId, String threadId, String commentId) {
        PencilDocumentComment comment = commentRepository.findByIdAndDocumentIdAndIsDeleted(commentId, documentId, 0)
                .orElseThrow(() -> ApiException.notFound("Comment not found"));
        if (!threadId.equals(comment.getThreadId())) {
            throw ApiException.notFound("Comment not found");
        }
        return comment;
    }

    private User requireUser() {
        User user = securityUtils.getCurrentUser();
        if (user == null || user.getId() == null) {
            throw ApiException.unauthorized("Sign in to comment");
        }
        return user;
    }

    private PencilDocumentCommentThreadResponse toThreadResponse(
            PencilDocument document,
            PencilDocumentCommentThread thread,
            List<PencilDocumentComment> comments,
            Map<String, User> users
    ) {
        User author = users.get(thread.getCreatedBy());
        User resolver = thread.getResolvedBy() == null ? null : users.get(thread.getResolvedBy());
        return PencilDocumentCommentThreadResponse.builder()
                .id(thread.getId())
                .documentId(thread.getDocumentId() != null ? thread.getDocumentId() : document.getId())
                .documentKey(thread.getDocumentKey() != null ? thread.getDocumentKey() : document.getKey())
                .pageId(thread.getPageId())
                .nodeId(thread.getNodeId())
                .x(thread.getX())
                .y(thread.getY())
                .resolved(thread.getResolved() != null && thread.getResolved() == 1)
                .resolvedBy(thread.getResolvedBy())
                .resolvedByName(resolver == null ? null : resolver.getName())
                .resolvedAt(thread.getResolvedAt())
                .createdBy(thread.getCreatedBy())
                .createdByName(author == null ? null : author.getName())
                .createdByAvatar(author == null ? null : author.getAvatar())
                .createdAt(thread.getCreatedAt())
                .updatedAt(thread.getUpdatedAt())
                .comments(comments.stream().map(comment -> toCommentResponse(document, comment, users)).toList())
                .build();
    }

    private PencilDocumentCommentResponse toCommentResponse(
            PencilDocument document,
            PencilDocumentComment comment,
            Map<String, User> users
    ) {
        User author = users.get(comment.getCreatedBy());
        return PencilDocumentCommentResponse.builder()
                .id(comment.getId())
                .threadId(comment.getThreadId())
                .documentId(comment.getDocumentId() != null ? comment.getDocumentId() : document.getId())
                .documentKey(comment.getDocumentKey() != null ? comment.getDocumentKey() : document.getKey())
                .body(comment.getBody())
                .createdBy(comment.getCreatedBy())
                .createdByName(author == null ? null : author.getName())
                .createdByAvatar(author == null ? null : author.getAvatar())
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .build();
    }

    static String requireBody(String body) {
        String trimmed = trimRequired(body, "body");
        if (trimmed.length() > MAX_BODY) {
            return trimmed.substring(0, MAX_BODY);
        }
        return trimmed;
    }

    private static String trimRequired(String value, String field) {
        if (value == null || value.isBlank()) {
            throw ApiException.badRequest(field + " is required");
        }
        return value.trim();
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
