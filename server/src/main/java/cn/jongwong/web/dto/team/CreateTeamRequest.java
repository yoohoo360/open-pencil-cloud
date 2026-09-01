package cn.jongwong.web.dto.team;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateTeamRequest {

    @NotBlank(message = "团队名称不能为空")
    @Size(max = 100, message = "团队名称不能超过100个字符")
    private String name;

    @Size(max = 500, message = "团队描述不能超过500个字符")
    private String description;

    private String avatar;

    private List<String> memberIds;
}
