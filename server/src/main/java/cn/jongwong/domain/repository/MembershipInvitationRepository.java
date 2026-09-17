package cn.jongwong.domain.repository;

import cn.jongwong.domain.entity.MembershipInvitation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MembershipInvitationRepository extends JpaRepository<MembershipInvitation, String> {

    List<MembershipInvitation> findByInviteeIdAndStatusOrderByCreatedAtDesc(String inviteeId, String status);

    List<MembershipInvitation> findByTargetTypeAndTargetIdAndStatusOrderByCreatedAtDesc(
            String targetType, String targetId, String status);

    Optional<MembershipInvitation> findByTargetTypeAndTargetIdAndInviteeIdAndStatus(
            String targetType, String targetId, String inviteeId, String status);
}
