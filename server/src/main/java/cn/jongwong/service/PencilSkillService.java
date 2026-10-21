package cn.jongwong.service;

import cn.jongwong.common.ConvertUtils;
import cn.jongwong.entity.PencilSkill;
import cn.jongwong.entity.PencilSkillGroup;
import cn.jongwong.entity.PencilSkillGroupManager;
import cn.jongwong.entity.PencilSkillGroupTeam;
import cn.jongwong.exception.ApiException;
import cn.jongwong.repository.PencilSkillGroupManagerRepository;
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
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PencilSkillService {

    private final PencilSkillRepository skillRepository;
    private final PencilSkillGroupRepository groupRepository;
    private final PencilSkillGroupTeamRepository groupTeamRepository;
    private final PencilSkillGroupManagerRepository groupManagerRepository;
    private final TeamService teamService;
    private final UserService userService;

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
        // Shared (bound) groups appear in the flat skill-groups list, not under teams.
        List<PencilSkillGroup> sharedGroups = sharedGroupIds.isEmpty()
                ? List.of()
                : groupRepository.findByIdInAndIsDeleted(sharedGroupIds, 0);

        Map<String, PencilSkillGroup> groupById = new LinkedHashMap<>();
        for (PencilSkillGroup group : owned) groupById.put(group.getId(), group);
        for (PencilSkillGroup group : sharedGroups) groupById.putIfAbsent(group.getId(), group);

        Map<String, List<String>> teamsByGroup = new LinkedHashMap<>();
        for (PencilSkillGroupTeam share : groupTeamRepository.findByGroupIdIn(groupById.keySet())) {
            String teamId = share.getTeamId().trim();
            teamsByGroup
                    .computeIfAbsent(share.getGroupId().trim(), key -> new ArrayList<>())
                    .add(teamId);
        }

        // Skill groups live in one flat list (owned + bound-to-my-teams).
        // Teams never nest skill groups — only optional "Team remotes" under each team.
        Map<String, PencilSkillGroup> skillGroups = new LinkedHashMap<>();
        for (PencilSkillGroup group : owned) skillGroups.put(group.getId(), group);
        for (PencilSkillGroup group : sharedGroups) {
            if (group.getGroupKey() != null && group.getGroupKey().startsWith("tr-")) continue;
            skillGroups.putIfAbsent(group.getId(), group);
        }

        List<SkillCatalogCategoryResponse> categories = new ArrayList<>();
        categories.add(SkillCatalogCategoryResponse.builder()
                .kind("personal")
                .groups(skillGroups.values().stream()
                        .map(group -> toGroupResponse(
                                group,
                                uid,
                                teamsByGroup.getOrDefault(group.getId(), List.of()),
                                true))
                        .toList())
                .build());

        for (String teamId : myTeamIds) {
            List<SkillGroupResponse> groupResponses = new ArrayList<>();
            // Team remotes only — bound skill groups are not listed under the team.
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
            if (groupResponses.isEmpty()) continue;
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
                    .orElseGet(() -> {
                        PencilSkillGroup created = groupRepository.save(PencilSkillGroup.builder()
                                .groupKey(key)
                                .name("Team remotes")
                                .description("Skills shared to this team")
                                .ownerId(ownerId)
                                .orgId(StringUtils.hasText(orgId) ? orgId.trim() : null)
                                .sortOrder(1000)
                                .isDeleted(0)
                                .build());
                        groupManagerRepository.save(PencilSkillGroupManager.builder()
                                .groupId(created.getId())
                                .userId(ownerId)
                                .build());
                        return created;
                    });
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

    /** Internal opaque key (not user-facing). Team remotes keep the `tr-` prefix. */
    private static String newInternalGroupKey() {
        String compact = UUID.randomUUID().toString().replace("-", "").toLowerCase(Locale.ROOT);
        return "g-" + compact;
    }

    @Transactional
    public PencilSkillGroup createGroup(
            String userId,
            String name,
            String description,
            List<String> teamIds,
            String orgId
    ) {
        String uid = userId.trim();
        // Same rules as skill names: letters / digits / `-` only.
        String groupName = sanitizeKey(name);
        String org = StringUtils.hasText(orgId) ? orgId.trim() : null;
        if (!StringUtils.hasText(org)) {
            throw ApiException.badRequest("org_id is required");
        }
        teamService.requireOrgMember(org, uid);
        // Internal key only — clients create groups by display name.
        PencilSkillGroup group = groupRepository.save(PencilSkillGroup.builder()
                .groupKey(newInternalGroupKey())
                .name(groupName)
                .description(description)
                .ownerId(uid)
                .orgId(org)
                .sortOrder(0)
                .isDeleted(0)
                .build());
        // Creator is the first manager; at least one manager is always required.
        groupManagerRepository.save(PencilSkillGroupManager.builder()
                .groupId(group.getId())
                .userId(uid)
                .build());
        if (teamIds != null) replaceTeamShares(group, uid, teamIds, org);
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
        requireManageGroup(userId, group);
        if (group.getGroupKey() != null && group.getGroupKey().startsWith("tr-")) {
            throw ApiException.badRequest("Cannot rename the team remotes group");
        }
        if (StringUtils.hasText(name)) {
            String nextName = sanitizeKey(name);
            // Rename must stay unique under currently bound teams.
            requireUniqueNameUnderTeams(nextName, teamIdsForGroup(group.getId()), group.getId());
            group.setName(nextName);
        }
        if (description != null) group.setDescription(description);
        String org = StringUtils.hasText(orgId)
                ? orgId.trim()
                : (StringUtils.hasText(group.getOrgId()) ? group.getOrgId().trim() : null);
        if (org != null && !StringUtils.hasText(group.getOrgId())) {
            group.setOrgId(org);
        }
        groupRepository.save(group);
        if (teamIds != null) replaceTeamShares(group, userId.trim(), teamIds, org);
        return group;
    }

    @Transactional
    public void deleteGroup(String userId, PencilSkillGroup group) {
        requireManageGroup(userId, group);
        for (PencilSkill skill : skillRepository.findByGroupIdAndIsDeletedOrderByUpdatedAtDesc(group.getId(), 0)) {
            skill.softDelete();
            skillRepository.save(skill);
        }
        groupTeamRepository.deleteByGroupId(group.getId());
        groupManagerRepository.deleteByGroupId(group.getId());
        group.softDelete();
        groupRepository.save(group);
    }

    @Transactional(readOnly = true)
    public List<String> listGroupManagerIds(String groupId) {
        return groupManagerRepository.findByGroupId(groupId).stream()
                .map(row -> row.getUserId().trim())
                .toList();
    }

    @Transactional
    public void addGroupManager(String actorId, PencilSkillGroup group, String userIdOrUsername) {
        requireManageGroup(actorId, group);
        String raw = userIdOrUsername == null ? "" : userIdOrUsername.trim();
        if (!StringUtils.hasText(raw)) throw ApiException.badRequest("username is required");
        // Accept username, email, or user id.
        String uid = userService.resolveByUsernameOrEmail(raw).getId();
        if (!StringUtils.hasText(uid)) throw ApiException.badRequest("User not found");
        if (groupManagerRepository.existsByGroupIdAndUserId(group.getId(), uid)) {
            return;
        }
        groupManagerRepository.save(PencilSkillGroupManager.builder()
                .groupId(group.getId())
                .userId(uid.trim())
                .build());
    }

    @Transactional
    public void removeGroupManager(String actorId, PencilSkillGroup group, String userId) {
        requireManageGroup(actorId, group);
        String uid = userId == null ? "" : userId.trim();
        if (!StringUtils.hasText(uid)) throw ApiException.badRequest("user_id is required");
        if (!groupManagerRepository.existsByGroupIdAndUserId(group.getId(), uid)) {
            throw ApiException.notFound("Manager not found");
        }
        if (groupManagerRepository.countByGroupId(group.getId()) <= 1) {
            throw ApiException.badRequest("A skill group must keep at least one manager");
        }
        groupManagerRepository.deleteByGroupIdAndUserId(group.getId(), uid);
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
        requireManageGroup(userId, group);
        if (group.getGroupKey() != null && group.getGroupKey().startsWith("tr-")) {
            throw ApiException.badRequest("Cannot bind teams to the team remotes group");
        }
        String org = StringUtils.hasText(orgId)
                ? orgId.trim()
                : (StringUtils.hasText(group.getOrgId()) ? group.getOrgId().trim() : null);
        Set<String> orgTeamIds = teamService.getUserTeams(userId.trim(), org).stream()
                .map(TeamResponse::getId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        // Org managers may bind any team under the org, not only teams they personally joined.
        if (StringUtils.hasText(org) && teamService.isOrgManager(org, userId.trim())) {
            orgTeamIds = teamService.listTeamIdsUnderOrg(org);
        }
        Set<String> desired = normalizeTeamIds(userId, teamIds, org, orgTeamIds);
        // Bound teams require a unique display name within each team.
        requireUniqueNameUnderTeams(group.getName(), desired, group.getId());
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
        // Managers / org admins, or members of a bound team.
        if (canManageGroup(userId, group)) return;
        requireCanReadGroup(userId, group);
    }

    public boolean canManageGroup(String userId, PencilSkillGroup group) {
        String uid = userId.trim();
        if (groupManagerRepository.existsByGroupIdAndUserId(group.getId(), uid)) return true;
        if (uid.equals(trim(group.getOwnerId()))) return true;
        String orgId = trim(group.getOrgId());
        return StringUtils.hasText(orgId) && teamService.isOrgManager(orgId, uid);
    }

    public void requireManageGroup(String userId, PencilSkillGroup group) {
        if (!canManageGroup(userId, group)) {
            throw ApiException.forbidden("Only a group manager or organization manager can manage this group");
        }
    }

    /** @deprecated Use {@link #requireManageGroup} */
    public void requireOwner(String userId, PencilSkillGroup group) {
        requireManageGroup(userId, group);
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
        List<String> managerIds = listGroupManagerIds(group.getId());
        boolean managedByMe = canManageGroup(userId, group);
        SkillGroupResponse response = SkillGroupResponse.builder()
                .id(group.getId())
                .groupKey(group.getGroupKey())
                .name(group.getName())
                .description(group.getDescription())
                .ownerId(group.getOwnerId())
                .orgId(group.getOrgId())
                .ownedByMe(userId.trim().equals(trim(group.getOwnerId())))
                .managedByMe(managedByMe)
                .sortOrder(group.getSortOrder())
                .createdAt(group.getCreatedAt())
                .updatedAt(group.getUpdatedAt())
                .skillCount((long) skills.size())
                .teamIds(teamIds == null ? List.of() : teamIds)
                .managerIds(managerIds)
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

    /**
     * When a group is bound to teams, its display name must be unique (case-insensitive)
     * among non-deleted, non-remotes groups on each of those teams.
     */
    private void requireUniqueNameUnderTeams(
            String name,
            Collection<String> teamIds,
            String excludeGroupId
    ) {
        if (!StringUtils.hasText(name) || teamIds == null || teamIds.isEmpty()) return;
        String normalized = name.trim();
        for (String rawTeamId : teamIds) {
            if (!StringUtils.hasText(rawTeamId)) continue;
            String teamId = rawTeamId.trim();
            List<PencilSkillGroupTeam> shares = groupTeamRepository.findByTeamIdIn(List.of(teamId));
            if (shares.isEmpty()) continue;
            Set<String> groupIds = shares.stream()
                    .map(share -> share.getGroupId().trim())
                    .collect(Collectors.toCollection(LinkedHashSet::new));
            for (PencilSkillGroup other : groupRepository.findByIdInAndIsDeleted(groupIds, 0)) {
                if (excludeGroupId != null && excludeGroupId.equals(other.getId())) continue;
                if (other.getGroupKey() != null && other.getGroupKey().startsWith("tr-")) continue;
                if (normalized.equalsIgnoreCase(trim(other.getName()))) {
                    throw ApiException.badRequest(
                            "Skill group name must be unique within the team");
                }
            }
        }
    }

    /**
     * Skill name (= local folder under {@code .claude/skills/<name>/}, etc.).
     * Letters (any script), digits, and {@code -}; no whitespace or other symbols.
     * Stored as both {@code name} and {@code skill_key} for uniqueness.
     */
    public static String sanitizeKey(String raw) {
        String key = raw == null ? "" : raw.trim()
                .replaceAll("[^\\p{L}\\p{N}-]+", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
        if (!StringUtils.hasText(key)) throw ApiException.badRequest("name is required");
        if (key.length() > 64) throw ApiException.badRequest("name is too long");
        return key;
    }

    /** Prefer request name; fall back to skill_key for older clients. */
    public static String sanitizeSkillName(String name, String skillKey) {
        if (StringUtils.hasText(name)) return sanitizeKey(name);
        return sanitizeKey(skillKey);
    }

    private Set<String> normalizeTeamIds(
            String userId,
            List<String> teamIds,
            String orgId,
            Set<String> allowedTeamIds
    ) {
        if (teamIds == null || teamIds.isEmpty()) return Set.of();
        Set<String> allowed = allowedTeamIds != null && !allowedTeamIds.isEmpty()
                ? allowedTeamIds
                : teamService.getUserTeams(userId, orgId).stream()
                        .map(TeamResponse::getId)
                        .collect(Collectors.toCollection(LinkedHashSet::new));
        Set<String> desired = new LinkedHashSet<>();
        for (String teamId : teamIds) {
            if (!StringUtils.hasText(teamId)) continue;
            String trimmed = teamId.trim();
            if (!allowed.contains(trimmed)) {
                throw ApiException.forbidden("Cannot bind team " + trimmed);
            }
            desired.add(trimmed);
        }
        return desired;
    }

    private static String trim(String value) {
        return value == null ? "" : value.trim();
    }
}
