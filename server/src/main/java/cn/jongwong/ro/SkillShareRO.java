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
public class SkillShareRO {

    @NotBlank
    private String teamId;

    private String title;

    private String message;
}
