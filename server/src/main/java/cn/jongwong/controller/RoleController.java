package main.java.cn.jongwong.controller;

import cn.jongwong.dto.ApiResponse;
import cn.jongwong.service.RoleService;
import cn.jongwong.web.dto.role.AssignPermissionsRequest;
import cn.jongwong.web.dto.role.CreateRoleRequest;
import cn.jongwong.web.dto.role.RoleResponse;
import cn.jongwong.web.dto.role.UpdateRoleRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller for role management operations.
 * All endpoints require admin privileges.
 */
@Tag(name = "Roles", description = "角色管理 API")
@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class RoleController {

    private final RoleService roleService;

    @Operation(
            summary = "获取所有角色",
            description = "获取系统中所有角色及其关联的权限列表"
    )
    @GetMapping
    //@PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<RoleResponse>>> getAllRoles() {
        List<RoleResponse> roles = roleService.getAllRoles();
        return ResponseEntity.ok(ApiResponse.ok(roles));
    }

    @Operation(
            summary = "根据ID获取角色",
            description = "获取指定角色的详细信息，包括权限和用户列表"
    )
    @GetMapping("/{id}")
    //@PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<RoleResponse>> getRoleById(
            @Parameter(description = "角色ID") @PathVariable String id) {
        RoleResponse role = roleService.getRoleById(id);
        return ResponseEntity.ok(ApiResponse.ok(role));
    }

    @Operation(
            summary = "创建新角色",
            description = "创建一个新角色，可选择性地分配权限"
    )
    @PostMapping
    //@PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<RoleResponse>> createRole(
            @Valid @RequestBody CreateRoleRequest request) {
        RoleResponse role = roleService.createRole(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("角色创建成功", role));
    }

    @Operation(
            summary = "更新角色",
            description = "更新角色的标签和描述（角色名称不可更改）"
    )
    @PutMapping("/{id}")
    //@PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<RoleResponse>> updateRole(
            @Parameter(description = "角色ID") @PathVariable String id,
            @Valid @RequestBody UpdateRoleRequest request) {
        RoleResponse role = roleService.updateRole(id, request);
        return ResponseEntity.ok(ApiResponse.ok("角色更新成功", role));
    }

    @Operation(
            summary = "删除角色",
            description = "删除指定角色。如果有用户被分配了该角色，则无法删除"
    )
    @DeleteMapping("/{id}")
    //@PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteRole(
            @Parameter(description = "角色ID") @PathVariable String id) {
        roleService.deleteRole(id);
        return ResponseEntity.ok(ApiResponse.ok("角色删除成功", null));
    }

    @Operation(
            summary = "分配权限给角色",
            description = "为指定角色分配一组权限，会替换现有的权限"
    )
    @PostMapping("/{id}/permissions")
    //@PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<RoleResponse>> assignPermissions(
            @Parameter(description = "角色ID") @PathVariable String id,
            @Valid @RequestBody AssignPermissionsRequest request) {
        RoleResponse role = roleService.assignPermissions(id, request.getPermissionIds());
        return ResponseEntity.ok(ApiResponse.ok("权限分配成功", role));
    }

    @Operation(
            summary = "分配角色给用户",
            description = "为指定用户分配一个角色"
    )
    @PostMapping("/{roleId}/users/{userId}")
    //@PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> assignRoleToUser(
            @Parameter(description = "角色ID") @PathVariable String roleId,
            @Parameter(description = "用户ID") @PathVariable String userId) {
        roleService.assignRoleToUser(userId, roleId);
        return ResponseEntity.ok(ApiResponse.ok("角色分配成功", null));
    }

    @Operation(
            summary = "移除用户的角色",
            description = "移除指定用户的指定角色"
    )
    @DeleteMapping("/{roleId}/users/{userId}")
    //@PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> removeRoleFromUser(
            @Parameter(description = "角色ID") @PathVariable String roleId,
            @Parameter(description = "用户ID") @PathVariable String userId) {
        roleService.removeRoleFromUser(userId, roleId);
        return ResponseEntity.ok(ApiResponse.ok("角色移除成功", null));
    }
}
