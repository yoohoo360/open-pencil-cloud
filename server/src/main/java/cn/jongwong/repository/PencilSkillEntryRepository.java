package cn.jongwong.repository;

import cn.jongwong.entity.PencilSkillEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PencilSkillEntryRepository extends JpaRepository<PencilSkillEntry, String> {

    List<PencilSkillEntry> findBySkillIdAndIsDeletedOrderByKindDescPathAsc(String skillId, Integer isDeleted);

    List<PencilSkillEntry> findByParentIdAndIsDeletedOrderByKindDescNameAsc(String parentId, Integer isDeleted);

    Optional<PencilSkillEntry> findByIdAndIsDeleted(String id, Integer isDeleted);

    Optional<PencilSkillEntry> findBySkillIdAndPathAndIsDeleted(String skillId, String path, Integer isDeleted);

    List<PencilSkillEntry> findBySkillIdAndPathStartingWithAndIsDeleted(
            String skillId, String pathPrefix, Integer isDeleted);
}
