package main.java.cn.jongwong.domain.repository;

import cn.jongwong.domain.entity.UserRole;
import cn.jongwong.domain.entity.id.UserRoleId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for UserRole entity.
 */
@Repository
public interface UserRoleRepository extends JpaRepository<UserRole, UserRoleId> {

    /**
     * Find all roles for a specific user.
     */
    List<UserRole> findByUserId(String userId);

    /**
     * Find all users with a specific role.
     */
    List<UserRole> findByRoleId(String roleId);

    /**
     * Check if a user has a specific role.
     */
    boolean existsByUserIdAndRoleId(String userId, String roleId);

    /**
     * Delete all roles for a specific user.
     */
    @Modifying
    @Query("DELETE FROM UserRole ur WHERE ur.user.id = :userId")
    void deleteByUserId(@Param("userId") String userId);

    /**
     * Delete all users with a specific role.
     */
    @Modifying
    @Query("DELETE FROM UserRole ur WHERE ur.role.id = :roleId")
    void deleteByRoleId(@Param("roleId") String roleId);

    /**
     * Delete a specific user-role assignment.
     */
    @Modifying
    @Query("DELETE FROM UserRole ur WHERE ur.user.id = :userId AND ur.role.id = :roleId")
    void deleteByUserIdAndRoleId(@Param("userId") String userId, @Param("roleId") String roleId);

    /**
     * Count users with a specific role.
     */
    long countByRoleId(String roleId);
}
