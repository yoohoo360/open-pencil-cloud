package cn.jongwong.entity;

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
@Table(name = "pencil_document_ai_reviews")
public class PencilDocumentAiReview {

    public static final String STATUS_DRAFT = "draft";
    public static final String STATUS_COMPLETED = "completed";

    @Id
    private String id;

    @Column(name = "document_id", nullable = false)
    private String documentId;

    @Column(name = "document_key", nullable = false)
    private String documentKey;

    private String title;

    @Column(nullable = false)
    private String status;

    @Column(name = "history_id", nullable = false)
    private String historyId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String payload;

    @Column(name = "marker_count", nullable = false)
    private Integer markerCount;

    @Column(name = "comment_count", nullable = false)
    private Integer commentCount;

    @Column(name = "created_by", nullable = false)
    private String createdBy;

    private Long createdAt;

    @Column(name = "updated_by")
    private String updatedBy;

    private Long updatedAt;

    private Integer isDeleted;

    @PrePersist
    public void prePersist() {
        if (this.id == null) {
            this.id = UUID.randomUUID().toString();
        }
        if (this.status == null) {
            this.status = STATUS_COMPLETED;
        }
        if (this.markerCount == null) {
            this.markerCount = 0;
        }
        if (this.commentCount == null) {
            this.commentCount = 0;
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
