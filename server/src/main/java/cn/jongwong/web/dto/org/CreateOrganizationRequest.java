package cn.jongwong.web.dto.org;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateOrganizationRequest {

    /** Display name (can repeat). org_code is generated server-side. */
    @NotBlank(message = "组织名称不能为空")
    @Size(max = 100)
    private String name;

    @Size(max = 500)
    private String description;

    private String avatar;
}
