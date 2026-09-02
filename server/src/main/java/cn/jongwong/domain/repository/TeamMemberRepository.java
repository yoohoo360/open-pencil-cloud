package main.java.cn.jongwong.domain.repository;

import cn.jongwong.domain.entity.TeamMember;
import cn.jongwong.domain.entity.id.TeamMemberId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamMemberRepository extends JpaRepository<TeamMember, TeamMemberId> {

    List<TeamMember> findByIdTeamId(String teamId);

    List<TeamMember> findByIdUserId(String userId);

    boolean existsByIdTeamIdAndIdUserId(String teamId, String userId);

    void deleteByIdTeamIdAndIdUserId(String teamId, String userId);

    @Query("SELECT tm FROM TeamMember tm WHERE tm.team.id = :teamId AND tm.roleId = :roleId")
    List<TeamMember> findByTeamIdAndRoleId(@Param("teamId") String teamId, @Param("roleId") String roleId);

    long countByIdTeamId(String teamId);
}
