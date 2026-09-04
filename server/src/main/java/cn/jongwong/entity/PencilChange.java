package cn.jongwong.entity;

import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * 变更索引表 (极简版)
 */

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "pencil_change")
public class PencilChange {

    /**
     * 主键 ID
     */
    @Id
    private String id;

    /**
     * 文件 ID
     */
    private String fileId;

    /**
     * 资源引用: node_id, image_id, variable_id
     */
    private String ref;

    /**
     * 变更类型: 1=创建, 2=更新, 3=删除
     */
    private Integer changeType;

    /**
     * 资源类型: node, image, blob, variable
     */
    private String resourceType;

    /**
     * 排序 (同文件内变更顺序)
     */
    private Integer sort;

    /**
     * 版本号 (最大值即为最新版本)
     */
    private Long version;

    /**
     * 创建时间
     */
    @CreationTimestamp
    private Instant createdAt;

    @PrePersist
    public void prePersist() {
        if (this.id == null) {
            this.id = java.util.UUID.randomUUID().toString();
        }
    }
}