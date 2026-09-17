package cn.jongwong.domain.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "teams")
public class Team {

    @Id
    @Column(nullable = false, updatable = false, length = 36)
    private String id;

    @Column(nullable = false)
    private String name;

    private String description;

    private String avatar;

    @Column(name = "owner_id", nullable = false, length = 36)
    private String ownerId;

    /** 上级组织；为空为根组织 */
    @Column(name = "parent_id", length = 36)
    private String parentId;

    /**
     * 组织代码：仅根组织有值，系统生成、全局唯一、不可修改。
     */
    @Column(name = "org_code", length = 15)
    private String orgCode;

    /**
     * 组织创建审核：pending | approved | rejected（当前默认自动 approved）
     */
    @Column(name = "approval_status", length = 20)
    @Builder.Default
    private String approvalStatus = "approved";

    /**
     * 组织资源默认权限：none | read | write | admin（类 GitHub）
     */
    @Column(name = "base_permission", length = 20)
    @Builder.Default
    private String basePermission = "write";

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", insertable = false, updatable = false)
    private User owner;

    @OneToMany(mappedBy = "team", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private Set<TeamMember> members = new LinkedHashSet<>();



    @PrePersist
    public void prePersist() {
        if (this.id == null) {
            this.id = java.util.UUID.randomUUID().toString();
        }
        if (this.ownerId == null && this.owner != null) {
            this.ownerId = this.owner.getId();
        }
    }
}
