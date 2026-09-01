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
        List<Team> ownedTeams = teamRepository.findByOwnerId(userId);
        List<Team> memberTeams = teamRepository.findByMemberId(userId);

        // Merge and deduplicate
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
                .map(this::toTeamResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get paginated teams with optional search
     */
    @Transactional(readOnly = true)
    public Page<TeamResponse> getTeams(String search, Pageable pageable) {
        return teamRepository.findBySearch(search, pageable)
                .map(this::toTeamResponse);
    }

    /**
     * Get team by ID with full details
     */
    @Transactional(readOnly = true)
    public TeamResponse getTeamById(String id) {
        Team team = teamRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Team not found with id: " + id));
        return toTeamResponseWithMembers(team);
    }

    /**
     * Create a new team
     */
    @Transactional
    public TeamResponse createTeam(String ownerId, CreateTeamRequest request) {
        // Validate owner exists
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new RuntimeException("Owner not found with id: " + ownerId));

        // Check if team name already exists
        if (teamRepository.existsByName(request.getName())) {
            throw new RuntimeException("Team with name '" + request.getName() + "' already exists");
        }

        // Create team
        Team team = Team.builder()
                .name(request.getName())
                .description(request.getDescription())
                .avatar(request.getAvatar())
                .ownerId(ownerId)
                .build();

        team = teamRepository.save(team);
        log.info("Created team: {} by owner: {}", team.getId(), ownerId);

        // Add initial members if provided
        if (request.getMemberIds() != null && !request.getMemberIds().isEmpty()) {
            for (String memberId : request.getMemberIds()) {
                // Skip owner as they are already implicit
                if (!memberId.equals(ownerId)) {
                    addTeamMember(team, memberId, null);
                }
            }
        }

        return toTeamResponseWithMembers(teamRepository.findById(team.getId()).orElseThrow());
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
            // Check if new name conflicts with existing teams (excluding current team)
            if (!request.getName().equals(team.getName()) &&
                teamRepository.existsByName(request.getName())) {
                throw new RuntimeException("Team with name '" + request.getName() + "' already exists");
            }
            team.setName(request.getName());
        }
        if (request.getDescription() != null) {
            team.setDescription(request.getDescription());
        }
        if (request.getAvatar() != null) {
            team.setAvatar(request.getAvatar());
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

        // Verify user is owner
        if (!team.getOwnerId().equals(userId)) {
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
                .memberCount(memberCount + 1) // +1 for owner
                .build();
    }

    /**
     * Helper method to add a team member
     */
    private void addTeamMember(Team team, String userId, String roleId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

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

        // Add member count
        long memberCount = teamMemberRepository.countByIdTeamId(team.getId());
        builder.memberCount(memberCount + 1); // +1 for owner

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
