package cn.jongwong.controller;

import cn.jongwong.domain.entity.User;
import cn.jongwong.dto.ApiResponse;
import cn.jongwong.exception.ApiException;
import cn.jongwong.security.SecurityUtils;
import cn.jongwong.service.TeamService;
import cn.jongwong.web.dto.team.AddMemberRequest;
import cn.jongwong.web.dto.team.CreateTeamRequest;
import cn.jongwong.web.dto.team.TeamResponse;
import cn.jongwong.web.dto.team.UpdateMemberRoleRequest;
import cn.jongwong.web.dto.team.UpdateTeamRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Teams", description = "Team management API endpoints")
@RestController
@RequestMapping("/api/teams")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class TeamController {

    private final TeamService teamService;
    private final SecurityUtils securityUtils;

    @Operation(
            summary = "Get user teams",
            description = "Retrieve all teams that the user owns or is a member of"
    )
    @GetMapping("/my-teams")
    public ApiResponse<List<TeamResponse>> getUserTeams(
            @AuthenticationPrincipal User user,
            @RequestParam(value = "org_id", required = false) String orgId
    ) {
        List<TeamResponse> teams = teamService.getUserTeams(resolveUserId(user), orgId);
        return ApiResponse.ok(teams);
    }

    @Operation(
            summary = "Get teams with pagination",
            description = "Retrieve paginated list of teams with optional search"
    )
    @GetMapping
    public ApiResponse<Page<TeamResponse>> getTeams(
            @Parameter(description = "Search term for team name or description")
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Page<TeamResponse> teams = teamService.getTeams(search, pageable);
        return ApiResponse.ok(teams);
    }

    @Operation(
            summary = "Get team by ID",
            description = "Retrieve detailed information about a specific team including its members"
    )
    @GetMapping("/{id}")
    public ApiResponse<TeamResponse> getTeamById(
            @Parameter(description = "Team ID") @PathVariable String id
    ) {
        TeamResponse team = teamService.getTeamById(id);
        return ApiResponse.ok(team);
    }

    @Operation(
            summary = "Create team",
            description = "Create a new team. The authenticated user will be the team owner."
    )
    @PostMapping
    public ApiResponse<TeamResponse> createTeam(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateTeamRequest request
    ) {
        TeamResponse team = teamService.createTeam(resolveUserId(user), request);
        return ApiResponse.ok("Team created successfully", team);
    }

    @Operation(
            summary = "Update team",
            description = "Update team information. Only the team owner can update the team."
    )
    @PutMapping("/{id}")
    public ApiResponse<TeamResponse> updateTeam(
            @Parameter(description = "Team ID") @PathVariable String id,
            @AuthenticationPrincipal User user,
            @Valid @RequestBody UpdateTeamRequest request
    ) {
        TeamResponse team = teamService.updateTeam(id, resolveUserId(user), request);
        return ApiResponse.ok("Team updated successfully", team);
    }

    @Operation(
            summary = "Delete team",
            description = "Delete a team. Only the team owner can delete the team."
    )
    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteTeam(
            @Parameter(description = "Team ID") @PathVariable String id,
            @AuthenticationPrincipal User user
    ) {
        teamService.deleteTeam(id, resolveUserId(user));
        return ApiResponse.ok("Team deleted successfully", null);
    }

    @Operation(
            summary = "Add team member",
            description = "Add a user to the team. Only the team owner can add members."
    )
    @PostMapping("/{id}/members")
    public ApiResponse<TeamResponse> addMember(
            @Parameter(description = "Team ID") @PathVariable String id,
            @AuthenticationPrincipal User user,
            @Valid @RequestBody AddMemberRequest request
    ) {
        TeamResponse team = teamService.addMember(id, resolveUserId(user), request);
        return ApiResponse.ok(team);
    }

    @Operation(
            summary = "Remove team member",
            description = "Remove a user from the team. Only the team owner can remove members."
    )
    @DeleteMapping("/{id}/members/{userId}")
    public ApiResponse<TeamResponse> removeMember(
            @Parameter(description = "Team ID") @PathVariable String id,
            @Parameter(description = "User ID to remove") @PathVariable String userId,
            @AuthenticationPrincipal User user
    ) {
        TeamResponse team = teamService.removeMember(id, resolveUserId(user), userId);
        return ApiResponse.ok("Member removed successfully", team);
    }

    @Operation(
            summary = "Update member role",
            description = "Update a team member's role. Only the team owner can update member roles."
    )
    @PutMapping("/{id}/members/{userId}/role")
    public ApiResponse<TeamResponse> updateMemberRole(
            @Parameter(description = "Team ID") @PathVariable String id,
            @Parameter(description = "User ID") @PathVariable String userId,
            @AuthenticationPrincipal User user,
            @Valid @RequestBody UpdateMemberRoleRequest request
    ) {
        TeamResponse team = teamService.updateMemberRole(id, resolveUserId(user), userId, request);
        return ApiResponse.ok("Member role updated successfully", team);
    }

    @Operation(
            summary = "Get team statistics",
            description = "Retrieve statistics for a specific team"
    )
    @GetMapping("/{id}/stats")
    public ApiResponse<TeamService.TeamStatsResponse> getTeamStats(
            @Parameter(description = "Team ID") @PathVariable String id
    ) {
        TeamService.TeamStatsResponse stats = teamService.getTeamStats(id);
        return ApiResponse.ok("Team statistics retrieved successfully", stats);
    }

    private String resolveUserId(User user) {
        if (user != null && StringUtils.hasText(user.getId())) {
            return user.getId();
        }
        String userId = securityUtils.getCurrentUserId();
        if (!StringUtils.hasText(userId)) {
            throw ApiException.unauthorized("Authentication required");
        }
        return userId;
    }
}
