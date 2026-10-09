package cn.jongwong.ro;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SkillGroupTeamRO {

    /** Full replacement set of team ids the group is shared with. */
    private List<String> teamIds;
}
