package cn.jongwong.ro;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PencilDocumentAiReviewResponse {

    private String id;
    private String documentId;
    private String documentKey;
    private String title;
    private String status;
    private String historyId;
    private String historyTitle;
    private Long historyCreatedAt;
    private Integer markerCount;
    private Integer commentCount;
    private String createdBy;
    private String createdByName;
    private String createdByAvatar;
    private Long createdAt;
    private String updatedBy;
    private String updatedByName;
    private Long updatedAt;
    /** Present on get/create/update; omitted from list summaries. */
    private JsonNode payload;
}
