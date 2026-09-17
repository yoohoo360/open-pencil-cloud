package cn.jongwong.domain.repository;

import cn.jongwong.domain.entity.Team;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface TeamRepository extends JpaRepository<Team, String> {

    List<Team> findByOwnerId(String ownerId);

    List<Team> findByParentId(String parentId);

    List<Team> findByParentIdIsNull();

    @Query("SELECT t FROM Team t JOIN t.members tm WHERE tm.user.id = :userId")
    List<Team> findByMemberId(@Param("userId") String userId);

    @Query("SELECT t FROM Team t JOIN t.members tm WHERE tm.user.id = :userId AND t.parentId IS NULL")
    List<Team> findOrganizationsByMemberId(@Param("userId") String userId);

    @Query("SELECT t FROM Team t JOIN t.members tm WHERE tm.user.id = :userId AND t.parentId = :orgId")
    List<Team> findTeamsByMemberIdAndOrg(
            @Param("userId") String userId, @Param("orgId") String orgId);

    @Query("SELECT t FROM Team t WHERE " +
            "(:hasSearch = false OR LOWER(t.name) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Team> findBySearch(
            @Param("hasSearch") boolean hasSearch,
            @Param("search") String search,
            Pageable pageable);

    /**
     * Admin org list. Boolean flags avoid Hibernate evaluating LIKE when filters are empty
     * (empty/null search previously caused PostgreSQL type errors).
     */
    @Query("SELECT t FROM Team t WHERE t.parentId IS NULL " +
            "AND (:hasSearch = false OR LOWER(t.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR (t.orgCode IS NOT NULL AND LOWER(t.orgCode) LIKE LOWER(CONCAT('%', :search, '%')))) " +
            "AND (:hasCreatedFrom = false OR t.createdAt >= :createdFrom) " +
            "AND (:hasCreatedTo = false OR t.createdAt <= :createdTo)")
    Page<Team> findOrganizationsAdmin(
            @Param("hasSearch") boolean hasSearch,
            @Param("search") String search,
            @Param("hasCreatedFrom") boolean hasCreatedFrom,
            @Param("createdFrom") Instant createdFrom,
            @Param("hasCreatedTo") boolean hasCreatedTo,
            @Param("createdTo") Instant createdTo,
            Pageable pageable);

    boolean existsByName(String name);

    boolean existsByOrgCodeIgnoreCase(String orgCode);

    boolean existsByNameIgnoreCaseAndParentId(String name, String parentId);

    boolean existsByNameIgnoreCaseAndParentIdAndIdNot(String name, String parentId, String id);
}
