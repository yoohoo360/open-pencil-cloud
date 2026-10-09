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
@Table(name = "pencil_skill_entries")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PencilSkillEntry {

    public static final String KIND_FILE = "file";
    public static final String KIND_DIRECTORY = "directory";
    public static final String SKILL_MD = "SKILL.md";

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "skill_id", length = 36, nullable = false)
    private String skillId;

    @Column(name = "parent_id", length = 36)
    private String parentId;

    /** file | directory */
    @Column(nullable = false, length = 16)
    private String kind;

    @Column(nullable = false)
    private String name;

    /** Path relative to skill root */
    @Column(nullable = false, length = 1024)
    private String path;

    @Column(columnDefinition = "TEXT")
    private String content;

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
        if (this.skillId != null) this.skillId = this.skillId.trim();
        if (this.parentId != null) this.parentId = this.parentId.trim();
        long now = System.currentTimeMillis();
        if (this.createdAt == null) this.createdAt = now;
        if (this.updatedAt == null) this.updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        if (this.isDeleted == null) this.isDeleted = 0;
        if (this.skillId != null) this.skillId = this.skillId.trim();
        if (this.parentId != null) this.parentId = this.parentId.trim();
        this.updatedAt = System.currentTimeMillis();
    }

    public void softDelete() {
        this.isDeleted = 1;
    }

    public boolean isDirectory() {
        return KIND_DIRECTORY.equals(kind);
    }

    public boolean isFile() {
        return KIND_FILE.equals(kind);
    }
}
