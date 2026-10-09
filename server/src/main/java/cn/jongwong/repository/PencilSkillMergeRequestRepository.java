package cn.jongwong.repository;

import cn.jongwong.entity.PencilSkillMergeRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PencilSkillMergeRequestRepository extends JpaRepository<PencilSkillMergeRequest, String> {

    Optional<PencilSkillMergeRequest> findById(String id);

    List<PencilSkillMergeRequest> findByOrgIdAndStatusInOrderByUpdatedAtDesc(
            String orgId, Collection<String> statuses);

    List<PencilSkillMergeRequest> findByTargetTeamIdInAndStatusInOrderByUpdatedAtDesc(
            Collection<String> teamIds, Collection<String> statuses);

    List<PencilSkillMergeRequest> findByCreatedByAndOrgIdOrderByUpdatedAtDesc(
            String createdBy, String orgId);

    Optional<PencilSkillMergeRequest> findBySourceSkillIdAndTargetTeamIdAndStatus(
            String sourceSkillId, String targetTeamId, String status);
}
