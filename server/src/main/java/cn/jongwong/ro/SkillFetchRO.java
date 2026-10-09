package cn.jongwong.ro;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SkillFetchRO {

    @NotBlank
    private String teamId;

    @NotBlank
    private String skillKey;

    /** Personal group to place/update the working copy */
    @NotBlank
    private String groupId;

    @NotBlank
    private String orgId;
}
