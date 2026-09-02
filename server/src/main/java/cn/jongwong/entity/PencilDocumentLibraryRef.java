package main.java.cn.jongwong.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "pencil_document_library_ref")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PencilDocumentLibraryRef {
    /**
     * 主键 ID
     */
    @Id
    private String id;

    private String documentKey;

    private String documentVersion;

    private String libraryKey;

    private String libraryVersion;

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