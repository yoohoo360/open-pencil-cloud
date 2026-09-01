package cn.jongwong.controller;

import cn.jongwong.domain.entity.enums.UserStatus;
import cn.jongwong.dto.*;
import cn.jongwong.security.UserPrincipal;
import cn.jongwong.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Tag(name = "Users", description = "User management API endpoints")
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class UserController {

    private final UserService userService;

    // ==================== 查询 ====================

    @Operation(summary = "Get all users", description = "Retrieve all users with optional filtering and pagination (Admin only)")
    @GetMapping
    //@PreAuthorize("hasRole('ADMIN')")
    public ApiPageResponse<UserDTO> getAllUsers(
            @RequestParam(required = false) UserStatus status,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<UserDTO> users = userService.getAllUsers(status, search, pageable);
        return ApiPageResponse.success(users);
    }

    @Operation(summary = "Get user by ID", description = "Retrieve a user by their ID")
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or #id == authentication.principal.id")
    public ApiResponse<UserDTO> getUserById(@PathVariable String id) {
        UserDTO user = userService.getUserById(id);
        return ApiResponse.ok(user);
    }

    @Operation(summary = "Get current user", description = "Retrieve authenticated user's information")
    @GetMapping("/me")
    public ApiResponse<UserDTO> getCurrentUser(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        UserDTO user = userService.getUserById(userPrincipal.getId());
        return ApiResponse.ok(user);
    }

    // ==================== 更新 ====================

    @Operation(summary = "Update user", description = "Update user information")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or #id == authentication.principal.id")
    public ApiResponse<UserDTO> updateUser(
            @PathVariable String id,
            @RequestBody UserDTO userDTO) {
        UserDTO updatedUser = userService.updateUser(id, userDTO);
        return ApiResponse.ok("User updated successfully", updatedUser);
    }

    @Operation(summary = "Update user status", description = "Update user status (Admin only)")
    @PatchMapping("/{id}/status")
    //@PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<UserDTO> updateUserStatus(
            @PathVariable String id,
            @RequestBody UpdateUserStatusRequest request) {
        UserDTO updated = userService.updateStatus(id, request.getStatus());
        return ApiResponse.ok("User status updated successfully", updated);
    }

    @Operation(summary = "Change password", description = "Change user's password")
    @PostMapping("/{id}/change-password")
    @PreAuthorize("#id == authentication.principal.id")
    public ApiResponse<Void> changePassword(
            @PathVariable String id,
            @RequestBody Map<String, String> passwordData) {
        String oldPassword = passwordData.get("oldPassword");
        String newPassword = passwordData.get("newPassword");
        userService.changePassword(id, oldPassword, newPassword);
        return ApiResponse.ok("Password changed successfully");
    }

    // ==================== 删除 ====================

    @Operation(summary = "Delete user", description = "Deactivate a user (Admin only)")
    @DeleteMapping("/{id}")
    //@PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.OK)
    public ApiResponse<Void> deleteUser(@PathVariable String id) {
        userService.deleteUser(id);
        return ApiResponse.ok("User deactivated successfully");
    }

    @Operation(summary = "Batch delete users", description = "Batch deactivate users (Admin only)")
    @PostMapping("/batch-delete")
    //@PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Map<String, Integer>> batchDeleteUsers(
            @RequestBody BatchDeleteRequest request) {
        int count = userService.batchDeactivate(request.getIds());
        return ApiResponse.ok("Users deactivated", Map.of("count", count));
    }
}