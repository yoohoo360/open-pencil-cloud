package cn.jongwong.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Entity
@Table(name = "pencil_skills")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PencilSkill {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "skill_key", nullable = false)
    private String skillKey;

    @Column(nullable = false, length = 500)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "owner_id", length = 36, nullable = false)
    private String ownerId;

    @Column(name = "group_id", length = 36, nullable = false)
    private String groupId;

    /** Organization scope for key uniqueness and sharing */
    @Column(name = "org_id", length = 36)
    private String orgId;

    /** NULL = personal working copy; set = team remote */
    @Column(name = "team_id", length = 36)
    private String teamId;

    @Builder.Default
    @Column(name = "is_deleted", nullable = false)
    private Integer isDeleted = 0;

    @Column(name = "created_at", nullable = false)
    private Long createdAt;

    @Column(name = "updated_at", nullable = false)
    private Long updatedAt;

    @PrePersist
    public void prePersist() {
        if (this.id == null) this.id = UUID.randomUUID().toString();
        if (this.isDeleted == null) this.isDeleted = 0;
        if (this.ownerId != null) this.ownerId = this.ownerId.trim();
        if (this.groupId != null) this.groupId = this.groupId.trim();
        if (this.orgId != null) this.orgId = this.orgId.trim();
        if (this.teamId != null) this.teamId = this.teamId.trim();
        long now = System.currentTimeMillis();
        if (this.createdAt == null) this.createdAt = now;
        if (this.updatedAt == null) this.updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        if (this.isDeleted == null) this.isDeleted = 0;
        if (this.ownerId != null) this.ownerId = this.ownerId.trim();
        if (this.groupId != null) this.groupId = this.groupId.trim();
        if (this.orgId != null) this.orgId = this.orgId.trim();
        if (this.teamId != null) this.teamId = this.teamId.trim();
        this.updatedAt = System.currentTimeMillis();
    }

    public boolean isTeamRemote() {
        return this.teamId != null && !this.teamId.isBlank();
    }

    public void softDelete() {
        this.isDeleted = 1;
    }
}
