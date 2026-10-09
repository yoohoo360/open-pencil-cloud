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
public class SkillEntryResponse {

    private String id;
    private String skillId;
    private String parentId;
    private String kind;
    private String name;
    private String path;
    private String content;
    private Integer sortOrder;
    private Long createdAt;
    private Long updatedAt;

    @Builder.Default
    private List<SkillEntryResponse> children = new ArrayList<>();
}
