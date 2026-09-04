package cn.jongwong.service;

import cn.jongwong.ro.CreateCommentReplyRequest;
import cn.jongwong.ro.CreateCommentThreadRequest;
import cn.jongwong.ro.PencilDocumentCommentListResponse;
import cn.jongwong.ro.PencilDocumentCommentResponse;
import cn.jongwong.ro.PencilDocumentCommentThreadResponse;
import cn.jongwong.ro.ResolveCommentThreadRequest;
import cn.jongwong.ro.UpdateCommentRequest;

public interface PencilDocumentCommentService {

    PencilDocumentCommentListResponse list(String documentKey, String pageId, Boolean resolved);

    PencilDocumentCommentThreadResponse createThread(String documentKey, CreateCommentThreadRequest request);

    PencilDocumentCommentResponse reply(String documentKey, String threadId, CreateCommentReplyRequest request);

    PencilDocumentCommentResponse updateComment(
            String documentKey,
            String threadId,
            String commentId,
            UpdateCommentRequest request
    );

    void deleteComment(String documentKey, String threadId, String commentId);

    PencilDocumentCommentThreadResponse resolve(
            String documentKey,
            String threadId,
            ResolveCommentThreadRequest request
    );
}
