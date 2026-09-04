package cn.jongwong.domain.repository;

import cn.jongwong.domain.entity.RolePermission;
import cn.jongwong.domain.entity.id.RolePermissionId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for RolePermission entity.
 */
@Repository
public interface RolePermissionRepository extends JpaRepository<RolePermission, RolePermissionId> {

    /**
     * Find all permissions for a specific role.
     */
    List<RolePermission> findByRoleId(String roleId);

    /**
     * Find all roles that have a specific permission.
     */
    List<RolePermission> findByPermissionId(String permissionId);

    /**
     * Check if a role has a specific permission.
     */
    boolean existsByRoleIdAndPermissionId(String roleId, String permissionId);

    /**
     * Delete all permissions for a specific role.
     */
    @Modifying
    @Query("DELETE FROM RolePermission rp WHERE rp.role.id = :roleId")
    void deleteByRoleId(@Param("roleId") String roleId);

    /**
     * Delete all roles that have a specific permission.
     */
    @Modifying
    @Query("DELETE FROM RolePermission rp WHERE rp.permission.id = :permissionId")
    void deleteByPermissionId(@Param("permissionId") String permissionId);

    /**
     * Delete a specific role-permission assignment.
     */
    @Modifying
    @Query("DELETE FROM RolePermission rp WHERE rp.role.id = :roleId AND rp.permission.id = :permissionId")
    void deleteByRoleIdAndPermissionId(@Param("roleId") String roleId, @Param("permissionId") String permissionId);
}
