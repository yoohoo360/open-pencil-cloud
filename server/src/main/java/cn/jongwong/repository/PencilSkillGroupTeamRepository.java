package cn.jongwong.repository;

import cn.jongwong.entity.PencilSkillGroupTeam;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PencilSkillGroupTeamRepository extends JpaRepository<PencilSkillGroupTeam, String> {

    List<PencilSkillGroupTeam> findByGroupId(String groupId);

    List<PencilSkillGroupTeam> findByGroupIdIn(Collection<String> groupIds);

    List<PencilSkillGroupTeam> findByTeamIdIn(Collection<String> teamIds);

    Optional<PencilSkillGroupTeam> findByGroupIdAndTeamId(String groupId, String teamId);

    void deleteByGroupId(String groupId);

    void deleteByGroupIdAndTeamId(String groupId, String teamId);
}
