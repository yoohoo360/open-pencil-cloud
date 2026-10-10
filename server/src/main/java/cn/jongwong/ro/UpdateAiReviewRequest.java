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
public class UpdateAiReviewRequest {

    private String title;
    private String status;
    /** Optional: replace the linked version-history snapshot after a re-run. */
    private String historyId;
    private JsonNode payload;
}
