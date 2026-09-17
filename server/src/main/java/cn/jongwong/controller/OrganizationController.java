package cn.jongwong.controller;

import cn.jongwong.domain.entity.User;
import cn.jongwong.dto.ApiResponse;
import cn.jongwong.exception.ApiException;
import cn.jongwong.security.SecurityUtils;
import cn.jongwong.service.OrganizationService;
import cn.jongwong.web.dto.org.CreateOrganizationRequest;
import cn.jongwong.web.dto.org.OrganizationResponse;
import cn.jongwong.web.dto.org.TransferOrganizationRequest;
import cn.jongwong.web.dto.org.UpdateOrganizationRequest;
import cn.jongwong.web.dto.team.TeamResponse;
import cn.jongwong.service.TeamService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@Tag(name = "Organizations")
@RestController
@RequestMapping("/api/orgs")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class OrganizationController {

    private final OrganizationService organizationService;
    private final TeamService teamService;
    private final SecurityUtils securityUtils;

    @GetMapping("/mine")
    public ApiResponse<List<OrganizationResponse>> mine(@AuthenticationPrincipal User user) {
        return ApiResponse.ok(organizationService.myOrganizations(resolveUserId(user)));
    }

    @PostMapping
    public ApiResponse<OrganizationResponse> create(
            @AuthenticationPrincipal User user, @Valid @RequestBody CreateOrganizationRequest request) {
        return ApiResponse.ok("Organization created", organizationService.create(resolveUserId(user), request));
    }

    @GetMapping("/{id}")
    public ApiResponse<OrganizationResponse> get(
            @AuthenticationPrincipal User user, @PathVariable String id) {
        return ApiResponse.ok(organizationService.get(id, resolveUserId(user)));
    }

    @PutMapping("/{id}")
    public ApiResponse<OrganizationResponse> update(
            @AuthenticationPrincipal User user,
            @PathVariable String id,
            @Valid @RequestBody UpdateOrganizationRequest request) {
        return ApiResponse.ok(organizationService.update(id, resolveUserId(user), request));
    }

    @PostMapping("/{id}/transfer")
    public ApiResponse<OrganizationResponse> transfer(
            @AuthenticationPrincipal User user,
            @PathVariable String id,
            @Valid @RequestBody TransferOrganizationRequest request) {
        return ApiResponse.ok(organizationService.transfer(id, resolveUserId(user), request));
    }

    @GetMapping("/{id}/teams")
    public ApiResponse<List<TeamResponse>> teams(
            @AuthenticationPrincipal User user, @PathVariable String id) {
        String userId = resolveUserId(user);
        organizationService.requireMemberOrAdmin(organizationService.requireOrg(id), userId);
        return ApiResponse.ok(teamService.getUserTeams(userId, id));
    }

    @GetMapping("/admin")
    public ApiResponse<List<OrganizationResponse>> adminList(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) String search,
            @RequestParam(value = "created_from", required = false)
                    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
                    Instant createdFrom,
            @RequestParam(value = "created_to", required = false)
                    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
                    Instant createdTo,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
                    Pageable pageable) {
        Page<OrganizationResponse> page = organizationService.adminList(
                search, createdFrom, createdTo, resolveUserId(user), pageable);
        return ApiResponse.ok(page.getContent(), page.getTotalElements());
    }

    @PutMapping("/admin/{id}")
    public ApiResponse<OrganizationResponse> adminUpdate(
            @AuthenticationPrincipal User user,
            @PathVariable String id,
            @Valid @RequestBody UpdateOrganizationRequest request) {
        return ApiResponse.ok(organizationService.adminUpdate(id, resolveUserId(user), request));
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
