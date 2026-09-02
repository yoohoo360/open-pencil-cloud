package main.java.cn.jongwong.domain.repository;

import cn.jongwong.domain.entity.Permission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PermissionRepository extends JpaRepository<Permission, String> {

    Optional<Permission> findByActionAndResource(String action, String resource);

    List<Permission> findByResource(String resource);

    List<Permission> findByAction(String action);

    @Query("SELECT p FROM Permission p JOIN p.roles rp WHERE rp.role.id = :roleId")
    List<Permission> findByRoleId(@Param("roleId") String roleId);

    @Query("SELECT DISTINCT p.resource FROM Permission p")
    List<String> findAllResources();

    @Query("SELECT DISTINCT p.action FROM Permission p")
    List<String> findAllActions();
}
