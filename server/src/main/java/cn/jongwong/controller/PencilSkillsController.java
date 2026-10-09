package cn.jongwong.controller;

import cn.jongwong.dto.ApiResponse;
import cn.jongwong.entity.PencilSkill;
import cn.jongwong.entity.PencilSkillGroup;
import cn.jongwong.exception.ApiException;
import cn.jongwong.repository.PencilSkillRepository;
import cn.jongwong.ro.SkillCatalogCategoryResponse;
import cn.jongwong.ro.SkillEntryRO;
import cn.jongwong.ro.SkillEntryResponse;
import cn.jongwong.ro.SkillEntryUpdateRO;
import cn.jongwong.ro.SkillFetchRO;
import cn.jongwong.ro.SkillGroupRO;
import cn.jongwong.ro.SkillGroupResponse;
import cn.jongwong.ro.SkillGroupTeamRO;
import cn.jongwong.ro.SkillMergeRequestRO;
import cn.jongwong.ro.SkillMergeRequestResponse;
import cn.jongwong.ro.SkillRO;
import cn.jongwong.ro.SkillResponse;
import cn.jongwong.ro.SkillShareRO;
import cn.jongwong.security.SecurityUtils;
import cn.jongwong.service.PencilSkillPackageService;
import cn.jongwong.service.PencilSkillService;
import cn.jongwong.service.PencilSkillSyncService;
import cn.jongwong.service.TeamService;
import cn.jongwong.web.dto.team.TeamResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/skills")
@RequiredArgsConstructor
public class PencilSkillsController {

    private final PencilSkillRepository pencilSkillRepository;
    private final PencilSkillService pencilSkillService;
    private final PencilSkillPackageService pencilSkillPackageService;
    private final PencilSkillSyncService pencilSkillSyncService;
    private final TeamService teamService;
    private final SecurityUtils securityUtils;

    @GetMapping("/catalog")
    public ApiResponse<List<SkillCatalogCategoryResponse>> catalog(
            @RequestParam(value = "org_id", required = false) String orgId
    ) {
        return ApiResponse.ok(pencilSkillService.catalog(requireUserId(), orgId));
    }

    @PostMapping("/groups")
    public ApiResponse<SkillGroupResponse> createGroup(
            @RequestParam(value = "org_id", required = false) String orgId,
            @Valid @RequestBody SkillGroupRO request
    ) {
        String userId = requireUserId();
        PencilSkillGroup group = pencilSkillService.createGroup(
                userId,
                request.getName(),
                request.getDescription(),
                request.getGroupKey(),
                request.getTeamIds(),
                orgId);
        return ApiResponse.ok(toGroupResponse(userId, group, orgId));
    }

    @PutMapping("/groups/{id}")
    public ApiResponse<SkillGroupResponse> updateGroup(
            @PathVariable String id,
            @RequestParam(value = "org_id", required = false) String orgId,
            @Valid @RequestBody SkillGroupRO request
    ) {
        String userId = requireUserId();
        PencilSkillGroup group = pencilSkillService.requireGroup(id);
        pencilSkillService.updateGroup(
                userId, group, request.getName(), request.getDescription(), request.getTeamIds(), orgId);
        return ApiResponse.ok(toGroupResponse(userId, group, orgId));
    }

    @PutMapping("/groups/{id}/teams")
    public ApiResponse<SkillGroupResponse> setGroupTeams(
            @PathVariable String id,
            @RequestParam(value = "org_id", required = false) String orgId,
            @RequestBody SkillGroupTeamRO request
    ) {
        String userId = requireUserId();
        PencilSkillGroup group = pencilSkillService.requireGroup(id);
        pencilSkillService.replaceTeamShares(
                group,
                userId,
                request.getTeamIds() == null ? List.of() : request.getTeamIds(),
                orgId);
        return ApiResponse.ok(toGroupResponse(userId, group, orgId));
    }

    @DeleteMapping("/groups/{id}")
    public ApiResponse<Void> deleteGroup(@PathVariable String id) {
        String userId = requireUserId();
        PencilSkillGroup group = pencilSkillService.requireGroup(id);
        if (group.getGroupKey() != null && group.getGroupKey().startsWith("tr-")) {
            throw ApiException.badRequest("Cannot delete the team remotes group");
        }
        pencilSkillService.deleteGroup(userId, group);
        return ApiResponse.ok();
    }

