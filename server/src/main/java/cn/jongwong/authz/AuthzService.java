package cn.jongwong.authz;

import cn.jongwong.authz.entity.ResourceAccessRequest;
import cn.jongwong.authz.entity.ResourceGrant;
import cn.jongwong.authz.repository.ResourceAccessRequestRepository;
import cn.jongwong.authz.repository.ResourceGrantRepository;
import cn.jongwong.domain.entity.Team;
import cn.jongwong.domain.entity.TeamMember;
import cn.jongwong.domain.repository.TeamMemberRepository;
import cn.jongwong.domain.repository.TeamRepository;
import cn.jongwong.exception.ApiException;
import cn.jongwong.service.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * GitHub-style authorization, independent of any document schema.
 *
 * Resolution order:
 * 1. Resource owner → admin
 * 2. Direct user collaborator grant
 * 3. Team collaborator grants (user is member of granted team)
 * 4. Owning org base_permission + parent-org admin inheritance
 *    (personal resources skip org path entirely)
 */
@Service
@RequiredArgsConstructor
public class AuthzService {

    public static final String TEAM_ROLE_OWNER = "owner";
    public static final String TEAM_ROLE_ADMIN = "admin";
    public static final String TEAM_ROLE_MEMBER = "member";

    private static final int MAX_PARENT_WALK = 32;

    private final ResourceGrantRepository grantRepository;
    private final ResourceAccessRequestRepository requestRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final PermissionService permissionService;
    private final List<ResourceLocator> locators;

    private final Map<String, ResourceLocator> locatorByType = new HashMap<>();

    @jakarta.annotation.PostConstruct
    void indexLocators() {
        for (ResourceLocator locator : locators) {
            locatorByType.put(locator.resourceType(), locator);
        }
    }

    public ResourceOwnership requireOwnership(String resourceType, String idOrKey) {
        ResourceLocator locator = locatorByType.get(resourceType);
        if (locator == null) {
            throw ApiException.badRequest("Unknown resource type: " + resourceType);
        }
        return locator
                .findByIdOrKey(idOrKey)
                .orElseThrow(() -> ApiException.notFound(resourceType + " not found: " + idOrKey));
    }

    @Transactional(readOnly = true)
    public Optional<AccessRole> resolveRole(ResourceOwnership resource, String userId) {
        if (resource == null || !StringUtils.hasText(userId)) {
            return Optional.empty();
        }
        // System RBAC wildcards: * / *:* / document:*
        if (permissionService.hasFullAccess(userId, resource.resourceType())) {
            return Optional.of(AccessRole.ADMIN);
        }
        AccessRole best = null;
        if (userId.equals(resource.ownerUserId())) {
            best = AccessRole.ADMIN;
        }

        best = max(best, userGrant(resource, userId));
        best = max(best, teamGrantsForUser(resource, userId));

        if (resource.isPersonal()) {
            return Optional.ofNullable(best);
        }

        best = max(best, organizationRole(resource.organizationId(), userId));
        return Optional.ofNullable(best);
    }

    /** System admin (* / resource:*) can see every resource of that type. */
    @Transactional(readOnly = true)
    public boolean isSystemFullAccess(String userId, String resourceType) {
        return permissionService.hasFullAccess(userId, resourceType);
    }

    @Transactional(readOnly = true)
    public Set<Capability> resolveCapabilities(ResourceOwnership resource, String userId) {
        return resolveRole(resource, userId)
                .map(role -> ResourcePolicies.capabilities(resource.resourceType(), role, resource.allowCopy()))
                .orElseGet(Set::of);
    }

    public void requireCapability(ResourceOwnership resource, String userId, Capability capability) {
        if (!resolveCapabilities(resource, userId).contains(capability)) {
            throw ApiException.forbidden("No permission for " + capability.wire());
        }
    }

    public void requireCapability(String resourceType, String idOrKey, String userId, Capability capability) {
        requireCapability(requireOwnership(resourceType, idOrKey), userId, capability);
    }

    @Transactional
    public void ensureOwnerAdminGrant(ResourceOwnership resource, String ownerId) {
        upsertGrant(
                resource.resourceType(),
                resource.resourceId(),
                PrincipalType.USER,
                ownerId,
                AccessRole.ADMIN,
                ownerId);
    }

    @Transactional
    public ResourceGrant upsertGrant(
            String resourceType,
            String resourceId,
            PrincipalType principalType,
            String principalId,
            AccessRole role,
            String grantedBy) {
        if (role == null || principalType == null || !StringUtils.hasText(principalId)) {
            throw ApiException.badRequest("Invalid grant");
        }
        ResourceGrant grant = grantRepository
                .findByResourceTypeAndResourceIdAndPrincipalTypeAndPrincipalId(
                        resourceType, resourceId, principalType.wire(), principalId)
                .orElseGet(() -> ResourceGrant.builder()
                        .resourceType(resourceType)
                        .resourceId(resourceId)
                        .principalType(principalType.wire())
                        .principalId(principalId)
                        .build());
        grant.setRole(role.wire());
        grant.setGrantedBy(grantedBy);
        return grantRepository.save(grant);
    }

