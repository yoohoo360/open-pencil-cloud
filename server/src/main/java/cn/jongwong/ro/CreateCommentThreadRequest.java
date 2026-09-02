package main.java.cn.jongwong.ro;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCommentThreadRequest {

    private String pageId;
    private String nodeId;
    private Double x;
    private Double y;
    private String body;
}
