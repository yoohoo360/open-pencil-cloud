package cn.jongwong.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

/**
 * 库实体类
 */
@Entity
@Table(name = "pencil_libraries")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PencilLibrary {

    /**
     * 主键 ID
     */
    @Id
    private String id;

    /**
     * 库唯一标识 KEY
     */
    private String key;

    /**
     * 库名称
     */
    private String name;

    /**
     * 库 URL
     */
    private String url;

    /**
     * 库描述
     */
    private String description;

    /**
     * 项目 ID
     */
    private String projectId;

    /**
     * 缩略图 URL
     */
    private String thumbnailUrl;

    /**
     * 版本号
     */
    private String version;

    /**
     * Schema 版本
     */
    private String schemaVersion;

    /**
     * 是否删除: 0=未删除, 1=已删除
     */
    @Builder.Default
    private Integer isDeleted = 0;

    /**
     * 创建时间
     */
    @CreationTimestamp
    private Instant createdAt;

    /**
     * 更新时间
     */
    @UpdateTimestamp
    private Instant updatedAt;

    @PrePersist
    public void prePersist() {
        if (this.id == null) {
            this.id = UUID.randomUUID().toString();
        }
        if (this.isDeleted == null) {
            this.isDeleted = 0;
        }
    }

    // ==================== 辅助方法 ====================

    /**
     * 软删除
     */
    public void softDelete() {
        this.isDeleted = 1;
    }

    /**
     * 恢复
     */
    public void restore() {
        this.isDeleted = 0;
    }

    /**
     * 是否已删除
     */
    public boolean isDeleted() {
        return this.isDeleted != null && this.isDeleted == 1;
    }
}