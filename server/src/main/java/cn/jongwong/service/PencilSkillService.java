package cn.jongwong.service;

import cn.jongwong.common.ConvertUtils;
import cn.jongwong.entity.PencilSkill;
import cn.jongwong.entity.PencilSkillGroup;
import cn.jongwong.entity.PencilSkillGroupTeam;
import cn.jongwong.exception.ApiException;
import cn.jongwong.repository.PencilSkillGroupRepository;
import cn.jongwong.repository.PencilSkillGroupTeamRepository;
import cn.jongwong.repository.PencilSkillRepository;
import cn.jongwong.ro.SkillCatalogCategoryResponse;
import cn.jongwong.ro.SkillGroupResponse;
import cn.jongwong.ro.SkillResponse;
import cn.jongwong.web.dto.team.TeamResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PencilSkillService {

    private final PencilSkillRepository skillRepository;
    private final PencilSkillGroupRepository groupRepository;
    private final PencilSkillGroupTeamRepository groupTeamRepository;
    private final TeamService teamService;

    @Transactional(readOnly = true)
    public List<SkillCatalogCategoryResponse> catalog(String userId) {
        return catalog(userId, null);
    }

    /**
     * @param orgId when set, only teams under that organization appear (plus personal groups)
     */
    @Transactional(readOnly = true)
    public List<SkillCatalogCategoryResponse> catalog(String userId, String orgId) {
        String uid = userId.trim();
        // Without an org filter, only personal groups are listed (no cross-org teams).
        String org = StringUtils.hasText(orgId) ? orgId.trim() : null;
        List<TeamResponse> teams = org == null ? List.of() : teamService.getUserTeams(uid, org);
        Map<String, String> teamNames = teams.stream()
                .collect(Collectors.toMap(TeamResponse::getId, TeamResponse::getName, (a, b) -> a, LinkedHashMap::new));
        Set<String> myTeamIds = new LinkedHashSet<>(teamNames.keySet());

        List<PencilSkillGroup> owned = groupRepository
                .findByOwnerIdAndIsDeletedOrderBySortOrderAscUpdatedAtDesc(uid, 0)
                .stream()
                // Team remotes groups are listed under the team category, not Personal.
                .filter(group -> group.getGroupKey() == null || !group.getGroupKey().startsWith("tr-"))
                .toList();

        List<PencilSkillGroupTeam> shares = myTeamIds.isEmpty()
                ? List.of()
                : groupTeamRepository.findByTeamIdIn(myTeamIds);
        Set<String> sharedGroupIds = shares.stream()
                .map(PencilSkillGroupTeam::getGroupId)
                .map(String::trim)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        // Exclude groups I already own from the shared lookup set for loading, but still show under teams.
        List<PencilSkillGroup> sharedGroups = sharedGroupIds.isEmpty()
                ? List.of()
                : groupRepository.findByIdInAndIsDeleted(sharedGroupIds, 0);

        Map<String, PencilSkillGroup> groupById = new LinkedHashMap<>();
        for (PencilSkillGroup group : owned) groupById.put(group.getId(), group);
        for (PencilSkillGroup group : sharedGroups) groupById.putIfAbsent(group.getId(), group);

        Map<String, List<String>> teamsByGroup = new LinkedHashMap<>();
        for (PencilSkillGroupTeam share : groupTeamRepository.findByGroupIdIn(groupById.keySet())) {
            String teamId = share.getTeamId().trim();
            // Only surface shares for teams in the current org filter.
            if (!myTeamIds.contains(teamId)) continue;
            teamsByGroup
                    .computeIfAbsent(share.getGroupId().trim(), key -> new ArrayList<>())
                    .add(teamId);
        }

        List<SkillCatalogCategoryResponse> categories = new ArrayList<>();
        categories.add(SkillCatalogCategoryResponse.builder()
                .kind("personal")
                .groups(owned.stream()
                        .map(group -> toGroupResponse(group, uid, teamsByGroup.getOrDefault(group.getId(), List.of()), true))
                        .toList())
                .build());

        Map<String, List<PencilSkillGroup>> groupsByTeam = new LinkedHashMap<>();
        for (String teamId : myTeamIds) groupsByTeam.put(teamId, new ArrayList<>());
        for (PencilSkillGroupTeam share : shares) {
            PencilSkillGroup group = groupById.get(share.getGroupId().trim());
            if (group == null) continue;
            List<PencilSkillGroup> bucket = groupsByTeam.get(share.getTeamId().trim());
            if (bucket != null) bucket.add(group);
        }
        for (Map.Entry<String, List<PencilSkillGroup>> entry : groupsByTeam.entrySet()) {
            // Deduplicate while preserving order
            Map<String, PencilSkillGroup> unique = new LinkedHashMap<>();
            for (PencilSkillGroup group : entry.getValue()) unique.put(group.getId(), group);
            String teamId = entry.getKey();
            List<SkillGroupResponse> groupResponses = unique.values().stream()
                    .map(group -> toGroupResponse(
                            group,
                            uid,
                            teamsByGroup.getOrDefault(group.getId(), List.of()),
                            true))
                    .collect(Collectors.toCollection(ArrayList::new));
            // Team remotes (git-like) appear as a dedicated group under the team.
            if (org != null) {
                List<SkillResponse> remotes = skillRepository
                        .findByOrgIdAndTeamIdAndIsDeletedOrderByUpdatedAtDesc(org, teamId, 0)
                        .stream()
                        .map(this::toSkillResponse)
                        .toList();
                if (!remotes.isEmpty()) {
                    PencilSkillGroup remotesGroup = findTeamRemoteGroup(teamId).orElse(null);
                    if (remotesGroup != null) {
                        groupResponses.add(toGroupResponse(remotesGroup, uid, List.of(teamId), true));
                    } else {
                        groupResponses.add(SkillGroupResponse.builder()
                                .id("__team_remotes__:" + teamId)
                                .groupKey(teamRemoteGroupKey(teamId))
                                .name("Team remotes")
                                .description("Skills shared to this team (read-only; fetch to edit)")
                                .ownerId(null)
                                .ownedByMe(false)
                                .sortOrder(1000)
                                .skillCount((long) remotes.size())
                                .teamIds(List.of(teamId))
                                .skills(remotes)
                                .build());
                    }
                }
            }
            categories.add(SkillCatalogCategoryResponse.builder()
                    .kind("team")
                    .teamId(teamId)
                    .teamName(teamNames.get(teamId))
                    .groups(groupResponses)
                    .build());
        }
        return categories;
    }

    /**
     * Ensure a backing group for team remote skills. Owned by the team owner (or actor fallback).
     */
    @Transactional
    public PencilSkillGroup ensureTeamRemoteGroup(String actorUserId, String orgId, String teamId) {
        return findTeamRemoteGroup(teamId).orElseGet(() -> {
            TeamResponse team = teamService.getTeamById(teamId.trim());
            String ownerId = StringUtils.hasText(team.getOwnerId())
                    ? team.getOwnerId().trim()
                    : actorUserId.trim();
            String key = teamRemoteGroupKey(teamId);
            return groupRepository.findByOwnerIdAndGroupKeyAndIsDeleted(ownerId, key, 0)
                    .orElseGet(() -> groupRepository.save(PencilSkillGroup.builder()
                            .groupKey(key)
                            .name("Team remotes")
                            .description("Skills shared to this team")
                            .ownerId(ownerId)
                            .sortOrder(1000)
                            .isDeleted(0)
                            .build()));
        });
    }

    public java.util.Optional<PencilSkillGroup> findTeamRemoteGroup(String teamId) {
        String tid = teamId == null ? "" : teamId.trim();
        if (!StringUtils.hasText(tid)) return java.util.Optional.empty();
        try {
            TeamResponse team = teamService.getTeamById(tid);
            String ownerId = trim(team.getOwnerId());
            if (StringUtils.hasText(ownerId)) {
                java.util.Optional<PencilSkillGroup> byOwner = groupRepository
                        .findByOwnerIdAndGroupKeyAndIsDeleted(ownerId, teamRemoteGroupKey(tid), 0);
                if (byOwner.isPresent()) return byOwner;
            }
        } catch (RuntimeException ignored) {
            // fall through to skill-backed lookup
        }
        return skillRepository.findByTeamIdAndIsDeletedOrderByUpdatedAtDesc(tid, 0).stream()
                .findFirst()
                .flatMap(skill -> groupRepository.findByIdAndIsDeleted(skill.getGroupId(), 0));
    }

    public static String teamRemoteGroupKey(String teamId) {
        String compact = teamId == null ? "" : teamId.trim().replace("-", "").toLowerCase(Locale.ROOT);
        String key = "tr-" + compact;
        return key.length() > 64 ? key.substring(0, 64) : key;
    }

    public void requireTeamMember(String userId, String teamId) {
        String tid = teamId == null ? "" : teamId.trim();
        if (!StringUtils.hasText(tid)) throw ApiException.badRequest("team_id is required");
        boolean member = teamService.getUserTeams(userId.trim()).stream()
                .anyMatch(team -> tid.equals(team.getId()));
        if (!member) throw ApiException.forbidden("Not a member of this team");
    }

    /** Personal skill keys are unique per (org, owner) when team_id is null. */
    public void assertPersonalSkillKeyAvailable(
            String orgId,
            String ownerId,
            String skillKey,
            String excludeSkillId
    ) {
        String org = requireOrg(orgId);
        String key = sanitizeKey(skillKey);
        skillRepository
                .findByOrgIdAndOwnerIdAndSkillKeyAndTeamIdIsNullAndIsDeleted(org, ownerId.trim(), key, 0)
                .ifPresent(existing -> {
                    if (excludeSkillId == null || !existing.getId().equals(excludeSkillId)) {
                        throw ApiException.badRequest("Skill key already exists in this organization");
                    }
                });
    }

    public void assertTeamSkillKeyAvailable(
            String orgId,
            String teamId,
            String skillKey,
            String excludeSkillId
    ) {
        String org = requireOrg(orgId);
        String key = sanitizeKey(skillKey);
        skillRepository
                .findByOrgIdAndTeamIdAndSkillKeyAndIsDeleted(org, teamId.trim(), key, 0)
                .ifPresent(existing -> {
                    if (excludeSkillId == null || !existing.getId().equals(excludeSkillId)) {
                        throw ApiException.badRequest("Skill key already exists for this team");
                    }
                });
    }

    private static String requireOrg(String orgId) {
        if (!StringUtils.hasText(orgId)) {
            throw ApiException.badRequest("org_id is required for skill key uniqueness");
        }
        return orgId.trim();
    }

    @Transactional
    public PencilSkillGroup createGroup(
            String userId,
            String name,
            String description,
            String groupKey,
            List<String> teamIds,
            String orgId
    ) {
        String uid = userId.trim();
        String key = sanitizeKey(StringUtils.hasText(groupKey) ? groupKey : name);
        groupRepository.findByOwnerIdAndGroupKeyAndIsDeleted(uid, key, 0).ifPresent(existing -> {
            throw ApiException.badRequest("Group key already exists");
        });
        PencilSkillGroup group = groupRepository.save(PencilSkillGroup.builder()
                .groupKey(key)
                .name(name.trim())
                .description(description)
                .ownerId(uid)
                .sortOrder(0)
                .isDeleted(0)
                .build());
        replaceTeamShares(group, uid, teamIds, orgId);
        return group;
    }

    @Transactional
    public PencilSkillGroup updateGroup(
            String userId,
            PencilSkillGroup group,
            String name,
            String description,
            List<String> teamIds,
            String orgId
    ) {
        requireOwner(userId, group);
        if (StringUtils.hasText(name)) group.setName(name.trim());
        group.setDescription(description);
        groupRepository.save(group);
        if (teamIds != null) replaceTeamShares(group, userId.trim(), teamIds, orgId);
        return group;
    }

    @Transactional
    public void deleteGroup(String userId, PencilSkillGroup group) {
        requireOwner(userId, group);
        for (PencilSkill skill : skillRepository.findByGroupIdAndIsDeletedOrderByUpdatedAtDesc(group.getId(), 0)) {
            skill.softDelete();
            skillRepository.save(skill);
        }
        groupTeamRepository.deleteByGroupId(group.getId());
        group.softDelete();
        groupRepository.save(group);
    }

    @Transactional
    public void replaceTeamShares(PencilSkillGroup group, String userId, List<String> teamIds) {
        replaceTeamShares(group, userId, teamIds, null);
    }

    /**
     * When {@code orgId} is set, only create/remove shares for teams in that organization;
     * shares to teams in other orgs are left unchanged.
     */
    @Transactional
    public void replaceTeamShares(
            PencilSkillGroup group,
            String userId,
            List<String> teamIds,
            String orgId
    ) {
        requireOwner(userId, group);
        String org = StringUtils.hasText(orgId) ? orgId.trim() : null;
        Set<String> orgTeamIds = teamService.getUserTeams(userId.trim(), org).stream()
                .map(TeamResponse::getId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        Set<String> desired = normalizeTeamIds(userId, teamIds, org);
        List<PencilSkillGroupTeam> existing = groupTeamRepository.findByGroupId(group.getId());
        Set<String> current = existing.stream()
                .map(share -> share.getTeamId().trim())
                .collect(Collectors.toCollection(LinkedHashSet::new));
        for (PencilSkillGroupTeam share : existing) {
            String teamId = share.getTeamId().trim();
            // Only touch shares that belong to the scoped org's teams.
            if (!orgTeamIds.contains(teamId)) continue;
            if (!desired.contains(teamId)) {
                groupTeamRepository.delete(share);
            }
        }
        for (String teamId : desired) {
            if (current.contains(teamId)) continue;
            groupTeamRepository.save(PencilSkillGroupTeam.builder()
                    .groupId(group.getId())
                    .teamId(teamId)
                    .createdBy(userId.trim())
                    .build());
        }
    }

    public PencilSkillGroup requireGroup(String groupId) {
        return groupRepository.findByIdAndIsDeleted(groupId, 0)
                .orElseThrow(() -> ApiException.notFound("Skill group not found"));
    }

    public void requireCanReadGroup(String userId, PencilSkillGroup group) {
        String uid = userId.trim();
        if (uid.equals(trim(group.getOwnerId()))) return;
        // Team remotes group: any member of a team that owns remotes in this group.
        if (group.getGroupKey() != null && group.getGroupKey().startsWith("tr-")) {
            boolean teamMember = skillRepository
                    .findByGroupIdAndIsDeletedOrderByUpdatedAtDesc(group.getId(), 0)
                    .stream()
                    .filter(PencilSkill::isTeamRemote)
                    .map(PencilSkill::getTeamId)
                    .anyMatch(teamId -> {
                        try {
                            requireTeamMember(uid, teamId);
                            return true;
                        } catch (ApiException ex) {
                            return false;
                        }
                    });
            if (teamMember) return;
        }
        List<String> myTeamIds = teamService.getUserTeams(uid).stream().map(TeamResponse::getId).toList();
        if (myTeamIds.isEmpty()) throw ApiException.forbidden("Cannot access this skill group");
        boolean shared = groupTeamRepository.findByTeamIdIn(myTeamIds).stream()
                .anyMatch(share -> group.getId().equals(share.getGroupId().trim()));
        if (!shared) throw ApiException.forbidden("Cannot access this skill group");
    }

    public void requireCanWriteGroup(String userId, PencilSkillGroup group) {
        // Owner always; team members with a share can edit skills in the group.
        requireCanReadGroup(userId, group);
    }

    public void requireOwner(String userId, PencilSkillGroup group) {
        if (!userId.trim().equals(trim(group.getOwnerId()))) {
            throw ApiException.forbidden("Only the group owner can manage this group");
        }
    }

    public SkillResponse toSkillResponse(PencilSkill skill) {
        SkillResponse response = ConvertUtils.convert(skill, SkillResponse.class);
        response.setSkillKey(skill.getSkillKey());
        response.setGroupId(skill.getGroupId());
        response.setOrgId(skill.getOrgId());
        response.setTeamId(skill.getTeamId());
        return response;
    }

    public SkillGroupResponse toGroupResponse(
            PencilSkillGroup group,
            String userId,
            List<String> teamIds,
            boolean includeSkills
    ) {
        boolean remotesGroup = group.getGroupKey() != null && group.getGroupKey().startsWith("tr-");
        List<PencilSkill> skills = includeSkills
                ? skillRepository.findByGroupIdAndIsDeletedOrderByUpdatedAtDesc(group.getId(), 0)
                : List.of();
        if (includeSkills && remotesGroup) {
            skills = skills.stream().filter(PencilSkill::isTeamRemote).toList();
        } else if (includeSkills) {
            skills = skills.stream().filter(skill -> !skill.isTeamRemote()).toList();
        }
        SkillGroupResponse response = SkillGroupResponse.builder()
                .id(group.getId())
                .groupKey(group.getGroupKey())
                .name(group.getName())
                .description(group.getDescription())
                .ownerId(group.getOwnerId())
                .ownedByMe(userId.trim().equals(trim(group.getOwnerId())))
                .sortOrder(group.getSortOrder())
                .createdAt(group.getCreatedAt())
                .updatedAt(group.getUpdatedAt())
                .skillCount((long) skills.size())
                .teamIds(teamIds == null ? List.of() : teamIds)
                .build();
        if (includeSkills) {
            response.setSkills(skills.stream().map(this::toSkillResponse).toList());
        }
        return response;
    }

    public List<String> teamIdsForGroup(String groupId) {
        return groupTeamRepository.findByGroupId(groupId).stream()
                .map(share -> share.getTeamId().trim())
                .toList();
    }

    public static String sanitizeKey(String raw) {
        String key = raw == null ? "" : raw.trim().toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9-]+", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
        if (!StringUtils.hasText(key)) throw ApiException.badRequest("key is required");
        if (key.length() > 64) throw ApiException.badRequest("key is too long");
        return key;
    }

    private Set<String> normalizeTeamIds(String userId, List<String> teamIds, String orgId) {
        if (teamIds == null || teamIds.isEmpty()) return Set.of();
        Set<String> mine = teamService.getUserTeams(userId, orgId).stream()
                .map(TeamResponse::getId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        Set<String> desired = new LinkedHashSet<>();
        for (String teamId : teamIds) {
            if (!StringUtils.hasText(teamId)) continue;
            String trimmed = teamId.trim();
            if (!mine.contains(trimmed)) {
                throw ApiException.forbidden("Not a member of team " + trimmed);
            }
            desired.add(trimmed);
        }
        return desired;
    }

    private static String trim(String value) {
        return value == null ? "" : value.trim();
    }
}
