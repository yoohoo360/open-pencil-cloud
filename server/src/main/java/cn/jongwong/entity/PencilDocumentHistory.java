package cn.jongwong.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
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
@Table(name = "pencil_document_historys")
public class PencilDocumentHistory {

    public static final String KIND_NAMED = "named";
    public static final String KIND_AUTOSAVE = "autosave";

    @Id
    private String id;

    @Column(name = "document_id", nullable = false)
    private String documentId;

    @Column(name = "document_key", nullable = false)
    private String documentKey;

    private String kind;

    private String title;

    private String description;

    /**
     * OSS path of the snapshot .fig for this history row.
     */
    private String url;

    @Column(name = "created_by")
    private String createdBy;

    private Long createdAt;

    private Integer isDeleted;

    @PrePersist
    public void prePersist() {
        if (this.id == null) {
            this.id = UUID.randomUUID().toString();
        }
        if (this.isDeleted == null) {
            this.isDeleted = 0;
        }
        if (this.createdAt == null) {
            this.createdAt = System.currentTimeMillis();
        }
    }
}
