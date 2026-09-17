package cn.jongwong.controller;

import cn.jongwong.authz.AccessRole;
import cn.jongwong.authz.AuthzService;
import cn.jongwong.authz.Capability;
import cn.jongwong.authz.PrincipalType;
import cn.jongwong.authz.ResourceOwnership;
import cn.jongwong.authz.dto.AccessRequestResponse;
import cn.jongwong.authz.dto.CreateAccessRequestBody;
import cn.jongwong.authz.dto.ResourceAccessSnapshotResponse;
import cn.jongwong.authz.dto.ResourceGrantResponse;
import cn.jongwong.authz.dto.UpdateResourceSettingsRequest;
import cn.jongwong.authz.dto.UpsertResourceGrantRequest;
import cn.jongwong.authz.entity.ResourceAccessRequest;
import cn.jongwong.authz.entity.ResourceGrant;
import cn.jongwong.authz.locator.DocumentResourceLocator;
import cn.jongwong.domain.repository.UserRepository;
import cn.jongwong.dto.ApiResponse;
import cn.jongwong.dto.UserDTO;
import cn.jongwong.entity.PencilDocument;
import cn.jongwong.exception.ApiException;
import cn.jongwong.repository.PencilFileRepository;
import cn.jongwong.security.SecurityUtils;
import cn.jongwong.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Generic resource ACL API (GitHub-style collaborators), not document-specific.
 * Example: GET /api/resources/document/{key}/access
 */
@RestController
@RequestMapping("/api/resources/{type}/{idOrKey}/access")
@RequiredArgsConstructor
public class ResourceAccessController {

    private final AuthzService authzService;
    private final SecurityUtils securityUtils;
    private final PencilFileRepository pencilFileRepository;
    private final UserService userService;
    private final UserRepository userRepository;

    @GetMapping
    public ApiResponse<ResourceAccessSnapshotResponse> snapshot(
            @PathVariable String type, @PathVariable String idOrKey) {
        String userId = requireUserId();
        ResourceOwnership resource = authzService.requireOwnership(type, idOrKey);
        authzService.requireCapability(resource, userId, Capability.VIEW);
        return ApiResponse.ok(toSnapshot(resource, userId));
    }

    @PutMapping("/grants")
    public ApiResponse<ResourceAccessSnapshotResponse> upsertGrant(
            @PathVariable String type,
            @PathVariable String idOrKey,
            @Valid @RequestBody UpsertResourceGrantRequest request) {
        String userId = requireUserId();
        ResourceOwnership resource = authzService.requireOwnership(type, idOrKey);
        authzService.requireCapability(resource, userId, Capability.MANAGE_ACCESS);
        PrincipalType principalType = PrincipalType.parse(request.getPrincipalType());
        String principalId = request.getPrincipalId();
        if (principalType == PrincipalType.USER) {
            UserDTO resolved = userService.resolveByUsernameOrEmail(principalId);
            principalId = resolved.getId();
        }
        authzService.upsertGrant(
                resource.resourceType(),
                resource.resourceId(),
                principalType,
                principalId,
                AccessRole.parse(request.getRole()),
                userId);
        return ApiResponse.ok(toSnapshot(resource, userId));
    }

    @DeleteMapping("/grants/{principalType}/{principalId}")
    public ApiResponse<ResourceAccessSnapshotResponse> revokeGrant(
            @PathVariable String type,
            @PathVariable String idOrKey,
            @PathVariable String principalType,
            @PathVariable String principalId) {
        String userId = requireUserId();
        ResourceOwnership resource = authzService.requireOwnership(type, idOrKey);
        authzService.revokeGrant(resource, userId, PrincipalType.parse(principalType), principalId);
        return ApiResponse.ok(toSnapshot(resource, userId));
    }

    @PutMapping("/settings")
    public ApiResponse<ResourceAccessSnapshotResponse> updateSettings(
            @PathVariable String type,
            @PathVariable String idOrKey,
            @RequestBody UpdateResourceSettingsRequest request) {
        String userId = requireUserId();
        ResourceOwnership resource = authzService.requireOwnership(type, idOrKey);
        authzService.requireCapability(resource, userId, Capability.MANAGE_ACCESS);
        if (DocumentResourceLocator.TYPE.equals(type) && request.getAllowCopy() != null) {
            PencilDocument doc = pencilFileRepository
                    .findById(resource.resourceId())
                    .orElseThrow(() -> ApiException.notFound("Document not found"));
            doc.setAllowCopy(request.getAllowCopy());
            pencilFileRepository.save(doc);
            resource = DocumentResourceLocator.toOwnership(doc);
        }
        return ApiResponse.ok(toSnapshot(resource, userId));
    }

