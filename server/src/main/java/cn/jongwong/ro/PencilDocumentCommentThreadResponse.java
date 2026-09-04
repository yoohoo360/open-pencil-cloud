package cn.jongwong.ro;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PencilDocumentCommentThreadResponse {

    private String id;
    private String documentId;
    private String documentKey;
    private String pageId;
    private String nodeId;
    private Double x;
    private Double y;
    private boolean resolved;
    private String resolvedBy;
    private String resolvedByName;
    private Long resolvedAt;
    private String createdBy;
    private String createdByName;
    private String createdByAvatar;
    private Long createdAt;
    private Long updatedAt;
    private List<PencilDocumentCommentResponse> comments;
}
