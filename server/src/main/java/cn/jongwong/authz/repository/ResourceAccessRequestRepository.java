package cn.jongwong.authz.repository;

import cn.jongwong.authz.entity.ResourceAccessRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ResourceAccessRequestRepository extends JpaRepository<ResourceAccessRequest, String> {

    List<ResourceAccessRequest> findByResourceTypeAndResourceIdOrderByCreatedAtDesc(
            String resourceType, String resourceId);

    Optional<ResourceAccessRequest> findByResourceTypeAndResourceIdAndRequesterIdAndStatus(
            String resourceType, String resourceId, String requesterId, String status);

    List<ResourceAccessRequest> findByStatusOrderByCreatedAtDesc(String status);

    void deleteByResourceTypeAndResourceId(String resourceType, String resourceId);
}
