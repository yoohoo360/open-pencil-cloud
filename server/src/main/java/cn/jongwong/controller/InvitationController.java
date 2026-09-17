package cn.jongwong.controller;

import cn.jongwong.domain.entity.User;
import cn.jongwong.dto.ApiResponse;
import cn.jongwong.exception.ApiException;
import cn.jongwong.security.SecurityUtils;
import cn.jongwong.service.InvitationService;
import cn.jongwong.web.dto.invite.CreateInvitationRequest;
import cn.jongwong.web.dto.invite.InvitationResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Invitations")
@RestController
@RequestMapping("/api/invitations")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class InvitationController {

    private final InvitationService invitationService;
    private final SecurityUtils securityUtils;

    @GetMapping("/mine")
    public ApiResponse<List<InvitationResponse>> mine(@AuthenticationPrincipal User user) {
        return ApiResponse.ok(invitationService.myPending(resolveUserId(user)));
    }

    @PostMapping
    public ApiResponse<InvitationResponse> create(
            @AuthenticationPrincipal User user, @Valid @RequestBody CreateInvitationRequest request) {
        return ApiResponse.ok(invitationService.invite(resolveUserId(user), request));
    }

    @PostMapping("/{id}/accept")
    public ApiResponse<InvitationResponse> accept(
            @AuthenticationPrincipal User user, @PathVariable String id) {
        return ApiResponse.ok(invitationService.accept(id, resolveUserId(user)));
    }

    @PostMapping("/{id}/reject")
    public ApiResponse<InvitationResponse> reject(
            @AuthenticationPrincipal User user, @PathVariable String id) {
        return ApiResponse.ok(invitationService.reject(id, resolveUserId(user)));
    }

    private String resolveUserId(User user) {
        if (user != null && StringUtils.hasText(user.getId())) {
            return user.getId().trim();
        }
        String userId = securityUtils.getCurrentUserId();
        if (!StringUtils.hasText(userId)) {
            throw ApiException.unauthorized("Authentication required");
        }
        return userId.trim();
    }
}
