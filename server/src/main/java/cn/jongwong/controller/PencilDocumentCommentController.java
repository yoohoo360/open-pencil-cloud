package main.java.cn.jongwong.controller;

import cn.jongwong.dto.ApiResponse;
import cn.jongwong.ro.CreateCommentReplyRequest;
import cn.jongwong.ro.CreateCommentThreadRequest;
import cn.jongwong.ro.PencilDocumentCommentListResponse;
import cn.jongwong.ro.PencilDocumentCommentResponse;
import cn.jongwong.ro.PencilDocumentCommentThreadResponse;
import cn.jongwong.ro.ResolveCommentThreadRequest;
import cn.jongwong.ro.UpdateCommentRequest;
import cn.jongwong.service.PencilDocumentCommentService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/document/{key}/comments")
@RequiredArgsConstructor
public class PencilDocumentCommentController {

    private final PencilDocumentCommentService commentService;

    @GetMapping
    public ApiResponse<PencilDocumentCommentListResponse> list(
            @PathVariable String key,
            @RequestParam(value = "page_id", required = false) String pageId,
            @RequestParam(value = "resolved", required = false) Boolean resolved
    ) {
        return ApiResponse.ok(commentService.list(key, pageId, resolved));
    }

    @PostMapping
    public ApiResponse<PencilDocumentCommentThreadResponse> create(
            @PathVariable String key,
            @RequestBody CreateCommentThreadRequest request
    ) {
        return ApiResponse.ok(commentService.createThread(key, request));
    }

    @PostMapping("/{threadId}/replies")
    public ApiResponse<PencilDocumentCommentResponse> reply(
            @PathVariable String key,
            @PathVariable String threadId,
            @RequestBody CreateCommentReplyRequest request
    ) {
        return ApiResponse.ok(commentService.reply(key, threadId, request));
    }

    @PatchMapping("/{threadId}")
    public ApiResponse<PencilDocumentCommentThreadResponse> resolve(
            @PathVariable String key,
            @PathVariable String threadId,
            @RequestBody ResolveCommentThreadRequest request
    ) {
        return ApiResponse.ok(commentService.resolve(key, threadId, request));
    }

    @PatchMapping("/{threadId}/messages/{commentId}")
    public ApiResponse<PencilDocumentCommentResponse> update(
            @PathVariable String key,
            @PathVariable String threadId,
            @PathVariable String commentId,
            @RequestBody UpdateCommentRequest request
    ) {
        return ApiResponse.ok(commentService.updateComment(key, threadId, commentId, request));
    }

    @DeleteMapping("/{threadId}/messages/{commentId}")
    public ApiResponse<Void> delete(
            @PathVariable String key,
            @PathVariable String threadId,
            @PathVariable String commentId
    ) {
        commentService.deleteComment(key, threadId, commentId);
        return ApiResponse.ok();
    }
}
