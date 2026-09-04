package cn.jongwong.domain.entity.id;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
@Embeddable
public class DocumentTagId implements Serializable {

    @Column(name = "document_id", nullable = false, length = 36)
    private String documentId;

    @Column(name = "tag_id", nullable = false, length = 36)
    private String tagId;
}
