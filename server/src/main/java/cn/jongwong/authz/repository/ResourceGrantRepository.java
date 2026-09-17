package cn.jongwong.authz.repository;

import cn.jongwong.authz.entity.ResourceGrant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ResourceGrantRepository extends JpaRepository<ResourceGrant, String> {

    Optional<ResourceGrant> findByResourceTypeAndResourceIdAndPrincipalTypeAndPrincipalId(
            String resourceType, String resourceId, String principalType, String principalId);

    List<ResourceGrant> findByResourceTypeAndResourceIdOrderByCreatedAtAsc(
            String resourceType, String resourceId);

    List<ResourceGrant> findByPrincipalTypeAndPrincipalId(String principalType, String principalId);

    void deleteByResourceTypeAndResourceId(String resourceType, String resourceId);

    void deleteByResourceTypeAndResourceIdAndPrincipalTypeAndPrincipalId(
            String resourceType, String resourceId, String principalType, String principalId);
}
