package cn.jongwong.repository;

import cn.jongwong.entity.PencilSkillGroup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PencilSkillGroupRepository extends JpaRepository<PencilSkillGroup, String> {

    List<PencilSkillGroup> findByOwnerIdAndIsDeletedOrderBySortOrderAscUpdatedAtDesc(
            String ownerId, Integer isDeleted);

    Optional<PencilSkillGroup> findByIdAndIsDeleted(String id, Integer isDeleted);

    Optional<PencilSkillGroup> findByOwnerIdAndGroupKeyAndIsDeleted(
            String ownerId, String groupKey, Integer isDeleted);

    List<PencilSkillGroup> findByIdInAndIsDeleted(Iterable<String> ids, Integer isDeleted);
}
