package main.java.cn.jongwong.ro;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PencilDocumentVersionResponse {

    private String id;
    private String documentId;
    private String documentKey;
    private String kind;
    private String title;
    private String description;
    private String url;
    private String createdBy;
    private String createdByName;
    private Long createdAt;
}
