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
public class SkillRO {

    @NotBlank
    private String skillKey;

    @NotBlank
    private String name;

    private String description;

    /** Initial SKILL.md body; defaults to a template when omitted */
    private String content;

    @NotBlank
    private String groupId;

    /** Required for org-scoped key uniqueness */
    private String orgId;
}
