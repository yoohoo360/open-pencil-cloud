package cn.jongwong.service;

import cn.jongwong.authz.AccessRole;
import cn.jongwong.authz.AuthzService;
import cn.jongwong.authz.Capability;
import cn.jongwong.authz.PrincipalType;
import cn.jongwong.authz.ResourceOwnership;
import cn.jongwong.authz.locator.DocumentResourceLocator;
import cn.jongwong.domain.entity.MembershipInvitation;
import cn.jongwong.domain.entity.Team;
import cn.jongwong.domain.entity.User;
import cn.jongwong.domain.repository.MembershipInvitationRepository;
import cn.jongwong.domain.repository.TeamMemberRepository;
import cn.jongwong.domain.repository.TeamRepository;
import cn.jongwong.domain.repository.UserRepository;
import cn.jongwong.dto.UserDTO;
import cn.jongwong.exception.ApiException;
import cn.jongwong.web.dto.invite.CreateInvitationRequest;
import cn.jongwong.web.dto.invite.InvitationResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class InvitationService {

    public static final String TYPE_ORGANIZATION = "organization";
    public static final String TYPE_TEAM = "team";
    public static final String TYPE_DOCUMENT = "document";

    private final MembershipInvitationRepository invitationRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final TeamService teamService;
    private final OrganizationService organizationService;
    private final AuthzService authzService;

    @Transactional(readOnly = true)
    public List<InvitationResponse> myPending(String userId) {
        return invitationRepository
                .findByInviteeIdAndStatusOrderByCreatedAtDesc(userId.trim(), "pending")
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public InvitationResponse invite(String inviterId, CreateInvitationRequest request) {
        String type = request.getTargetType().trim().toLowerCase();
        UserDTO invitee = userService.resolveByUsernameOrEmail(request.getInvitee());
        String inviteeId = invitee.getId().trim();
        if (inviteeId.equals(inviterId.trim())) {
            throw ApiException.badRequest("Cannot invite yourself");
        }

        String role = StringUtils.hasText(request.getRole())
                ? request.getRole().trim().toLowerCase()
                : defaultRole(type);

        ResolvedTarget target = resolveTarget(type, request.getTargetId().trim(), inviterId);

        invitationRepository
                .findByTargetTypeAndTargetIdAndInviteeIdAndStatus(
                        type, target.id(), inviteeId, "pending")
                .ifPresent(existing -> {
                    throw ApiException.conflict("A pending invitation already exists");
                });

        MembershipInvitation invitation = MembershipInvitation.builder()
                .targetType(type)
                .targetId(target.id())
                .targetKey(target.key())
                .targetName(target.name())
                .inviteeId(inviteeId)
                .inviterId(inviterId.trim())
                .role(role)
                .status("pending")
                .message(request.getMessage())
                .build();
        invitation = invitationRepository.save(invitation);
        log.info("Invited {} to {} {} by {}", inviteeId, type, target.id(), inviterId);
        return toResponse(invitation);
    }

    @Transactional
    public InvitationResponse accept(String invitationId, String actorId) {
        MembershipInvitation invitation = requirePendingForInvitee(invitationId, actorId);
        switch (invitation.getTargetType()) {
            case TYPE_ORGANIZATION, TYPE_TEAM -> {
                Team team = teamRepository
                        .findById(invitation.getTargetId())
                        .orElseThrow(() -> ApiException.notFound("Target not found"));
                if (!teamMemberRepository.existsByIdTeamIdAndIdUserId(team.getId(), actorId)) {
                    teamService.addTeamMemberPublic(team, actorId, invitation.getRole());
                }
            }
            case TYPE_DOCUMENT -> {
                ResourceOwnership resource =
                        authzService.requireOwnership(DocumentResourceLocator.TYPE, invitation.getTargetId());
                authzService.upsertGrant(
                        resource.resourceType(),
                        resource.resourceId(),
                        PrincipalType.USER,
                        actorId,
                        AccessRole.parse(invitation.getRole()),
                        invitation.getInviterId());
            }
            default -> throw ApiException.badRequest("Unknown invitation type");
        }
        invitation.setStatus("accepted");
        return toResponse(invitationRepository.save(invitation));
    }

    @Transactional
    public InvitationResponse reject(String invitationId, String actorId) {
        MembershipInvitation invitation = requirePendingForInvitee(invitationId, actorId);
        invitation.setStatus("rejected");
        return toResponse(invitationRepository.save(invitation));
    }

    private MembershipInvitation requirePendingForInvitee(String invitationId, String actorId) {
        MembershipInvitation invitation = invitationRepository
                .findById(invitationId)
                .orElseThrow(() -> ApiException.notFound("Invitation not found"));
        if (!invitation.getInviteeId().trim().equals(actorId.trim())) {
            throw ApiException.forbidden("Not your invitation");
        }
        if (!"pending".equals(invitation.getStatus())) {
            throw ApiException.conflict("Invitation is not pending");
        }
        return invitation;
    }

    private ResolvedTarget resolveTarget(String type, String targetId, String inviterId) {
        return switch (type) {
            case TYPE_ORGANIZATION -> {
                Team org = organizationService.requireOrg(targetId);
                organizationService.requireOwnerOrAdmin(org, inviterId);
                yield new ResolvedTarget(org.getId(), null, org.getName());
            }
            case TYPE_TEAM -> {
                Team team = teamRepository
                        .findById(targetId)
                        .orElseThrow(() -> ApiException.notFound("Team not found"));
                if (team.getParentId() == null) {
                    throw ApiException.badRequest("Use organization type for orgs");
                }
                if (!(team.getOwnerId() != null && team.getOwnerId().trim().equals(inviterId.trim()))
                        && !teamMemberRepository.existsByIdTeamIdAndIdUserId(team.getId(), inviterId)) {
                    throw ApiException.forbidden("Not allowed to invite to this team");
                }
                yield new ResolvedTarget(team.getId(), null, team.getName());
            }
            case TYPE_DOCUMENT -> {
                ResourceOwnership resource =
                        authzService.requireOwnership(DocumentResourceLocator.TYPE, targetId);
                authzService.requireCapability(resource, inviterId, Capability.MANAGE_ACCESS);
                yield new ResolvedTarget(
                        resource.resourceId(), resource.resourceKey(), resource.resourceKey());
            }
            default -> throw ApiException.badRequest("Unsupported target type: " + type);
        };
    }

    private static String defaultRole(String type) {
        return TYPE_DOCUMENT.equals(type) ? "write" : "member";
    }

    private InvitationResponse toResponse(MembershipInvitation invitation) {
        InvitationResponse.InvitationResponseBuilder builder = InvitationResponse.builder()
                .id(invitation.getId())
                .targetType(invitation.getTargetType())
                .targetId(invitation.getTargetId())
                .targetKey(invitation.getTargetKey())
                .targetName(invitation.getTargetName())
                .inviteeId(invitation.getInviteeId())
                .inviterId(invitation.getInviterId())
                .role(invitation.getRole())
                .status(invitation.getStatus())
                .message(invitation.getMessage())
                .createdAt(invitation.getCreatedAt())
                .updatedAt(invitation.getUpdatedAt());
        userRepository.findById(invitation.getInviteeId().trim()).ifPresent(user -> {
            builder.inviteeName(user.getName());
            builder.inviteeUsername(user.getUsername());
            builder.inviteeEmail(user.getEmail());
        });
        userRepository.findById(invitation.getInviterId().trim()).ifPresent(user -> {
            builder.inviterName(user.getName());
            builder.inviterUsername(user.getUsername());
        });
        return builder.build();
    }

    private record ResolvedTarget(String id, String key, String name) {}
}
