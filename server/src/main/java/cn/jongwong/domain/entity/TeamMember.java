package cn.jongwong.domain.entity;

import cn.jongwong.domain.entity.id.TeamMemberId;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "team_members")
public class TeamMember {

    @EmbeddedId
    @Builder.Default
    private TeamMemberId id = new TeamMemberId();

    /**
     * 团队内角色：owner, admin, member
     * 注意：这不是系统角色（Role），而是团队内的角色标识
     */
    @Column(name = "role_id", length = 36)
    private String roleId;

    /** Epoch millis — matches BIGINT column. */
    @Column(name = "joined_at", nullable = false, updatable = false)
    private Long joinedAt;

    /** Epoch millis — matches BIGINT column. */
    @Column(name = "updated_at", nullable = false)
    private Long updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("teamId")
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("userId")
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @PrePersist
    void onCreate() {
        long now = System.currentTimeMillis();
        if (joinedAt == null) {
            joinedAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
        if (id != null) {
            if (id.getUserId() != null) {
                id.setUserId(id.getUserId().trim());
            }
            if (id.getTeamId() != null) {
                id.setTeamId(id.getTeamId().trim());
            }
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = System.currentTimeMillis();
    }
}