    @PostMapping("/requests")
    public ApiResponse<AccessRequestResponse> requestAccess(
            @PathVariable String type,
            @PathVariable String idOrKey,
            @Valid @RequestBody CreateAccessRequestBody body) {
        String userId = requireUserId();
        ResourceOwnership resource = authzService.requireOwnership(type, idOrKey);
        ResourceAccessRequest created = authzService.createRequest(
                resource, userId, AccessRole.parse(body.getRole()), body.getMessage());
        return ApiResponse.ok(toRequest(created));
    }

    @GetMapping("/requests")
    public ApiResponse<List<AccessRequestResponse>> listRequests(
            @PathVariable String type, @PathVariable String idOrKey) {
        String userId = requireUserId();
        ResourceOwnership resource = authzService.requireOwnership(type, idOrKey);
        return ApiResponse.ok(authzService.listRequests(resource, userId).stream()
                .map(this::toRequest)
                .collect(Collectors.toList()));
    }

    @PostMapping("/requests/{requestId}/approve")
    public ApiResponse<AccessRequestResponse> approve(
            @PathVariable String type, @PathVariable String idOrKey, @PathVariable String requestId) {
        String userId = requireUserId();
        ResourceOwnership resource = authzService.requireOwnership(type, idOrKey);
        return ApiResponse.ok(toRequest(authzService.reviewRequest(resource, userId, requestId, true)));
    }

    @PostMapping("/requests/{requestId}/reject")
    public ApiResponse<AccessRequestResponse> reject(
            @PathVariable String type, @PathVariable String idOrKey, @PathVariable String requestId) {
        String userId = requireUserId();
        ResourceOwnership resource = authzService.requireOwnership(type, idOrKey);
        return ApiResponse.ok(toRequest(authzService.reviewRequest(resource, userId, requestId, false)));
    }

    private ResourceAccessSnapshotResponse toSnapshot(ResourceOwnership resource, String userId) {
        AccessRole role = authzService
                .resolveRole(resource, userId)
                .orElseThrow(() -> ApiException.forbidden("No access to this resource"));
        List<ResourceGrantResponse> grants = new ArrayList<>();
        if (StringUtils.hasText(resource.ownerUserId())) {
            grants.add(enrichGrant(ResourceGrantResponse.builder()
                    .principalType(PrincipalType.USER.wire())
                    .principalId(resource.ownerUserId())
                    .role(AccessRole.ADMIN.wire())
                    .owner(true)
                    .build()));
        }
        for (ResourceGrant grant : authzService.listGrants(resource, userId)) {
            if (PrincipalType.USER.wire().equals(grant.getPrincipalType())
                    && grant.getPrincipalId().equals(resource.ownerUserId())) {
                continue;
            }
            grants.add(enrichGrant(ResourceGrantResponse.builder()
                    .id(grant.getId())
                    .principalType(grant.getPrincipalType())
                    .principalId(grant.getPrincipalId())
                    .role(grant.getRole())
                    .grantedBy(grant.getGrantedBy())
                    .createdAt(grant.getCreatedAt())
                    .owner(false)
                    .build()));
        }
        return ResourceAccessSnapshotResponse.builder()
                .resourceType(resource.resourceType())
                .resourceId(resource.resourceId())
                .resourceKey(resource.resourceKey())
                .ownerId(resource.ownerUserId())
                .organizationId(resource.organizationId())
                .personal(resource.isPersonal())
                .allowCopy(resource.allowCopy())
                .myRole(role.wire())
                .capabilities(authzService.capabilityWires(resource, userId))
                .grants(grants)
                .build();
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
        return builder.build();
    }

    private ResourceGrantResponse enrichGrant(ResourceGrantResponse grant) {
        if (!PrincipalType.USER.wire().equals(grant.getPrincipalType())) {
            return grant;
        }
        userRepository.findById(grant.getPrincipalId()).ifPresent(user -> {
            grant.setPrincipalName(user.getName());
            grant.setPrincipalUsername(user.getUsername());
            grant.setPrincipalEmail(user.getEmail());
        });
        return grant;
    }

    private String requireUserId() {
        String userId = securityUtils.getCurrentUserId();
        if (!StringUtils.hasText(userId)) {
            throw ApiException.unauthorized("Authentication required");
        }
        return userId;
    }
}
