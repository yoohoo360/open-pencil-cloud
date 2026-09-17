package cn.jongwong.web.dto.org;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateOrganizationRequest {

    /** Display name (can repeat). org_code cannot be changed. */
    @Size(max = 100)
    private String name;

    @Size(max = 500)
    private String description;

    private String avatar;

    private String basePermission;

    private String approvalStatus;
}