    @Transactional
    public void revokeGrant(
            ResourceOwnership resource,
            String actorId,
            PrincipalType principalType,
            String principalId) {
        requireCapability(resource, actorId, Capability.MANAGE_ACCESS);
        if (principalType == PrincipalType.USER && principalId.equals(resource.ownerUserId())) {
            throw ApiException.badRequest("Cannot revoke the resource owner");
        }
        grantRepository.deleteByResourceTypeAndResourceIdAndPrincipalTypeAndPrincipalId(
                resource.resourceType(), resource.resourceId(), principalType.wire(), principalId);
    }

    @Transactional(readOnly = true)
    public List<ResourceGrant> listGrants(ResourceOwnership resource, String actorId) {
        requireCapability(resource, actorId, Capability.VIEW);
        return grantRepository.findByResourceTypeAndResourceIdOrderByCreatedAtAsc(
                resource.resourceType(), resource.resourceId());
    }

    @Transactional
    public ResourceAccessRequest createRequest(
            ResourceOwnership resource, String requesterId, AccessRole requestedRole, String message) {
        if (requestedRole == AccessRole.ADMIN) {
            throw ApiException.badRequest("Cannot request admin; ask an owner to grant it");
        }
        if (resolveRole(resource, requesterId).filter(r -> r.atLeast(requestedRole)).isPresent()) {
            throw ApiException.conflict("You already have this access");
        }
        if (requestRepository
                .findByResourceTypeAndResourceIdAndRequesterIdAndStatus(
                        resource.resourceType(),
                        resource.resourceId(),
                        requesterId,
                        AccessRequestStatus.PENDING.wire())
                .isPresent()) {
            throw ApiException.conflict("A pending request already exists");
        }
        return requestRepository.save(ResourceAccessRequest.builder()
                .resourceType(resource.resourceType())
                .resourceId(resource.resourceId())
                .requesterId(requesterId)
                .requestedRole(requestedRole.wire())
                .status(AccessRequestStatus.PENDING.wire())
                .message(message)
                .build());
    }

    @Transactional(readOnly = true)
    public List<ResourceAccessRequest> listRequests(ResourceOwnership resource, String actorId) {
        requireCapability(resource, actorId, Capability.MANAGE_ACCESS);
        return requestRepository.findByResourceTypeAndResourceIdOrderByCreatedAtDesc(
                resource.resourceType(), resource.resourceId());
    }

    /**
     * Pending access requests the actor can review (has manage_access on the resource).
     */
    @Transactional(readOnly = true)
    public List<ResourceAccessRequest> listReviewablePendingRequests(String actorId) {
        List<ResourceAccessRequest> pending =
                requestRepository.findByStatusOrderByCreatedAtDesc(AccessRequestStatus.PENDING.wire());
        List<ResourceAccessRequest> reviewable = new ArrayList<>();
        for (ResourceAccessRequest request : pending) {
            try {
                ResourceOwnership resource = requireOwnership(request.getResourceType(), request.getResourceId());
                if (resolveCapabilities(resource, actorId).contains(Capability.MANAGE_ACCESS)) {
                    reviewable.add(request);
                }
            } catch (Exception ignored) {
                // Skip resources the actor cannot resolve/manage.
            }
        }
        return reviewable;
    }

    @Transactional
    public ResourceAccessRequest reviewRequest(
            ResourceOwnership resource, String actorId, String requestId, boolean approve) {
        requireCapability(resource, actorId, Capability.MANAGE_ACCESS);
        ResourceAccessRequest request = requestRepository
                .findById(requestId)
                .orElseThrow(() -> ApiException.notFound("Access request not found"));
        if (!resource.resourceType().equals(request.getResourceType())
                || !resource.resourceId().equals(request.getResourceId())) {
            throw ApiException.badRequest("Request does not belong to this resource");
        }
        if (!AccessRequestStatus.PENDING.wire().equals(request.getStatus())) {
            throw ApiException.conflict("Request is not pending");
        }
        long now = System.currentTimeMillis();
        request.setReviewedBy(actorId);
        request.setReviewedAt(now);
        if (approve) {
            request.setStatus(AccessRequestStatus.APPROVED.wire());
            upsertGrant(
                    resource.resourceType(),
                    resource.resourceId(),
                    PrincipalType.USER,
                    request.getRequesterId(),
                    AccessRole.parse(request.getRequestedRole()),
                    actorId);
        } else {
            request.setStatus(AccessRequestStatus.REJECTED.wire());
        }
        return requestRepository.save(request);
    }

