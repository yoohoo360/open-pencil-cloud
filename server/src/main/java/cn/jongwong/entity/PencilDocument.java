package cn.jongwong.entity;

import lombok.*;

import jakarta.persistence.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "pencil_documents")
public class PencilDocument {


    @Id
    private String id;
    /**
     * 文档 KEY (唯一标识)
     */
    private String key;

    /**
     * 文档 URL
     */
    private String url;

    /**
     * 文档名称
     */
    private String name;

    /**
     * 文档描述
     */
    private String description;

    // ==================== 关联信息 ====================

    /**
     * 团队 ID
     */
    private String teamId;

    /**
     * 项目 ID
     */
    private String projectId;

    // ==================== 存储信息 ====================

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
    private Integer isDeleted;


    /**
     * 创建时间 (毫秒时间戳)
     */
    private Long createdAt;

    /**
     * 更新时间 (毫秒时间戳)
     */
    private Long updatedAt;


    @PrePersist
    public void prePersist() {
        if (this.id == null) {
            this.id = UUID.randomUUID().toString();
        }

        if (this.isDeleted == null) {
            this.isDeleted = 0;
        }
        long now = System.currentTimeMillis();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = System.currentTimeMillis();
    }
}