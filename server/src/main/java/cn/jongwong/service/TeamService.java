package cn.jongwong.service;

import cn.jongwong.domain.entity.Team;
import cn.jongwong.domain.entity.TeamMember;
import cn.jongwong.domain.entity.User;
import cn.jongwong.domain.entity.id.TeamMemberId;
import cn.jongwong.domain.repository.TeamMemberRepository;
import cn.jongwong.domain.repository.TeamRepository;
import cn.jongwong.domain.repository.UserRepository;
import cn.jongwong.web.dto.team.AddMemberRequest;
import cn.jongwong.web.dto.team.CreateTeamRequest;
import cn.jongwong.web.dto.team.TeamMemberResponse;
import cn.jongwong.web.dto.team.TeamResponse;
import cn.jongwong.web.dto.team.UpdateMemberRoleRequest;
import cn.jongwong.web.dto.team.UpdateTeamRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class TeamService {

    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final UserRepository userRepository;

    /**
     * Get all teams for a user (owned teams and teams user is a member of)
     */
    @Transactional(readOnly = true)
    public List<TeamResponse> getUserTeams(String userId) {
        return getUserTeams(userId, null);
    }

    /**
     * Teams the user can see. When orgId is set, only teams under that organization.
     */
    @Transactional(readOnly = true)
    public List<TeamResponse> getUserTeams(String userId, String orgId) {
        List<Team> ownedTeams = teamRepository.findByOwnerId(userId);
        List<Team> memberTeams = teamRepository.findByMemberId(userId);

        List<Team> allTeams = ownedTeams.stream()
                .collect(Collectors.toMap(Team::getId, team -> team, (t1, t2) -> t1))
                .values().stream()
                .collect(Collectors.toList());

        memberTeams.forEach(team -> {
            if (allTeams.stream().noneMatch(t -> t.getId().equals(team.getId()))) {
                allTeams.add(team);
            }
        });

        return allTeams.stream()
                .filter(team -> team.getParentId() != null) // only teams, not orgs
                .filter(team -> !StringUtils.hasText(orgId) || orgId.equals(team.getParentId()))
                .map(this::toTeamResponse)
                .collect(Collectors.toList());
    }

    /**
     * Create a new team under an organization (parentId required).
     */
    @Transactional
    public TeamResponse createTeam(String ownerId, CreateTeamRequest request) {
        userRepository.findById(ownerId)
                .orElseThrow(() -> new RuntimeException("Owner not found with id: " + ownerId));

        if (!StringUtils.hasText(request.getParentId())) {
            throw new RuntimeException("Teams must belong to an organization (parent_id required)");
        }
        Team org = teamRepository.findById(request.getParentId().trim())
                .orElseThrow(() -> new RuntimeException("Organization not found"));
        if (org.getParentId() != null) {
            throw new RuntimeException("parent_id must be an organization");
        }
        if (!teamMemberRepository.existsByIdTeamIdAndIdUserId(org.getId(), ownerId)
                && !(org.getOwnerId() != null && org.getOwnerId().trim().equals(ownerId.trim()))) {
            throw new RuntimeException("You must be an organization member to create a team");
        }

        String name = request.getName().trim();
        if (teamRepository.existsByNameIgnoreCaseAndParentId(name, org.getId())) {
            throw new RuntimeException("Team with name '" + name + "' already exists in this organization");
        }

        Team team = Team.builder()
                .name(name)
                .description(request.getDescription())
                .avatar(request.getAvatar())
                .ownerId(ownerId)
                .parentId(org.getId())
                .approvalStatus("approved")
                .build();

        team = teamRepository.save(team);
        log.info("Created team: {} under org {} by owner: {}", team.getId(), org.getId(), ownerId);

        addTeamMember(team, ownerId, "owner");
        return toTeamResponseWithMembers(teamRepository.findById(team.getId()).orElseThrow());
    }

    /** Used by OrganizationService / InvitationService. */
    @Transactional
    public void addTeamMemberPublic(Team team, String userId, String roleId) {
        addTeamMember(team, userId, roleId);
    }

    @Transactional
    public void updateMemberRoleInternal(String teamId, String userId, String roleId) {
        TeamMemberId memberId = new TeamMemberId(teamId, userId.trim());
        TeamMember member = teamMemberRepository.findById(memberId)
                .orElseThrow(() -> new RuntimeException("Team member not found"));
        member.setRoleId(roleId);
        teamMemberRepository.save(member);
    }

    @Transactional(readOnly = true)
    public Page<TeamResponse> getTeams(String search, Pageable pageable) {
        String q = blankToNull(search);
        boolean hasSearch = q != null;
        return teamRepository
                .findBySearch(hasSearch, hasSearch ? q : "", pageable)
                .map(this::toTeamResponse);
    }

    @Transactional(readOnly = true)
    public TeamResponse getTeamById(String id) {
        Team team = teamRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Team not found with id: " + id));
        return toTeamResponseWithMembers(team);
    }

    private String resolveMemberId(String ref) {
        if (ref == null || ref.isBlank()) {
            throw new RuntimeException("Member identifier is required");
        }
        String trimmed = ref.trim();
        return userRepository.findById(trimmed)
                .or(() -> trimmed.contains("@")
                        ? userRepository.findByEmail(trimmed.toLowerCase())
                        : userRepository.findByUsername(trimmed)
                                .or(() -> userRepository.findByEmail(trimmed.toLowerCase())))
                .map(User::getId)
                .orElseThrow(() -> new RuntimeException("User not found: " + trimmed));
    }

    /**
     * Update team information
     */
    @Transactional
    public TeamResponse updateTeam(String id, String userId, UpdateTeamRequest request) {
        Team team = teamRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Team not found with id: " + id));

        // Verify user is owner
        if (!team.getOwnerId().equals(userId)) {
            throw new RuntimeException("Only the team owner can update team information");
        }

        // Update fields if provided
        if (request.getName() != null) {
            String name = request.getName().trim();
            if (!StringUtils.hasText(name)) {
                throw new RuntimeException("Team name cannot be empty");
            }
            // Team names are unique only within the same organization (not globally)
            if (team.getParentId() != null
                    && !name.equalsIgnoreCase(team.getName())
                    && teamRepository.existsByNameIgnoreCaseAndParentIdAndIdNot(
                            name, team.getParentId(), team.getId())) {
                throw new RuntimeException(
                        "Team with name '" + name + "' already exists in this organization");
            }
            team.setName(name);
        }
        if (request.getDescription() != null) {
            team.setDescription(request.getDescription());
        }
        if (request.getAvatar() != null) {
            team.setAvatar(request.getAvatar());
        }
        if (request.getParentId() != null) {
            String parentId = request.getParentId().isBlank() ? null : request.getParentId();
            if (parentId != null && parentId.equals(team.getId())) {
                throw new RuntimeException("Organization cannot be its own parent");
            }
            team.setParentId(parentId);
        }

        team = teamRepository.save(team);
        log.info("Updated team: {}", team.getId());

        return toTeamResponseWithMembers(team);
    }

    /**
     * Delete a team
     */
    @Transactional
    public void deleteTeam(String id, String userId) {
        Team team = teamRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Team not found with id: " + id));

        String ownerId = team.getOwnerId() == null ? "" : team.getOwnerId().trim();
        String actorId = userId == null ? "" : userId.trim();
        if (!ownerId.equals(actorId)) {
            throw new RuntimeException("Only the team owner can delete the team");
        }

        teamRepository.delete(team);
        log.info("Deleted team: {} by owner: {}", id, userId);
    }

    /**
     * Add a member to the team
     */
    @Transactional
    public TeamResponse addMember(String teamId, String requesterId, AddMemberRequest request) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new RuntimeException("Team not found with id: " + teamId));

        // Verify requester is owner
        if (!team.getOwnerId().equals(requesterId)) {
            throw new RuntimeException("Only the team owner can add members");
        }

        // Check if member already exists
        if (teamMemberRepository.existsByIdTeamIdAndIdUserId(teamId, request.getUserId())) {
            throw new RuntimeException("User is already a member of this team");
        }

        addTeamMember(team, request.getUserId(), request.getRoleId());
        log.info("Added member {} to team: {}", request.getUserId(), teamId);

        return toTeamResponseWithMembers(teamRepository.findById(teamId).orElseThrow());
    }

    /**
     * Remove a member from the team
     */
    @Transactional
    public TeamResponse removeMember(String teamId, String requesterId, String userId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new RuntimeException("Team not found with id: " + teamId));

        // Verify requester is owner
        if (!team.getOwnerId().equals(requesterId)) {
            throw new RuntimeException("Only the team owner can remove members");
        }

        // Cannot remove owner
        if (userId.equals(team.getOwnerId())) {
            throw new RuntimeException("Cannot remove the team owner");
        }

        // Check if member exists
        if (!teamMemberRepository.existsByIdTeamIdAndIdUserId(teamId, userId)) {
            throw new RuntimeException("User is not a member of this team");
        }

        teamMemberRepository.deleteByIdTeamIdAndIdUserId(teamId, userId);
        log.info("Removed member {} from team: {}", userId, teamId);

        return toTeamResponseWithMembers(teamRepository.findById(teamId).orElseThrow());
    }

    /**
     * Update a member's role
     */
    @Transactional
    public TeamResponse updateMemberRole(String teamId, String requesterId, String userId,
                                         UpdateMemberRoleRequest request) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new RuntimeException("Team not found with id: " + teamId));

        // Verify requester is owner
        if (!team.getOwnerId().equals(requesterId)) {
            throw new RuntimeException("Only the team owner can update member roles");
        }

        // Cannot change owner's role
        if (userId.equals(team.getOwnerId())) {
            throw new RuntimeException("Cannot change the team owner's role");
        }

        TeamMemberId memberId = new TeamMemberId(teamId, userId);
        TeamMember member = teamMemberRepository.findById(memberId)
                .orElseThrow(() -> new RuntimeException("Team member not found"));

        member.setRoleId(request.getRoleId());
        teamMemberRepository.save(member);
        log.info("Updated role for member {} in team: {}", userId, teamId);

        return toTeamResponseWithMembers(teamRepository.findById(teamId).orElseThrow());
    }

    /**
     * Get team statistics
     */
    @Transactional(readOnly = true)
    public TeamStatsResponse getTeamStats(String teamId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new RuntimeException("Team not found with id: " + teamId));

        long memberCount = teamMemberRepository.countByIdTeamId(teamId);

        return TeamStatsResponse.builder()
                .teamId(teamId)
                .memberCount(memberCount)
                .build();
    }

    /**
     * Helper method to add a team member
     */
    private void addTeamMember(Team team, String userId, String roleId) {
        String trimmedUserId = userId == null ? null : userId.trim();
        User user = userRepository.findById(trimmedUserId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + trimmedUserId));
        // CHAR(36) columns pad on read — keep embedded ids trimmed.
        user.setId(user.getId().trim());

        TeamMember member = TeamMember.builder()
                .team(team)
                .user(user)
                .roleId(roleId)
                .build();

        teamMemberRepository.save(member);
    }

    /**
     * Convert Team entity to TeamResponse (without members list)
     */
    private TeamResponse toTeamResponse(Team team) {
        TeamResponse.TeamResponseBuilder builder = TeamResponse.builder()
                .id(team.getId())
                .name(team.getName())
                .description(team.getDescription())
                .avatar(team.getAvatar())
                .ownerId(team.getOwnerId())
                .parentId(team.getParentId())
                .approvalStatus(team.getApprovalStatus())
                .createdAt(team.getCreatedAt())
                .updatedAt(team.getUpdatedAt());

        // Add owner info
        if (team.getOwner() != null) {
            User owner = team.getOwner();
            builder.owner(TeamResponse.OwnerInfo.builder()
                    .id(owner.getId())
                    .username(owner.getUsername())
                    .name(owner.getName())
                    .email(owner.getEmail())
                    .avatar(owner.getAvatar())
                    .build());
        }

        // Add member count (owner is also stored as a team member)
        long memberCount = teamMemberRepository.countByIdTeamId(team.getId());
        builder.memberCount(memberCount);

        return builder.build();
    }

    /**
     * Convert Team entity to TeamResponse with full member details
     */
    private TeamResponse toTeamResponseWithMembers(Team team) {
        TeamResponse response = toTeamResponse(team);

        // Add members list
        List<TeamMemberResponse> members = teamMemberRepository.findByIdTeamId(team.getId())
                .stream()
                .map(this::toTeamMemberResponse)
                .collect(Collectors.toList());

        response.setMembers(members);
        return response;
    }

    /**
     * Convert TeamMember entity to TeamMemberResponse
     */
    private TeamMemberResponse toTeamMemberResponse(TeamMember member) {
        User user = member.getUser();

        TeamMemberResponse.TeamMemberResponseBuilder builder = TeamMemberResponse.builder()
                .userId(user.getId())
                .username(user.getUsername())
                .name(user.getName())
                .email(user.getEmail())
                .avatar(user.getAvatar())
                .roleId(member.getRoleId())
                .joinedAt(member.getJoinedAt());

        // Add role name based on roleId (team role, not system role)
        if (member.getRoleId() != null) {
            builder.roleName(member.getRoleId());
        }

        return builder.build();
    }

    private static String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /**
     * Team statistics response DTO
     */
    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class TeamStatsResponse {
        private String teamId;
        private Long memberCount;
    }
}
