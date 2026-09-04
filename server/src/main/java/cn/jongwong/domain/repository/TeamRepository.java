package cn.jongwong.domain.repository;

import cn.jongwong.domain.entity.Team;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamRepository extends JpaRepository<Team, String> {

    List<Team> findByOwnerId(String ownerId);

    @Query("SELECT t FROM Team t JOIN t.members tm WHERE tm.user.id = :userId")
    List<Team> findByMemberId(@Param("userId") String userId);

    @Query("SELECT t FROM Team t WHERE " +
            "(:search IS NULL OR LOWER(t.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(t.description) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Team> findBySearch(@Param("search") String search, Pageable pageable);

    boolean existsByName(String name);
}
