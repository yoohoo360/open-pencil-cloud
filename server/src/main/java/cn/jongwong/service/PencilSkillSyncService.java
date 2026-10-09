package cn.jongwong.service;

import cn.jongwong.entity.PencilSkill;
import cn.jongwong.entity.PencilSkillGroup;
import cn.jongwong.entity.PencilSkillMergeRequest;
import cn.jongwong.exception.ApiException;
import cn.jongwong.repository.PencilSkillMergeRequestRepository;
import cn.jongwong.repository.PencilSkillRepository;
import cn.jongwong.ro.SkillMergeRequestResponse;
import cn.jongwong.web.dto.team.TeamResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PencilSkillSyncService {

    private final PencilSkillRepository skillRepository;
    private final PencilSkillMergeRequestRepository mergeRequestRepository;
    private final PencilSkillService skillService;
    private final PencilSkillPackageService packageService;
    private final TeamService teamService;

    @Transactional
    public SkillMergeRequestResponse shareToTeam(
            String userId,
            String skillId,
            String teamId,
            String title,
            String message
    ) {
        String uid = userId.trim();
        PencilSkill source = requirePersonalWritable(uid, skillId);
        skillService.requireTeamMember(uid, teamId);
        TeamResponse team = teamService.getTeamById(teamId.trim());
        String orgId = StringUtils.hasText(source.getOrgId())
                ? source.getOrgId().trim()
                : (team.getParentId() == null ? null : team.getParentId().trim());
        if (!StringUtils.hasText(orgId)) {
            throw ApiException.badRequest("org_id is required; select an organization team to share into");
        }
        if (!orgId.equals(team.getParentId() == null ? "" : team.getParentId().trim())) {
            throw ApiException.forbidden("Team is not in this organization");
        }
        if (!StringUtils.hasText(source.getOrgId())) {
            source.setOrgId(orgId);
            skillRepository.save(source);
        }

        mergeRequestRepository
                .findBySourceSkillIdAndTargetTeamIdAndStatus(
                        source.getId(), team.getId(), PencilSkillMergeRequest.STATUS_PENDING)
                .ifPresent(existing -> {
                    throw ApiException.badRequest("A pending share request already exists for this team");
                });

        String skillKey = source.getSkillKey();
        PencilSkill existingRemote = skillRepository
                .findByOrgIdAndTeamIdAndSkillKeyAndIsDeleted(orgId, team.getId(), skillKey, 0)
                .orElse(null);

        PencilSkillMergeRequest mr = mergeRequestRepository.save(PencilSkillMergeRequest.builder()
                .orgId(orgId)
                .sourceSkillId(source.getId())
                .targetTeamId(team.getId())
                .targetSkillId(existingRemote == null ? null : existingRemote.getId())
                .skillKey(skillKey)
                .title(StringUtils.hasText(title) ? title.trim() : source.getName())
                .message(message)
                .status(PencilSkillMergeRequest.STATUS_PENDING)
                .createdBy(uid)
                .build());
        return toResponse(mr, source.getName(), team.getName());
    }

    @Transactional(readOnly = true)
    public List<SkillMergeRequestResponse> listMergeRequests(String userId, String orgId, String status) {
        String uid = userId.trim();
        String org = requireText(orgId, "org_id is required");
        Set<String> myTeamIds = teamService.getUserTeams(uid, org).stream()
                .map(TeamResponse::getId)
                .collect(Collectors.toSet());
        Collection<String> statuses = resolveStatuses(status);
        Map<String, SkillMergeRequestResponse> unique = new LinkedHashMap<>();
        if (!myTeamIds.isEmpty()) {
            for (PencilSkillMergeRequest mr : mergeRequestRepository
                    .findByTargetTeamIdInAndStatusInOrderByUpdatedAtDesc(myTeamIds, statuses)) {
                unique.put(mr.getId(), toResponse(mr));
            }
        }
        for (PencilSkillMergeRequest mr : mergeRequestRepository
                .findByCreatedByAndOrgIdOrderByUpdatedAtDesc(uid, org)) {
            if (!statuses.contains(mr.getStatus())) continue;
            unique.putIfAbsent(mr.getId(), toResponse(mr));
        }
        return List.copyOf(unique.values());
    }

    @Transactional
    public SkillMergeRequestResponse approve(String userId, String mrId, String reviewNote) {
        PencilSkillMergeRequest mr = requirePendingOrApproved(mrId);
        requireTeamMember(userId, mr.getTargetTeamId());
        if (PencilSkillMergeRequest.STATUS_APPROVED.equals(mr.getStatus())) {
            return toResponse(mr);
        }
        mr.setStatus(PencilSkillMergeRequest.STATUS_APPROVED);
        mr.setReviewedBy(userId.trim());
        mr.setReviewNote(reviewNote);
        return toResponse(mergeRequestRepository.save(mr));
    }

    @Transactional
    public SkillMergeRequestResponse reject(String userId, String mrId, String reviewNote) {
        PencilSkillMergeRequest mr = requirePendingOrApproved(mrId);
        requireTeamMember(userId, mr.getTargetTeamId());
        mr.setStatus(PencilSkillMergeRequest.STATUS_REJECTED);
        mr.setReviewedBy(userId.trim());
        mr.setReviewNote(reviewNote);
        return toResponse(mergeRequestRepository.save(mr));
    }

    @Transactional
    public SkillMergeRequestResponse cancel(String userId, String mrId) {
        PencilSkillMergeRequest mr = requireMr(mrId);
        if (!PencilSkillMergeRequest.STATUS_PENDING.equals(mr.getStatus())) {
            throw ApiException.badRequest("Only pending share requests can be cancelled");
        }
        if (!userId.trim().equals(trim(mr.getCreatedBy()))) {
            throw ApiException.forbidden("Only the requester can cancel this share request");
        }
        mr.setStatus(PencilSkillMergeRequest.STATUS_CANCELLED);
        return toResponse(mergeRequestRepository.save(mr));
    }

    /**
     * Merge a personal skill package into the team remote (creates remote if missing).
     * Accepts pending or approved requests — git-like merge admission.
     */
    @Transactional
    public SkillMergeRequestResponse merge(String userId, String mrId, String reviewNote) {
        String uid = userId.trim();
        PencilSkillMergeRequest mr = requirePendingOrApproved(mrId);
        requireTeamMember(uid, mr.getTargetTeamId());

        PencilSkill source = skillRepository.findByIdAndIsDeleted(mr.getSourceSkillId(), 0)
                .orElseThrow(() -> ApiException.notFound("Source skill not found"));
        if (source.isTeamRemote()) {
            throw ApiException.badRequest("Source must be a personal skill");
        }

        PencilSkillGroup remotesGroup = skillService.ensureTeamRemoteGroup(
                uid, mr.getOrgId(), mr.getTargetTeamId());

        PencilSkill target = StringUtils.hasText(mr.getTargetSkillId())
                ? skillRepository.findByIdAndIsDeleted(mr.getTargetSkillId(), 0).orElse(null)
                : null;
        if (target == null) {
            target = skillRepository
                    .findByOrgIdAndTeamIdAndSkillKeyAndIsDeleted(
                            mr.getOrgId(), mr.getTargetTeamId(), mr.getSkillKey(), 0)
                    .orElse(null);
        }
        if (target == null) {
            target = skillRepository.save(PencilSkill.builder()
                    .skillKey(mr.getSkillKey())
                    .name(source.getName())
                    .description(source.getDescription())
                    .content(source.getContent() == null ? "" : source.getContent())
                    .ownerId(uid)
                    .groupId(remotesGroup.getId())
                    .orgId(mr.getOrgId())
                    .teamId(mr.getTargetTeamId())
                    .isDeleted(0)
                    .build());
            packageService.seedPackage(target, source.getContent());
        } else {
            target.setName(source.getName());
            target.setDescription(source.getDescription());
            target.setGroupId(remotesGroup.getId());
            skillRepository.save(target);
        }

        packageService.copyPackage(source.getId(), target.getId());

        mr.setTargetSkillId(target.getId());
        mr.setStatus(PencilSkillMergeRequest.STATUS_MERGED);
        mr.setReviewedBy(uid);
        if (StringUtils.hasText(reviewNote)) mr.setReviewNote(reviewNote);
        mr.setMergedAt(System.currentTimeMillis());
        return toResponse(mergeRequestRepository.save(mr), source.getName(), null);
    }

    /**
     * Fetch a team remote into a personal working copy (create or overwrite same key).
     */
    @Transactional
    public PencilSkill fetchFromTeam(
            String userId,
            String orgId,
            String teamId,
            String skillKey,
            String groupId
    ) {
        String uid = userId.trim();
        String org = requireText(orgId, "org_id is required");
        String key = PencilSkillService.sanitizeKey(skillKey);
        TeamResponse team = requireTeamInOrg(uid, teamId, org);
        PencilSkillGroup group = skillService.requireGroup(groupId);
        skillService.requireCanWriteGroup(uid, group);
        if (!uid.equals(trim(group.getOwnerId()))) {
            throw ApiException.forbidden("Fetch into a personal group you own");
        }

        PencilSkill remote = skillRepository
                .findByOrgIdAndTeamIdAndSkillKeyAndIsDeleted(org, team.getId(), key, 0)
                .orElseThrow(() -> ApiException.notFound("Team skill not found"));

        PencilSkill personal = skillRepository
                .findByOrgIdAndOwnerIdAndSkillKeyAndTeamIdIsNullAndIsDeleted(org, uid, key, 0)
                .orElse(null);

        if (personal == null) {
            personal = skillRepository.save(PencilSkill.builder()
                    .skillKey(key)
                    .name(remote.getName())
                    .description(remote.getDescription())
                    .content(remote.getContent() == null ? "" : remote.getContent())
                    .ownerId(uid)
                    .groupId(group.getId())
                    .orgId(org)
                    .teamId(null)
                    .isDeleted(0)
                    .build());
            packageService.seedPackage(personal, remote.getContent());
        } else {
            personal.setName(remote.getName());
            personal.setDescription(remote.getDescription());
            personal.setGroupId(group.getId());
            skillRepository.save(personal);
        }
        packageService.copyPackage(remote.getId(), personal.getId());
        return personal;
    }

    private PencilSkill requirePersonalWritable(String userId, String skillId) {
        PencilSkill skill = skillRepository.findByIdAndIsDeleted(skillId, 0)
                .orElseThrow(() -> ApiException.notFound("Skill not found"));
        if (skill.isTeamRemote()) {
            throw ApiException.badRequest("Share a personal skill, not a team remote");
        }
        PencilSkillGroup group = skillService.requireGroup(skill.getGroupId());
        skillService.requireCanWriteGroup(userId, group);
        return skill;
    }

    private TeamResponse requireTeamInOrg(String userId, String teamId, String orgId) {
        skillService.requireTeamMember(userId, teamId);
        return teamService.getUserTeams(userId, orgId).stream()
                .filter(team -> team.getId().equals(teamId.trim()))
                .findFirst()
                .orElseThrow(() -> ApiException.forbidden("Team is not in this organization"));
    }

    private void requireTeamMember(String userId, String teamId) {
        skillService.requireTeamMember(userId, teamId);
    }

    private PencilSkillMergeRequest requireMr(String mrId) {
        return mergeRequestRepository.findById(mrId)
                .orElseThrow(() -> ApiException.notFound("Share request not found"));
    }

    private PencilSkillMergeRequest requirePendingOrApproved(String mrId) {
        PencilSkillMergeRequest mr = requireMr(mrId);
        String status = mr.getStatus();
        if (!PencilSkillMergeRequest.STATUS_PENDING.equals(status)
                && !PencilSkillMergeRequest.STATUS_APPROVED.equals(status)) {
            throw ApiException.badRequest("Share request is not open for review");
        }
        return mr;
    }

    private Collection<String> resolveStatuses(String status) {
        if (!StringUtils.hasText(status) || "open".equalsIgnoreCase(status.trim())) {
            return List.of(
                    PencilSkillMergeRequest.STATUS_PENDING,
                    PencilSkillMergeRequest.STATUS_APPROVED);
        }
        if ("all".equalsIgnoreCase(status.trim())) {
            return List.of(
                    PencilSkillMergeRequest.STATUS_PENDING,
                    PencilSkillMergeRequest.STATUS_APPROVED,
                    PencilSkillMergeRequest.STATUS_REJECTED,
                    PencilSkillMergeRequest.STATUS_MERGED,
                    PencilSkillMergeRequest.STATUS_CANCELLED);
        }
        return List.of(status.trim().toLowerCase(Locale.ROOT));
    }

    private SkillMergeRequestResponse toResponse(PencilSkillMergeRequest mr) {
        String sourceName = skillRepository.findByIdAndIsDeleted(mr.getSourceSkillId(), 0)
                .map(PencilSkill::getName)
                .orElse(null);
        String teamName = null;
        try {
            teamName = teamService.getTeamById(mr.getTargetTeamId()).getName();
        } catch (RuntimeException ignored) {
            // team may have been deleted
        }
        return toResponse(mr, sourceName, teamName);
    }

    private SkillMergeRequestResponse toResponse(
            PencilSkillMergeRequest mr,
            String sourceSkillName,
            String targetTeamName
    ) {
        String teamName = targetTeamName;
        if (teamName == null) {
            try {
                teamName = teamService.getTeamById(mr.getTargetTeamId()).getName();
            } catch (RuntimeException ignored) {
                teamName = null;
            }
        }
        return SkillMergeRequestResponse.builder()
                .id(mr.getId())
                .orgId(mr.getOrgId())
                .sourceSkillId(mr.getSourceSkillId())
                .targetTeamId(mr.getTargetTeamId())
                .targetSkillId(mr.getTargetSkillId())
                .skillKey(mr.getSkillKey())
                .title(mr.getTitle())
                .message(mr.getMessage())
                .status(mr.getStatus())
                .createdBy(mr.getCreatedBy())
                .reviewedBy(mr.getReviewedBy())
                .reviewNote(mr.getReviewNote())
                .createdAt(mr.getCreatedAt())
                .updatedAt(mr.getUpdatedAt())
                .mergedAt(mr.getMergedAt())
                .sourceSkillName(sourceSkillName)
                .targetTeamName(teamName)
                .build();
    }

    private static String requireText(String value, String message) {
        if (!StringUtils.hasText(value)) throw ApiException.badRequest(message);
        return value.trim();
    }

    private static String trim(String value) {
        return value == null ? "" : value.trim();
    }
}
