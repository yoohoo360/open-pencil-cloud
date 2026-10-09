package cn.jongwong.repository;

import cn.jongwong.entity.PencilSkill;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PencilSkillRepository extends JpaRepository<PencilSkill, String> {

    List<PencilSkill> findByGroupIdAndIsDeletedOrderByUpdatedAtDesc(String groupId, Integer isDeleted);

    List<PencilSkill> findByGroupIdInAndIsDeletedOrderByUpdatedAtDesc(
            Collection<String> groupIds, Integer isDeleted);

    Optional<PencilSkill> findByIdAndIsDeleted(String id, Integer isDeleted);

    Optional<PencilSkill> findByGroupIdAndSkillKeyAndIsDeleted(
            String groupId, String skillKey, Integer isDeleted);

    Optional<PencilSkill> findByOrgIdAndOwnerIdAndSkillKeyAndTeamIdIsNullAndIsDeleted(
            String orgId, String ownerId, String skillKey, Integer isDeleted);

    Optional<PencilSkill> findByOrgIdAndTeamIdAndSkillKeyAndIsDeleted(
            String orgId, String teamId, String skillKey, Integer isDeleted);

    List<PencilSkill> findByOrgIdAndTeamIdAndIsDeletedOrderByUpdatedAtDesc(
            String orgId, String teamId, Integer isDeleted);

    List<PencilSkill> findByTeamIdAndIsDeletedOrderByUpdatedAtDesc(String teamId, Integer isDeleted);

    List<PencilSkill> findByOrgIdAndTeamIdInAndIsDeletedOrderByUpdatedAtDesc(
            String orgId, Collection<String> teamIds, Integer isDeleted);

    long countByGroupIdAndIsDeleted(String groupId, Integer isDeleted);

    boolean existsByOrgIdAndSkillKeyAndIsDeletedAndIdNot(
            String orgId, String skillKey, Integer isDeleted, String id);

    boolean existsByOrgIdAndTeamIdIsNotNullAndSkillKeyAndIsDeleted(
            String orgId, String skillKey, Integer isDeleted);
}
