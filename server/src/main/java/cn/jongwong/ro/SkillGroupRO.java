package cn.jongwong.ro;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SkillGroupRO {

    @NotBlank
    private String name;

    private String description;

    private String groupKey;

    /** Teams this group is shared with (replaces previous set on update when present). */
    private List<String> teamIds;
}
