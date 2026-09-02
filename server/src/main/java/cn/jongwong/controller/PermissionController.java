package main.java.cn.jongwong.controller;

import cn.jongwong.dto.ApiResponse;
import cn.jongwong.security.UserPrincipal;
import cn.jongwong.service.PermissionService;
import cn.jongwong.web.dto.role.PermissionResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controller for permission management and permission checking operations.
 */
@Tag(name = "Permissions", description = "权限管理 API")
@RestController
@RequestMapping("/api/permissions")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class PermissionController {

    private final PermissionService permissionService;

    @Operation(
            summary = "获取所有权限",
            description = "获取系统中所有可用的权限列表"
    )
    @GetMapping
    //@PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<PermissionResponse>> getAllPermissions() {
        List<PermissionResponse> permissions = permissionService.getAllPermissions();
        return ApiResponse.ok(permissions);
    }

    @Operation(
            summary = "根据ID获取权限",
            description = "获取指定权限的详细信息"
    )
    @GetMapping("/{id}")
    //@PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<PermissionResponse> getPermissionById(
            @Parameter(description = "权限ID") @PathVariable String id) {
        PermissionResponse permission = permissionService.getPermissionById(id);
        return ApiResponse.ok(permission);
    }

    @Operation(
            summary = "根据资源获取权限",
            description = "获取特定资源的所有权限"
    )
    @GetMapping("/resource/{resource}")
    //@PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<PermissionResponse>> getPermissionsByResource(
            @Parameter(description = "资源名称") @PathVariable String resource) {
        List<PermissionResponse> permissions = permissionService.getPermissionsByResource(resource);
        return ApiResponse.ok(permissions);
    }

    @Operation(
            summary = "获取所有资源",
            description = "获取系统中所有具有权限的资源名称列表"
    )
    @GetMapping("/resources")
    //@PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<String>> getAllResources() {
        List<String> resources = permissionService.getAllResources();
        return ApiResponse.ok(resources);
    }

    @Operation(
            summary = "获取所有操作",
            description = "获取系统中所有权限操作类型列表"
    )
    @GetMapping("/actions")
    //@PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<String>> getAllActions() {
        List<String> actions = permissionService.getAllActions();
        return ApiResponse.ok(actions);
    }

    @Operation(
            summary = "检查用户权限",
            description = "检查当前用户是否拥有指定的权限"
    )
    @PostMapping("/check")
    public ApiResponse<Boolean> checkPermission(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestBody Map<String, String> request) {
        String action = request.get("action");
        String resource = request.get("resource");

        if (action == null || resource == null) {
            return ApiResponse.fail("action 和 resource 参数不能为空");
        }

        boolean hasPermission = permissionService.hasPermission(
                userPrincipal.getId(),
                action,
                resource
        );

        return ApiResponse.ok(hasPermission);
    }

    @Operation(
            summary = "获取用户权限",
            description = "获取指定用户的所有权限（通过其角色获得）"
    )
    @GetMapping("/users/{userId}")
    @PreAuthorize("hasRole('ADMIN') or #userId == authentication.principal.id")
    public ApiResponse<List<PermissionResponse>> getUserPermissions(
            @Parameter(description = "用户ID") @PathVariable String userId) {
        List<PermissionResponse> permissions = permissionService.getUserPermissions(userId);
        return ApiResponse.ok(permissions);
    }

    @Operation(
            summary = "获取当前用户权限",
            description = "获取当前登录用户的所有权限"
    )
    @GetMapping("/me")
    public ApiResponse<List<PermissionResponse>> getMyPermissions(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        List<PermissionResponse> permissions = permissionService.getUserPermissions(userPrincipal.getId());
        return ApiResponse.ok(permissions);
    }
}
