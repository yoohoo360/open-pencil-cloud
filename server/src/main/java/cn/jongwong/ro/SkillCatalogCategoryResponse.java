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
public class SkillCatalogCategoryResponse {

    /** personal | team */
    private String kind;
    private String teamId;
    private String teamName;

    @Builder.Default
    private List<SkillGroupResponse> groups = new ArrayList<>();
}
