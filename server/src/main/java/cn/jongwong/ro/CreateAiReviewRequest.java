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
public class CreateAiReviewRequest {

    private String title;
    private String status;
    private String historyId;
    private JsonNode payload;
}
