package main.java.cn.jongwong.service;

import cn.jongwong.domain.entity.Permission;
import cn.jongwong.domain.entity.User;
import cn.jongwong.domain.repository.PermissionRepository;
import cn.jongwong.domain.repository.UserRepository;
import cn.jongwong.exception.ResourceNotFoundException;
import cn.jongwong.web.dto.role.PermissionResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for managing permissions and permission checks.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PermissionService {

    private final PermissionRepository permissionRepository;
    private final UserRepository userRepository;

    /**
     * Get all permissions in the system.
     */
    @Transactional(readOnly = true)
    public List<PermissionResponse> getAllPermissions() {
        log.debug("Fetching all permissions");
        return permissionRepository.findAll().stream()
                .map(this::mapPermissionToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get a permission by ID.
     */
    @Transactional(readOnly = true)
    public PermissionResponse getPermissionById(String id) {
        log.debug("Fetching permission by id: {}", id);
        Permission permission = permissionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Permission", "id", id));
        return mapPermissionToResponse(permission);
    }

    /**
     * Get all permissions for a specific resource.
     */
    @Transactional(readOnly = true)
    public List<PermissionResponse> getPermissionsByResource(String resource) {
        log.debug("Fetching permissions for resource: {}", resource);
        return permissionRepository.findByResource(resource).stream()
                .map(this::mapPermissionToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get all unique resources that have permissions.
     */
    @Transactional(readOnly = true)
    public List<String> getAllResources() {
        log.debug("Fetching all resources");
        return permissionRepository.findAllResources();
    }

    /**
     * Get all unique actions that exist in permissions.
     */
    @Transactional(readOnly = true)
    public List<String> getAllActions() {
        log.debug("Fetching all actions");
        return permissionRepository.findAllActions();
    }

    /**
     * Check if a user has a specific permission.
     * Supports wildcard matching: "*" matches all, "resource:*" matches all actions on resource.
     */
    @Transactional(readOnly = true)
    public boolean hasPermission(String userId, String action, String resource) {
        log.debug("Checking if user {} has permission {}:{}", userId, action, resource);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        // Get all permissions for the user through their roles
        List<Permission> userPermissions = user.getRoles().stream()
                .flatMap(ur -> ur.getRole().getPermissions().stream())
                .map(rp -> rp.getPermission())
                .distinct()
                .collect(Collectors.toList());

        // Check for matching permissions with wildcard support
        boolean hasPermission = userPermissions.stream()
                .anyMatch(p -> matchesPermission(p.getAction(), p.getResource(), action, resource));

        log.debug("User {} {} permission {}:{}", userId, hasPermission ? "has" : "does not have", action, resource);
        return hasPermission;
    }

    /**
     * Check if a user has any of the specified permissions.
     */
    @Transactional(readOnly = true)
    public boolean hasAnyPermission(String userId, List<String> actionResourcePairs) {
        for (String pair : actionResourcePairs) {
            String[] parts = pair.split(":", 2);
            if (parts.length == 2) {
                if (hasPermission(userId, parts[0], parts[1])) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Get all permissions for a specific user (through their roles).
     */
    @Transactional(readOnly = true)
    public List<PermissionResponse> getUserPermissions(String userId) {
        log.debug("Fetching permissions for user: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        return user.getRoles().stream()
                .flatMap(ur -> ur.getRole().getPermissions().stream())
                .map(rp -> rp.getPermission())
                .distinct()
                .map(this::mapPermissionToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Helper method to match permission with wildcard support.
     * Supports:
     * - "*:*" matches everything
     * - "resource:*" matches all actions on a specific resource
     * - "*:action" matches a specific action on all resources
     * - "resource:action" matches exact permission
     */
    private boolean matchesPermission(String permAction, String permResource, String requiredAction, String requiredResource) {
        // Check for universal permission
        if ("*".equals(permAction) && "*".equals(permResource)) {
            return true;
        }

        // Check for action wildcard on specific resource
        if ("*".equals(permAction) && permResource.equals(requiredResource)) {
            return true;
        }

        // Check for specific action on all resources
        if (permAction.equals(requiredAction) && "*".equals(permResource)) {
            return true;
        }

        // Check for exact match
        if (permAction.equals(requiredAction) && permResource.equals(requiredResource)) {
            return true;
        }

        // Check for wildcard in action (e.g., "users:*" matches "users:view")
        if (permAction.contains("*") && permAction.replace("*", "").equals(requiredAction.substring(0, Math.min(requiredAction.length(), permAction.length() - 1)))) {
            if (permResource.equals(requiredResource) || "*".equals(permResource)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Map Permission entity to PermissionResponse DTO.
     */
    private PermissionResponse mapPermissionToResponse(Permission permission) {
        return PermissionResponse.builder()
                .id(permission.getId())
                .action(permission.getAction())
                .resource(permission.getResource())
                .description(permission.getDescription())
                .createdAt(permission.getCreatedAt())
                .updatedAt(permission.getUpdatedAt())
                .build();
    }
}
