package cn.jongwong.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "membership_invitations")
public class MembershipInvitation {

    @Id
    private String id;

    /** organization | team | document */
    @Column(name = "target_type", nullable = false, length = 32)
    private String targetType;

    @Column(name = "target_id", nullable = false, length = 36)
    private String targetId;

    @Column(name = "target_key", length = 255)
    private String targetKey;

    @Column(name = "target_name", length = 255)
    private String targetName;

    @Column(name = "invitee_id", nullable = false, length = 36)
    private String inviteeId;

    @Column(name = "inviter_id", nullable = false, length = 36)
    private String inviterId;

    @Column(nullable = false, length = 32)
    @Builder.Default
    private String role = "member";

    /** pending | accepted | rejected */
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "pending";

    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(name = "created_at", nullable = false)
    private Long createdAt;

    @Column(name = "updated_at", nullable = false)
    private Long updatedAt;

    @PrePersist
    void onCreate() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
        long now = System.currentTimeMillis();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
        if (status == null) {
            status = "pending";
        }
        if (role == null) {
            role = "member";
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = System.currentTimeMillis();
    }
}
