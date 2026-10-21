package cn.jongwong.repository;

import cn.jongwong.entity.PencilSkillGroupManager;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PencilSkillGroupManagerRepository extends JpaRepository<PencilSkillGroupManager, String> {

    List<PencilSkillGroupManager> findByGroupId(String groupId);

    Optional<PencilSkillGroupManager> findByGroupIdAndUserId(String groupId, String userId);

    boolean existsByGroupIdAndUserId(String groupId, String userId);

    long countByGroupId(String groupId);

    void deleteByGroupIdAndUserId(String groupId, String userId);

    void deleteByGroupId(String groupId);
}