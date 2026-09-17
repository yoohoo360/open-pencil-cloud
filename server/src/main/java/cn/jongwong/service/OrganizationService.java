package cn.jongwong.service;

import cn.jongwong.domain.entity.Team;
import cn.jongwong.domain.entity.TeamMember;
import cn.jongwong.domain.entity.User;
import cn.jongwong.domain.repository.TeamMemberRepository;
import cn.jongwong.domain.repository.TeamRepository;
import cn.jongwong.domain.repository.UserRepository;
import cn.jongwong.dto.UserDTO;
import cn.jongwong.exception.ApiException;
import cn.jongwong.web.dto.org.CreateOrganizationRequest;
import cn.jongwong.web.dto.org.OrganizationResponse;
import cn.jongwong.web.dto.org.TransferOrganizationRequest;
import cn.jongwong.web.dto.org.UpdateOrganizationRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrganizationService {

    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final PermissionService permissionService;
    private final TeamService teamService;

    @Transactional(readOnly = true)
    public List<OrganizationResponse> myOrganizations(String userId) {
        Map<String, Team> byId = new LinkedHashMap<>();
        for (Team team : teamRepository.findByOwnerId(userId)) {
            if (team.getParentId() == null) {
                byId.put(team.getId(), team);
            }
        }
        for (Team team : teamRepository.findOrganizationsByMemberId(userId)) {
            byId.putIfAbsent(team.getId(), team);
        }
        return byId.values().stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public OrganizationResponse get(String orgId, String actorId) {
        Team org = requireOrg(orgId);
        requireMemberOrAdmin(org, actorId);
        return toResponseWithMembers(org);
    }

    @Transactional
    public OrganizationResponse create(String ownerId, CreateOrganizationRequest request) {
        String name = request.getName().trim();
        userRepository.findById(ownerId)
                .orElseThrow(() -> ApiException.notFound("Owner not found"));

        String orgCode = allocateOrgCode();

        // Auto-approve for now; later gate via approval_status=pending.
        Team org = Team.builder()
                .name(name)
                .orgCode(orgCode)
                .description(request.getDescription())
                .avatar(request.getAvatar())
                .ownerId(ownerId)
                .parentId(null)
                .approvalStatus("approved")
                .basePermission("write")
                .build();
        org = teamRepository.save(org);
        teamService.addTeamMemberPublic(org, ownerId, "owner");
        log.info("Created organization {} code={} by {}", org.getId(), orgCode, ownerId);
        return toResponseWithMembers(teamRepository.findById(org.getId()).orElseThrow());
    }

    @Transactional
    public OrganizationResponse update(String orgId, String actorId, UpdateOrganizationRequest request) {
        Team org = requireOrg(orgId);
        requireOwnerOrAdmin(org, actorId);

        // Display name can repeat; org_code is immutable.
        if (StringUtils.hasText(request.getName())) {
            org.setName(request.getName().trim());
        }
        if (request.getDescription() != null) {
            org.setDescription(request.getDescription());
        }
        if (request.getAvatar() != null) {
            org.setAvatar(request.getAvatar());
        }
        if (StringUtils.hasText(request.getBasePermission())) {
            org.setBasePermission(request.getBasePermission().trim().toLowerCase());
        }
        if (StringUtils.hasText(request.getApprovalStatus()) && isSystemAdmin(actorId)) {
            org.setApprovalStatus(request.getApprovalStatus().trim().toLowerCase());
        }
        return toResponseWithMembers(teamRepository.save(org));
    }

    @Transactional
    public OrganizationResponse transfer(String orgId, String actorId, TransferOrganizationRequest request) {
        Team org = requireOrg(orgId);
        if (!org.getOwnerId().trim().equals(actorId.trim()) && !isSystemAdmin(actorId)) {
            throw ApiException.forbidden("Only the organization owner can transfer ownership");
        }
        UserDTO next = userService.resolveByUsernameOrEmail(request.getNewOwner());
        String nextId = next.getId().trim();
        if (nextId.equals(org.getOwnerId().trim())) {
            throw ApiException.badRequest("Already the owner");
        }
        String previousOwner = org.getOwnerId().trim();
        org.setOwnerId(nextId);
        teamRepository.save(org);

        if (!teamMemberRepository.existsByIdTeamIdAndIdUserId(orgId, nextId)) {
            teamService.addTeamMemberPublic(org, nextId, "owner");
        } else {
            teamService.updateMemberRoleInternal(orgId, nextId, "owner");
        }
        if (teamMemberRepository.existsByIdTeamIdAndIdUserId(orgId, previousOwner)) {
            teamService.updateMemberRoleInternal(orgId, previousOwner, "admin");
        }
        log.info("Transferred org {} from {} to {}", orgId, previousOwner, nextId);
        return toResponseWithMembers(teamRepository.findById(orgId).orElseThrow());
    }

    @Transactional(readOnly = true)
    public Page<OrganizationResponse> adminList(
            String search,
            Instant createdFrom,
            Instant createdTo,
            String actorId,
            Pageable pageable) {
        requireSystemAdmin(actorId);
        String q = blankToNull(search);
        boolean hasSearch = q != null;
        boolean hasFrom = createdFrom != null;
        boolean hasTo = createdTo != null;
        return teamRepository
                .findOrganizationsAdmin(
                        hasSearch,
                        hasSearch ? q : "",
                        hasFrom,
                        hasFrom ? createdFrom : Instant.EPOCH,
                        hasTo,
                        hasTo ? createdTo : Instant.EPOCH,
                        pageable)
                .map(this::toResponse);
    }

    @Transactional
    public OrganizationResponse adminUpdate(String orgId, String actorId, UpdateOrganizationRequest request) {
        requireSystemAdmin(actorId);
        return update(orgId, actorId, request);
    }

    @Transactional(readOnly = true)
    public List<OrganizationResponse.MemberInfo> listMembers(String orgId, String actorId) {
        Team org = requireOrg(orgId);
        requireMemberOrAdmin(org, actorId);
        return teamMemberRepository.findByIdTeamId(orgId).stream()
                .map(this::toMemberInfo)
                .collect(Collectors.toList());
    }

    public Team requireOrg(String orgId) {
        Team team = teamRepository.findById(orgId)
                .orElseThrow(() -> ApiException.notFound("Organization not found"));
        if (team.getParentId() != null) {
            throw ApiException.badRequest("Not an organization");
        }
        return team;
    }

    public void requireMemberOrAdmin(Team org, String userId) {
        if (isSystemAdmin(userId)) {
            return;
        }
        String uid = userId.trim();
        if (org.getOwnerId() != null && org.getOwnerId().trim().equals(uid)) {
            return;
        }
        if (!teamMemberRepository.existsByIdTeamIdAndIdUserId(org.getId(), uid)) {
            throw ApiException.forbidden("Not a member of this organization");
        }
    }

    public void requireOwnerOrAdmin(Team org, String userId) {
        if (isSystemAdmin(userId)) {
            return;
        }
        String uid = userId.trim();
        if (org.getOwnerId() != null && org.getOwnerId().trim().equals(uid)) {
            return;
        }
        TeamMember member = teamMemberRepository
                .findById(new cn.jongwong.domain.entity.id.TeamMemberId(org.getId(), uid))
                .orElseThrow(() -> ApiException.forbidden("Not allowed"));
        if (!"owner".equals(member.getRoleId()) && !"admin".equals(member.getRoleId())) {
            throw ApiException.forbidden("Only owner/admin can manage the organization");
        }
    }

    public boolean isSystemAdmin(String userId) {
        return permissionService.hasFullAccess(userId, null)
                || permissionService.hasFullAccess(userId, "teams")
                || permissionService.hasFullAccess(userId, "organizations");
    }

    private void requireSystemAdmin(String userId) {
        if (!isSystemAdmin(userId)) {
            throw ApiException.forbidden("Super admin required");
        }
    }

    private OrganizationResponse toResponse(Team org) {
        long members = teamMemberRepository.countByIdTeamId(org.getId());
        long teams = teamRepository.findByParentId(org.getId()).size();
        OrganizationResponse.OrganizationResponseBuilder builder = OrganizationResponse.builder()
                .id(org.getId() != null ? org.getId().trim() : null)
                .name(org.getName())
                .orgCode(org.getOrgCode())
                .description(org.getDescription())
                .avatar(org.getAvatar())
                .ownerId(org.getOwnerId() != null ? org.getOwnerId().trim() : null)
                .basePermission(org.getBasePermission())
                .approvalStatus(org.getApprovalStatus())
                .createdAt(org.getCreatedAt())
                .updatedAt(org.getUpdatedAt())
                .memberCount(members)
                .teamCount(teams);
        if (org.getOwnerId() != null) {
            userRepository.findById(org.getOwnerId().trim()).ifPresent(user ->
                    builder.owner(OrganizationResponse.OwnerInfo.builder()
                            .id(user.getId().trim())
                            .username(user.getUsername())
                            .name(user.getName())
                            .email(user.getEmail())
                            .avatar(user.getAvatar())
                            .build()));
        }
        return builder.build();
    }

    private OrganizationResponse toResponseWithMembers(Team org) {
        OrganizationResponse response = toResponse(org);
        List<OrganizationResponse.MemberInfo> members = new ArrayList<>();
        for (TeamMember member : teamMemberRepository.findByIdTeamId(org.getId())) {
            members.add(toMemberInfo(member));
        }
        response.setMembers(members);
        return response;
    }

    private OrganizationResponse.MemberInfo toMemberInfo(TeamMember member) {
        User user = member.getUser();
        return OrganizationResponse.MemberInfo.builder()
                .userId(user.getId().trim())
                .username(user.getUsername())
                .name(user.getName())
                .email(user.getEmail())
                .avatar(user.getAvatar())
                .roleId(member.getRoleId())
                .build();
    }

    private static final String ORG_CODE_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final int ORG_CODE_MIN_LEN = 6;
    private static final int ORG_CODE_MAX_LEN = 15;
    private static final int ORG_CODE_DEFAULT_LEN = 8;

    private String allocateOrgCode() {
        ThreadLocalRandom random = ThreadLocalRandom.current();
        for (int attempt = 0; attempt < 32; attempt++) {
            int len = ORG_CODE_DEFAULT_LEN;
            StringBuilder sb = new StringBuilder(len);
            for (int i = 0; i < len; i++) {
                sb.append(ORG_CODE_ALPHABET.charAt(random.nextInt(ORG_CODE_ALPHABET.length())));
            }
            String code = sb.toString();
            if (!teamRepository.existsByOrgCodeIgnoreCase(code)) {
                return code;
            }
        }
        throw ApiException.internalError("Failed to allocate organization code");
    }

    /** Validate format for any future manual assignment; auto-gen already complies. */
    public static boolean isValidOrgCode(String code) {
        if (code == null) {
            return false;
        }
        String trimmed = code.trim();
        if (trimmed.length() < ORG_CODE_MIN_LEN || trimmed.length() > ORG_CODE_MAX_LEN) {
            return false;
        }
        for (int i = 0; i < trimmed.length(); i++) {
            char c = trimmed.charAt(i);
            boolean ok = (c >= 'a' && c <= 'z')
                    || (c >= 'A' && c <= 'Z')
                    || (c >= '0' && c <= '9');
            if (!ok) {
                return false;
            }
        }
        return true;
    }

    private static String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