    @Transactional
    public void deleteAllForResource(String resourceType, String resourceId) {
        grantRepository.deleteByResourceTypeAndResourceId(resourceType, resourceId);
        requestRepository.deleteByResourceTypeAndResourceId(resourceType, resourceId);
    }

    /**
     * Whether the user can see this resource in listings (has any role).
     */
    @Transactional(readOnly = true)
    public boolean canAccess(ResourceOwnership resource, String userId) {
        return resolveRole(resource, userId).isPresent();
    }

    public void assertOrgMember(String userId, String organizationId) {
        if (!StringUtils.hasText(organizationId)) {
            return;
        }
        if (permissionService.hasFullAccess(userId, null) || permissionService.hasFullAccess(userId, "teams")) {
            return;
        }
        Team team = teamRepository
                .findById(organizationId)
                .orElseThrow(() -> ApiException.notFound("Organization not found"));
        if (userId.equals(team.getOwnerId())) {
            return;
        }
        if (teamMemberRepository.findByTeamIdAndUserId(organizationId, userId).isEmpty()) {
            throw ApiException.forbidden("You are not a member of this organization");
        }
    }

    private AccessRole userGrant(ResourceOwnership resource, String userId) {
        return grantRepository
                .findByResourceTypeAndResourceIdAndPrincipalTypeAndPrincipalId(
                        resource.resourceType(),
                        resource.resourceId(),
                        PrincipalType.USER.wire(),
                        userId)
                .map(g -> AccessRole.parse(g.getRole()))
                .orElse(null);
    }

    private AccessRole teamGrantsForUser(ResourceOwnership resource, String userId) {
        AccessRole best = null;
        List<ResourceGrant> grants = grantRepository.findByResourceTypeAndResourceIdOrderByCreatedAtAsc(
                resource.resourceType(), resource.resourceId());
        for (ResourceGrant grant : grants) {
            if (!PrincipalType.TEAM.wire().equals(grant.getPrincipalType())) {
                continue;
            }
            if (teamMemberRepository.findByTeamIdAndUserId(grant.getPrincipalId(), userId).isEmpty()
                    && !isTeamOwner(grant.getPrincipalId(), userId)) {
                continue;
            }
            best = max(best, AccessRole.parse(grant.getRole()));
        }
        return best;
    }

    /**
     * Org base permission for members; parent org owner/admin → admin on child resources.
     */
    private AccessRole organizationRole(String organizationId, String userId) {
        AccessRole best = null;
        String currentId = organizationId;
        int depth = 0;
        while (StringUtils.hasText(currentId) && depth++ < MAX_PARENT_WALK) {
            Team team = teamRepository.findById(currentId).orElse(null);
            if (team == null) {
                break;
            }
            boolean home = currentId.equals(organizationId);
            if (userId.equals(team.getOwnerId())) {
                best = max(best, AccessRole.ADMIN);
            }
            Optional<TeamMember> membership =
                    teamMemberRepository.findByTeamIdAndUserId(currentId, userId);
            if (membership.isPresent()) {
                String role = normalizeTeamRole(membership.get().getRoleId());
                if (TEAM_ROLE_OWNER.equals(role) || TEAM_ROLE_ADMIN.equals(role)) {
                    best = max(best, AccessRole.ADMIN);
                } else if (home) {
                    best = max(best, parseBasePermission(team.getBasePermission()));
                }
            }
            currentId = team.getParentId();
        }
        return best;
    }

    private boolean isTeamOwner(String teamId, String userId) {
        return teamRepository.findById(teamId).map(t -> userId.equals(t.getOwnerId())).orElse(false);
    }

    private static AccessRole parseBasePermission(String value) {
        if (!StringUtils.hasText(value) || "none".equalsIgnoreCase(value)) {
            return null;
        }
        return AccessRole.parse(value);
    }

    private static String normalizeTeamRole(String roleId) {
        if (!StringUtils.hasText(roleId)) {
            return TEAM_ROLE_MEMBER;
        }
        return roleId.trim().toLowerCase(Locale.ROOT);
    }

    private static AccessRole max(AccessRole a, AccessRole b) {
        if (a == null) {
            return b;
        }
        if (b == null) {
            return a;
        }
        return a.ordinal() >= b.ordinal() ? a : b;
    }

    public Set<String> capabilityWires(ResourceOwnership resource, String userId) {
        return resolveCapabilities(resource, userId).stream()
                .map(Capability::wire)
                .collect(Collectors.toSet());
    }

    public List<ResourceGrant> listUserCollaboratorGrants(String userId) {
        return grantRepository.findByPrincipalTypeAndPrincipalId(PrincipalType.USER.wire(), userId);
    }

    public List<String> knownResourceTypes() {
        return new ArrayList<>(locatorByType.keySet());
    }
}
