package main.java.cn.jongwong.web.dto.role;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request DTO for creating a new role.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateRoleRequest {

    @NotBlank(message = "角色名称不能为空")
    @Size(max = 50, message = "角色名称长度不能超过50个字符")
    private String name;

    @NotBlank(message = "角色标签不能为空")
    @Size(max = 100, message = "角色标签长度不能超过100个字符")
    private String label;

    @Size(max = 500, message = "角色描述长度不能超过500个字符")
    private String description;

    private List<String> permissionIds;
}