    @GetMapping
    public ApiResponse<List<SkillResponse>> list(
            @RequestParam(value = "group_id", required = false) String groupId,
            @RequestParam(value = "org_id", required = false) String orgId
    ) {
        String userId = requireUserId();
        if (StringUtils.hasText(groupId)) {
            PencilSkillGroup group = pencilSkillService.requireGroup(groupId);
            pencilSkillService.requireCanReadGroup(userId, group);
            return ApiResponse.ok(pencilSkillRepository
                    .findByGroupIdAndIsDeletedOrderByUpdatedAtDesc(groupId, 0)
                    .stream()
                    .filter(skill -> !skill.isTeamRemote()
                            || (group.getGroupKey() != null && group.getGroupKey().startsWith("tr-")))
                    .map(pencilSkillService::toSkillResponse)
                    .toList());
        }
        java.util.LinkedHashMap<String, SkillResponse> unique = new java.util.LinkedHashMap<>();
        for (SkillCatalogCategoryResponse category : pencilSkillService.catalog(userId, orgId)) {
            for (SkillGroupResponse group : category.getGroups()) {
                if (group.getSkills() == null) continue;
                for (SkillResponse skill : group.getSkills()) {
                    unique.put(skill.getId(), skill);
                }
            }
        }
        return ApiResponse.ok(new ArrayList<>(unique.values()));
    }

    @GetMapping("/merge-requests")
    public ApiResponse<List<SkillMergeRequestResponse>> listMergeRequests(
            @RequestParam("org_id") String orgId,
            @RequestParam(value = "status", required = false) String status
    ) {
        return ApiResponse.ok(pencilSkillSyncService.listMergeRequests(requireUserId(), orgId, status));
    }

    @PostMapping("/merge-requests/{id}/approve")
    public ApiResponse<SkillMergeRequestResponse> approveMergeRequest(
            @PathVariable String id,
            @RequestBody(required = false) SkillMergeRequestRO request
    ) {
        return ApiResponse.ok(pencilSkillSyncService.approve(
                requireUserId(),
                id,
                request == null ? null : request.getReviewNote()));
    }

    @PostMapping("/merge-requests/{id}/reject")
    public ApiResponse<SkillMergeRequestResponse> rejectMergeRequest(
            @PathVariable String id,
            @RequestBody(required = false) SkillMergeRequestRO request
    ) {
        return ApiResponse.ok(pencilSkillSyncService.reject(
                requireUserId(),
                id,
                request == null ? null : request.getReviewNote()));
    }

    @PostMapping("/merge-requests/{id}/merge")
    public ApiResponse<SkillMergeRequestResponse> mergeMergeRequest(
            @PathVariable String id,
            @RequestBody(required = false) SkillMergeRequestRO request
    ) {
        return ApiResponse.ok(pencilSkillSyncService.merge(
                requireUserId(),
                id,
                request == null ? null : request.getReviewNote()));
    }

    @PostMapping("/merge-requests/{id}/cancel")
    public ApiResponse<SkillMergeRequestResponse> cancelMergeRequest(@PathVariable String id) {
        return ApiResponse.ok(pencilSkillSyncService.cancel(requireUserId(), id));
    }

    @PostMapping("/fetch")
    public ApiResponse<SkillResponse> fetch(@Valid @RequestBody SkillFetchRO request) {
        PencilSkill skill = pencilSkillSyncService.fetchFromTeam(
                requireUserId(),
                request.getOrgId(),
                request.getTeamId(),
                request.getSkillKey(),
                request.getGroupId());
        return ApiResponse.ok(pencilSkillService.toSkillResponse(skill));
    }

    @GetMapping("/{id}")
    public ApiResponse<SkillResponse> get(@PathVariable String id) {
        String userId = requireUserId();
        PencilSkill skill = pencilSkillRepository.findByIdAndIsDeleted(id, 0)
                .orElseThrow(() -> ApiException.notFound("Skill not found"));
        requireSkillReadable(userId, skill);
        return ApiResponse.ok(pencilSkillService.toSkillResponse(skill));
    }

