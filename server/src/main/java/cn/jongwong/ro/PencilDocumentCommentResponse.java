package main.java.cn.jongwong.ro;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PencilDocumentCommentResponse {

    private String id;
    private String threadId;
    private String documentId;
    private String documentKey;
    private String body;
    private String createdBy;
    private String createdByName;
    private String createdByAvatar;
    private Long createdAt;
    private Long updatedAt;
}
