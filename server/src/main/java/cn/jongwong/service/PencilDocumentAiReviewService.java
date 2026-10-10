package cn.jongwong.service;

import cn.jongwong.ro.CreateAiReviewRequest;
import cn.jongwong.ro.PencilDocumentAiReviewListResponse;
import cn.jongwong.ro.PencilDocumentAiReviewResponse;
import cn.jongwong.ro.UpdateAiReviewRequest;

public interface PencilDocumentAiReviewService {

    PencilDocumentAiReviewListResponse list(String documentKey);

    PencilDocumentAiReviewResponse get(String documentKey, String reviewId);

    PencilDocumentAiReviewResponse create(String documentKey, CreateAiReviewRequest request);

    PencilDocumentAiReviewResponse update(
            String documentKey,
            String reviewId,
            UpdateAiReviewRequest request
    );

    void delete(String documentKey, String reviewId);
}