    @GetMapping("/{id}/tree")
    public ApiResponse<List<SkillEntryResponse>> tree(@PathVariable String id) {
        return ApiResponse.ok(pencilSkillPackageService.tree(requireUserId(), id));
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<byte[]> download(@PathVariable String id) {
        String userId = requireUserId();
        PencilSkill skill = pencilSkillRepository.findByIdAndIsDeleted(id, 0)
                .orElseThrow(() -> ApiException.notFound("Skill not found"));
        requireSkillReadable(userId, skill);
        byte[] zip = pencilSkillPackageService.exportZip(userId, id);
        String filename = skill.getSkillKey() + ".zip";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("application/zip"))
                .body(zip);
    }

    @PostMapping(value = "/{id}/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<SkillResponse> upload(
            @PathVariable String id,
            @RequestParam("file") MultipartFile file
    ) {
        String userId = requireUserId();
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("Zip file is required");
        }
        try {
            pencilSkillPackageService.importZip(userId, id, file.getInputStream());
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            throw ApiException.badRequest("Failed to import zip: " + ex.getMessage());
        }
        PencilSkill skill = pencilSkillRepository.findByIdAndIsDeleted(id, 0)
                .orElseThrow(() -> ApiException.notFound("Skill not found"));
        return ApiResponse.ok(pencilSkillService.toSkillResponse(skill));
    }

    @PostMapping("/{id}/share")
    public ApiResponse<SkillMergeRequestResponse> share(
            @PathVariable String id,
            @Valid @RequestBody SkillShareRO request
    ) {
        return ApiResponse.ok(pencilSkillSyncService.shareToTeam(
                requireUserId(),
                id,
                request.getTeamId(),
                request.getTitle(),
                request.getMessage()));
    }

    @PostMapping("/{id}/entries")
    public ApiResponse<SkillEntryResponse> createEntry(
            @PathVariable String id,
            @Valid @RequestBody SkillEntryRO request
    ) {
        return ApiResponse.ok(pencilSkillPackageService.createEntry(
                requireUserId(),
                id,
                request.getKind(),
                request.getName(),
                request.getParentId(),
                request.getContent()));
    }

    @PutMapping("/entries/{entryId}")
    public ApiResponse<SkillEntryResponse> updateEntry(
            @PathVariable String entryId,
            @RequestBody SkillEntryUpdateRO request
    ) {
        return ApiResponse.ok(pencilSkillPackageService.updateEntry(
                requireUserId(),
                entryId,
                request.getName(),
                request.getContent()));
    }

    @DeleteMapping("/entries/{entryId}")
    public ApiResponse<Void> deleteEntry(@PathVariable String entryId) {
        pencilSkillPackageService.deleteEntry(requireUserId(), entryId);
        return ApiResponse.ok();
    }

    @PostMapping
    public ApiResponse<SkillResponse> create(@Valid @RequestBody SkillRO request) {
        String userId = requireUserId();
        PencilSkillGroup group = pencilSkillService.requireGroup(request.getGroupId());
        if (group.getGroupKey() != null && group.getGroupKey().startsWith("tr-")) {
            throw ApiException.badRequest("Create personal skills in a personal group, then share to a team");
        }
        pencilSkillService.requireCanWriteGroup(userId, group);
        String orgId = StringUtils.hasText(request.getOrgId()) ? request.getOrgId().trim() : null;
        if (!StringUtils.hasText(orgId)) {
            throw ApiException.badRequest("org_id is required");
        }
        String key = PencilSkillService.sanitizeKey(request.getSkillKey());
        pencilSkillService.assertPersonalSkillKeyAvailable(orgId, userId, key, null);
        PencilSkill skill = PencilSkill.builder()
                .skillKey(key)
                .name(request.getName().trim())
                .description(request.getDescription())
                .content(request.getContent() == null ? "" : request.getContent())
                .ownerId(userId.trim())
                .groupId(group.getId())
                .orgId(orgId)
                .teamId(null)
                .isDeleted(0)
                .build();
        skill = pencilSkillRepository.save(skill);
        pencilSkillPackageService.seedPackage(skill, request.getContent());
        return ApiResponse.ok(pencilSkillService.toSkillResponse(skill));
    }

    @PutMapping("/{id}")
    public ApiResponse<SkillResponse> update(
            @PathVariable String id,
            @Valid @RequestBody SkillRO request
    ) {
        String userId = requireUserId();
        PencilSkill skill = pencilSkillRepository.findByIdAndIsDeleted(id, 0)
                .orElseThrow(() -> ApiException.notFound("Skill not found"));
        if (skill.isTeamRemote()) {
            throw ApiException.forbidden("Team remote skills are updated by merging a share request");
        }
        PencilSkillGroup currentGroup = pencilSkillService.requireGroup(skill.getGroupId());
        pencilSkillService.requireCanWriteGroup(userId, currentGroup);

        PencilSkillGroup targetGroup = currentGroup;
        if (StringUtils.hasText(request.getGroupId()) && !request.getGroupId().equals(skill.getGroupId())) {
            targetGroup = pencilSkillService.requireGroup(request.getGroupId());
            if (targetGroup.getGroupKey() != null && targetGroup.getGroupKey().startsWith("tr-")) {
                throw ApiException.badRequest("Cannot move a skill into the team remotes group");
            }
            pencilSkillService.requireCanWriteGroup(userId, targetGroup);
            skill.setGroupId(targetGroup.getId());
        }

        String previousOrg = skill.getOrgId();
        String orgId = StringUtils.hasText(request.getOrgId())
                ? request.getOrgId().trim()
                : previousOrg;
        if (!StringUtils.hasText(orgId)) {
            throw ApiException.badRequest("org_id is required");
        }
        String key = PencilSkillService.sanitizeKey(request.getSkillKey());
        if (!key.equals(skill.getSkillKey())) {
            throw ApiException.badRequest("Skill key cannot be changed after create");
        }
        skill.setOrgId(orgId);
        // Display name is immutable via this field; SKILL.md frontmatter sync updates name/desc.
        if (request.getContent() != null) {
            pencilSkillPackageService.writeSkillMd(userId, skill.getId(), request.getContent());
            skill = pencilSkillRepository.findByIdAndIsDeleted(skill.getId(), 0)
                    .orElse(skill);
        } else if (request.getDescription() != null) {
            skill.setDescription(request.getDescription());
        }
        return ApiResponse.ok(pencilSkillService.toSkillResponse(pencilSkillRepository.save(skill)));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable String id) {
        String userId = requireUserId();
        PencilSkill skill = pencilSkillRepository.findByIdAndIsDeleted(id, 0)
                .orElseThrow(() -> ApiException.notFound("Skill not found"));
        if (skill.isTeamRemote()) {
            pencilSkillService.requireTeamMember(userId, skill.getTeamId());
            // Only team owner can delete remotes for now
            TeamResponse team = teamService.getTeamById(skill.getTeamId());
            if (!userId.trim().equals(team.getOwnerId() == null ? "" : team.getOwnerId().trim())) {
                throw ApiException.forbidden("Only the team owner can delete a team remote skill");
            }
        } else {
            PencilSkillGroup group = pencilSkillService.requireGroup(skill.getGroupId());
            pencilSkillService.requireCanWriteGroup(userId, group);
        }
        skill.softDelete();
        pencilSkillRepository.save(skill);
        return ApiResponse.ok();
    }

    private void requireSkillReadable(String userId, PencilSkill skill) {
        if (skill.isTeamRemote()) {
            pencilSkillService.requireTeamMember(userId, skill.getTeamId());
            return;
        }
        PencilSkillGroup group = pencilSkillService.requireGroup(skill.getGroupId());
        pencilSkillService.requireCanReadGroup(userId, group);
    }

    private SkillGroupResponse toGroupResponse(String userId, PencilSkillGroup group, String orgId) {
        Set<String> orgTeamIds = teamService.getUserTeams(userId, orgId).stream()
                .map(TeamResponse::getId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        List<String> teamIds = pencilSkillService.teamIdsForGroup(group.getId()).stream()
                .filter(orgTeamIds::contains)
                .toList();
        return pencilSkillService.toGroupResponse(group, userId, teamIds, true);
    }

    private String requireUserId() {
        String userId = securityUtils.getCurrentUserId();
        if (!StringUtils.hasText(userId)) {
            throw ApiException.unauthorized("Authentication required");
        }
        return userId.trim();
    }
}
