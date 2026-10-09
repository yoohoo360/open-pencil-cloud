package cn.jongwong.ro;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SkillGroupResponse {

    private String id;
    private String groupKey;
    private String name;
    private String description;
    private String ownerId;
    private Boolean ownedByMe;
    private Integer sortOrder;
    private Long createdAt;
    private Long updatedAt;
    private Long skillCount;

    @Builder.Default
    private List<String> teamIds = new ArrayList<>();

    @Builder.Default
    private List<SkillResponse> skills = new ArrayList<>();
}
