package cn.jongwong.controller;

import cn.jongwong.authz.AuthzService;
import cn.jongwong.authz.ResourceOwnership;
import cn.jongwong.authz.dto.AccessRequestResponse;
import cn.jongwong.authz.entity.ResourceAccessRequest;
import cn.jongwong.authz.locator.DocumentResourceLocator;
import cn.jongwong.domain.repository.UserRepository;
import cn.jongwong.dto.ApiResponse;
import cn.jongwong.exception.ApiException;
import cn.jongwong.repository.PencilFileRepository;
import cn.jongwong.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/inbox")
@RequiredArgsConstructor
public class InboxController {

    private final AuthzService authzService;
    private final SecurityUtils securityUtils;
    private final UserRepository userRepository;
    private final PencilFileRepository pencilFileRepository;

    @GetMapping("/access-requests")
    public ApiResponse<List<AccessRequestResponse>> pendingAccessRequests() {
        String userId = securityUtils.getCurrentUserId();
        if (!StringUtils.hasText(userId)) {
            throw ApiException.unauthorized("Authentication required");
        }
        return ApiResponse.ok(authzService.listReviewablePendingRequests(userId).stream()
                .map(this::toRequest)
                .collect(Collectors.toList()));
    }

    private AccessRequestResponse toRequest(ResourceAccessRequest request) {
        AccessRequestResponse.AccessRequestResponseBuilder builder = AccessRequestResponse.builder()
                .id(request.getId())
                .resourceType(request.getResourceType())
                .resourceId(request.getResourceId())
                .requesterId(request.getRequesterId())
                .requestedRole(request.getRequestedRole())
                .status(request.getStatus())
                .message(request.getMessage())
                .reviewedBy(request.getReviewedBy())
                .reviewedAt(request.getReviewedAt())
                .createdAt(request.getCreatedAt());
        userRepository.findById(request.getRequesterId()).ifPresent(user -> {
            builder.requesterName(user.getName());
            builder.requesterUsername(user.getUsername());
            builder.requesterEmail(user.getEmail());
        });
        if (DocumentResourceLocator.TYPE.equals(request.getResourceType())) {
            pencilFileRepository
                    .findById(request.getResourceId())
                    .ifPresentOrElse(
                            doc -> {
                                builder.resourceKey(doc.getKey());
                                builder.resourceName(doc.getName());
                            },
                            () -> {
                                try {
                                    ResourceOwnership ownership = authzService.requireOwnership(
                                            request.getResourceType(), request.getResourceId());
                                    builder.resourceKey(ownership.resourceKey());
                                } catch (Exception ignored) {
                                    // leave key null
                                }
                            });
        }
        return builder.build();
    }
}
