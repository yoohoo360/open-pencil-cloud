package cn.jongwong.ro;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SkillResponse {

    private String id;
    private String skillKey;
    private String name;
    private String description;
    private String content;
    private String ownerId;
    private String groupId;
    private String orgId;
    private String teamId;
    private Long createdAt;
    private Long updatedAt;
}
