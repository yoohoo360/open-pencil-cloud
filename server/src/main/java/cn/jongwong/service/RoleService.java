package cn.jongwong.service;

import cn.jongwong.domain.entity.Permission;
import cn.jongwong.domain.entity.Role;
import cn.jongwong.domain.entity.RolePermission;
import cn.jongwong.domain.entity.User;
import cn.jongwong.domain.entity.UserRole;
import cn.jongwong.domain.entity.id.RolePermissionId;
import cn.jongwong.domain.entity.id.UserRoleId;
import cn.jongwong.domain.repository.PermissionRepository;
import cn.jongwong.domain.repository.RolePermissionRepository;
import cn.jongwong.domain.repository.RoleRepository;
import cn.jongwong.domain.repository.UserRepository;
import cn.jongwong.domain.repository.UserRoleRepository;
import cn.jongwong.exception.ResourceNotFoundException;
import cn.jongwong.web.dto.role.CreateRoleRequest;
import cn.jongwong.web.dto.role.PermissionResponse;
import cn.jongwong.web.dto.role.RoleResponse;
import cn.jongwong.web.dto.role.UpdateRoleRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for managing roles and role assignments.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RoleService {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final UserRepository userRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final UserRoleRepository userRoleRepository;

    /**
     * Get all roles with their permissions.
     */
    @Transactional(readOnly = true)
    public List<RoleResponse> getAllRoles() {
        log.debug("Fetching all roles");
        return roleRepository.findAll().stream()
                .map(this::mapRoleToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get a role by ID with full details including permissions and users.
     */
    @Transactional(readOnly = true)
    public RoleResponse getRoleById(String id) {
        log.debug("Fetching role by id: {}", id);
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role", "id", id));
        return mapRoleToDetailedResponse(role);
    }

    /**
     * Create a new role with optional permissions.
     */
    @Transactional
    public RoleResponse createRole(CreateRoleRequest request) {
        log.info("Creating new role: {}", request.getName());

        // Check if role name already exists
        if (roleRepository.existsByName(request.getName())) {
            throw new IllegalArgumentException("角色名称已存在: " + request.getName());
        }

        // Create role entity
        Role role = Role.builder()
                .name(request.getName())
                .label(request.getLabel())
                .description(request.getDescription())
                .build();

        role = roleRepository.save(role);
        log.info("Role created with id: {}", role.getId());

        // Assign permissions if provided
        if (request.getPermissionIds() != null && !request.getPermissionIds().isEmpty()) {
            assignPermissionsToRole(role, request.getPermissionIds());
        }

        return mapRoleToResponse(role);
    }

    /**
     * Update an existing role (label and description only).
     */
    @Transactional
    public RoleResponse updateRole(String id, UpdateRoleRequest request) {
        log.info("Updating role: {}", id);

        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role", "id", id));

        // Update fields
        if (request.getLabel() != null) {
            role.setLabel(request.getLabel());
        }
        if (request.getDescription() != null) {
            role.setDescription(request.getDescription());
        }

        role = roleRepository.save(role);
        log.info("Role updated successfully: {}", id);

        return mapRoleToResponse(role);
    }

    /**
     * Delete a role. Cannot delete if users are assigned to it.
     */
    @Transactional
    public void deleteRole(String id) {
        log.info("Attempting to delete role: {}", id);

        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role", "id", id));

        // Check if any users have this role
        long userCount = userRoleRepository.countByRoleId(id);
        if (userCount > 0) {
            throw new IllegalStateException("无法删除角色，因为有 " + userCount + " 个用户被分配了此角色");
        }

        // Delete all role-permission associations
        rolePermissionRepository.deleteByRoleId(id);

        // Delete the role
        roleRepository.delete(role);
        log.info("Role deleted successfully: {}", id);
    }

    /**
     * Assign permissions to a role.
     */
    @Transactional
    public RoleResponse assignPermissions(String roleId, List<String> permissionIds) {
        log.info("Assigning {} permissions to role: {}", permissionIds.size(), roleId);

        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role", "id", roleId));

        // Remove existing permissions
        rolePermissionRepository.deleteByRoleId(roleId);

        // Assign new permissions
        assignPermissionsToRole(role, permissionIds);

        log.info("Permissions assigned successfully to role: {}", roleId);
        return mapRoleToResponse(roleRepository.findById(roleId).orElseThrow());
    }

    /**
     * Assign a role to a user.
     */
    @Transactional
    public void assignRoleToUser(String userId, String roleId) {
        log.info("Assigning role {} to user {}", roleId, userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role", "id", roleId));

        // Check if already assigned
        if (userRoleRepository.existsByUserIdAndRoleId(userId, roleId)) {
            log.warn("User {} already has role {}", userId, roleId);
            return;
        }

        // Create user-role association
        UserRole userRole = UserRole.builder()
                .id(new UserRoleId(userId, roleId))
                .user(user)
                .role(role)
                .build();

        userRoleRepository.save(userRole);
        log.info("Role assigned successfully to user");
    }

    /**
     * Remove a role from a user.
     */
    @Transactional
    public void removeRoleFromUser(String userId, String roleId) {
        log.info("Removing role {} from user {}", roleId, userId);

        // Verify user and role exist
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("User", "id", userId);
        }
        if (!roleRepository.existsById(roleId)) {
            throw new ResourceNotFoundException("Role", "id", roleId);
        }

        userRoleRepository.deleteByUserIdAndRoleId(userId, roleId);
        log.info("Role removed successfully from user");
    }

    /**
     * Assign multiple roles to a user, replacing existing roles.
     */
    @Transactional
    public void assignRolesToUser(String userId, List<String> roleIds) {
        log.info("Assigning {} roles to user {}", roleIds.size(), userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        // Verify all roles exist
        List<Role> roles = roleRepository.findAllById(roleIds);
        if (roles.size() != roleIds.size()) {
            throw new IllegalArgumentException("一个或多个角色ID无效");
        }

        // Remove existing roles
        userRoleRepository.deleteByUserId(userId);

        // Assign new roles
        for (Role role : roles) {
            UserRole userRole = UserRole.builder()
                    .id(new UserRoleId(userId, role.getId()))
                    .user(user)
                    .role(role)
                    .build();
            userRoleRepository.save(userRole);
        }

        log.info("Roles assigned successfully to user");
    }

    /**
     * Helper method to assign permissions to a role.
     */
    private void assignPermissionsToRole(Role role, List<String> permissionIds) {
        List<Permission> permissions = permissionRepository.findAllById(permissionIds);

        if (permissions.size() != permissionIds.size()) {
            throw new IllegalArgumentException("一个或多个权限ID无效");
        }

        for (Permission permission : permissions) {
            RolePermission rolePermission = RolePermission.builder()
                    .id(new RolePermissionId(role.getId(), permission.getId()))
                    .role(role)
                    .permission(permission)
                    .build();
            rolePermissionRepository.save(rolePermission);
        }
    }

    /**
     * Map Role entity to RoleResponse DTO (basic version).
     */
    private RoleResponse mapRoleToResponse(Role role) {
        List<PermissionResponse> permissions = role.getPermissions().stream()
                .map(rp -> PermissionResponse.builder()
                        .id(rp.getPermission().getId())
                        .action(rp.getPermission().getAction())
                        .resource(rp.getPermission().getResource())
                        .description(rp.getPermission().getDescription())
                        .createdAt(rp.getPermission().getCreatedAt())
                        .updatedAt(rp.getPermission().getUpdatedAt())
                        .build())
                .collect(Collectors.toList());

        return RoleResponse.builder()
                .id(role.getId())
                .name(role.getName())
                .label(role.getLabel())
                .description(role.getDescription())
                .permissions(permissions)
                .createdAt(role.getCreatedAt())
                .updatedAt(role.getUpdatedAt())
                .build();
    }

    /**
     * Map Role entity to RoleResponse DTO (detailed version with users).
     */
    private RoleResponse mapRoleToDetailedResponse(Role role) {
        List<PermissionResponse> permissions = role.getPermissions().stream()
                .map(rp -> PermissionResponse.builder()
                        .id(rp.getPermission().getId())
                        .action(rp.getPermission().getAction())
                        .resource(rp.getPermission().getResource())
                        .description(rp.getPermission().getDescription())
                        .createdAt(rp.getPermission().getCreatedAt())
                        .updatedAt(rp.getPermission().getUpdatedAt())
                        .build())
                .collect(Collectors.toList());

        List<RoleResponse.UserSummary> users = role.getUsers().stream()
                .map(ur -> RoleResponse.UserSummary.builder()
                        .id(ur.getUser().getId())
                        .name(ur.getUser().getName())
                        .email(ur.getUser().getEmail())
                        .avatar(ur.getUser().getAvatar())
                        .build())
                .collect(Collectors.toList());

        return RoleResponse.builder()
                .id(role.getId())
                .name(role.getName())
                .label(role.getLabel())
                .description(role.getDescription())
                .permissions(permissions)
                .users(users)
                .createdAt(role.getCreatedAt())
                .updatedAt(role.getUpdatedAt())
                .build();
    }
}
