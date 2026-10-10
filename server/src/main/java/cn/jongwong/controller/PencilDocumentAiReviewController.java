package cn.jongwong.controller;

import cn.jongwong.dto.ApiResponse;
import cn.jongwong.ro.CreateAiReviewRequest;
import cn.jongwong.ro.PencilDocumentAiReviewListResponse;
import cn.jongwong.ro.PencilDocumentAiReviewResponse;
import cn.jongwong.ro.UpdateAiReviewRequest;
import cn.jongwong.service.PencilDocumentAiReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/document/{key}/ai-reviews")
@RequiredArgsConstructor
public class PencilDocumentAiReviewController {

    private final PencilDocumentAiReviewService reviewService;

    @GetMapping
    public ApiResponse<PencilDocumentAiReviewListResponse> list(@PathVariable String key) {
        return ApiResponse.ok(reviewService.list(key));
    }

    @GetMapping("/{reviewId}")
    public ApiResponse<PencilDocumentAiReviewResponse> get(
            @PathVariable String key,
            @PathVariable String reviewId
    ) {
        return ApiResponse.ok(reviewService.get(key, reviewId));
    }

    @PostMapping
    public ApiResponse<PencilDocumentAiReviewResponse> create(
            @PathVariable String key,
            @RequestBody CreateAiReviewRequest request
    ) {
        return ApiResponse.ok(reviewService.create(key, request));
    }

    @PutMapping("/{reviewId}")
    public ApiResponse<PencilDocumentAiReviewResponse> update(
            @PathVariable String key,
            @PathVariable String reviewId,
            @RequestBody UpdateAiReviewRequest request
    ) {
        return ApiResponse.ok(reviewService.update(key, reviewId, request));
    }

    @DeleteMapping("/{reviewId}")
    public ApiResponse<Void> delete(@PathVariable String key, @PathVariable String reviewId) {
        reviewService.delete(key, reviewId);
        return ApiResponse.ok();
    }
}
