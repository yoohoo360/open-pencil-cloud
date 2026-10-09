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
@Table(name = "pencil_skill_groups")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PencilSkillGroup {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "group_key", nullable = false)
    private String groupKey;

    @Column(nullable = false, length = 500)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "owner_id", length = 36, nullable = false)
    private String ownerId;

    @Builder.Default
    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

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
        if (this.sortOrder == null) this.sortOrder = 0;
        if (this.ownerId != null) this.ownerId = this.ownerId.trim();
        long now = System.currentTimeMillis();
        if (this.createdAt == null) this.createdAt = now;
        if (this.updatedAt == null) this.updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        if (this.isDeleted == null) this.isDeleted = 0;
        if (this.ownerId != null) this.ownerId = this.ownerId.trim();
        this.updatedAt = System.currentTimeMillis();
    }

    public void softDelete() {
        this.isDeleted = 1;
    }
}
