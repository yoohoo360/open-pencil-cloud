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
@Table(name = "pencil_skill_merge_requests")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PencilSkillMergeRequest {

    public static final String STATUS_PENDING = "pending";
    public static final String STATUS_APPROVED = "approved";
    public static final String STATUS_REJECTED = "rejected";
    public static final String STATUS_MERGED = "merged";
    public static final String STATUS_CANCELLED = "cancelled";

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "org_id", length = 36, nullable = false)
    private String orgId;

    @Column(name = "source_skill_id", length = 36, nullable = false)
    private String sourceSkillId;

    @Column(name = "target_team_id", length = 36, nullable = false)
    private String targetTeamId;

    @Column(name = "target_skill_id", length = 36)
    private String targetSkillId;

    @Column(name = "skill_key", nullable = false)
    private String skillKey;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(nullable = false, length = 32)
    private String status;

    @Column(name = "created_by", length = 36, nullable = false)
    private String createdBy;

    @Column(name = "reviewed_by", length = 36)
    private String reviewedBy;

    @Column(name = "review_note", columnDefinition = "TEXT")
    private String reviewNote;

    @Column(name = "created_at", nullable = false)
    private Long createdAt;

    @Column(name = "updated_at", nullable = false)
    private Long updatedAt;

    @Column(name = "merged_at")
    private Long mergedAt;

    @PrePersist
    public void prePersist() {
        if (this.id == null) this.id = UUID.randomUUID().toString();
        if (this.status == null) this.status = STATUS_PENDING;
        trimIds();
        long now = System.currentTimeMillis();
        if (this.createdAt == null) this.createdAt = now;
        if (this.updatedAt == null) this.updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        trimIds();
        this.updatedAt = System.currentTimeMillis();
    }

    private void trimIds() {
        if (this.orgId != null) this.orgId = this.orgId.trim();
        if (this.sourceSkillId != null) this.sourceSkillId = this.sourceSkillId.trim();
        if (this.targetTeamId != null) this.targetTeamId = this.targetTeamId.trim();
        if (this.targetSkillId != null) this.targetSkillId = this.targetSkillId.trim();
        if (this.createdBy != null) this.createdBy = this.createdBy.trim();
        if (this.reviewedBy != null) this.reviewedBy = this.reviewedBy.trim();
    }
}
