package cn.jongwong.service;

import cn.jongwong.domain.entity.Permission;
import cn.jongwong.domain.entity.UserRole;
import cn.jongwong.domain.repository.PermissionRepository;
import cn.jongwong.domain.repository.UserRepository;
import cn.jongwong.domain.repository.UserRoleRepository;
import cn.jongwong.exception.ResourceNotFoundException;
import cn.jongwong.web.dto.role.PermissionResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * System RBAC permissions. Wildcards:
 * - resource=* action=*  → all resources, all ops (* / *:*)
 * - resource=xx action=* → all ops on resource xx (xx:*)
 * - resource=* action=yy → action yy on all resources
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PermissionService {

    private final PermissionRepository permissionRepository;
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;

    @Transactional(readOnly = true)
    public List<PermissionResponse> getAllPermissions() {
        return permissionRepository.findAll().stream()
                .map(this::mapPermissionToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PermissionResponse getPermissionById(String id) {
        Permission permission = permissionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Permission", "id", id));
        return mapPermissionToResponse(permission);
    }

    @Transactional(readOnly = true)
    public List<PermissionResponse> getPermissionsByResource(String resource) {
        return permissionRepository.findByResource(resource).stream()
                .map(this::mapPermissionToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<String> getAllResources() {
        return permissionRepository.findAllResources();
    }

    @Transactional(readOnly = true)
    public List<String> getAllActions() {
        return permissionRepository.findAllActions();
    }

    @Transactional(readOnly = true)
    public boolean hasPermission(String userId, String action, String resource) {
        log.debug("Checking if user {} has permission {}:{}", userId, action, resource);
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("User", "id", userId);
        }
        boolean allowed = loadUserPermissions(userId).stream()
                .anyMatch(p -> matchesPermission(p.getAction(), p.getResource(), action, resource));
        log.debug("User {} {} permission {}:{}", userId, allowed ? "has" : "does not have", action, resource);
        return allowed;
    }

    /**
     * * / *:* → everything; document:* → all ops on documents.
     */
    @Transactional(readOnly = true)
    public boolean hasFullAccess(String userId, String resourceType) {
        if (!StringUtils.hasText(userId)) {
            return false;
        }
        if (hasPermission(userId, "*", "*")) {
            return true;
        }
        return StringUtils.hasText(resourceType) && hasPermission(userId, "*", resourceType);
    }

    @Transactional(readOnly = true)
    public boolean hasAnyPermission(String userId, List<String> actionResourcePairs) {
        for (String pair : actionResourcePairs) {
            String[] parts = pair.split(":", 2);
            if (parts.length == 2 && hasPermission(userId, parts[0], parts[1])) {
                return true;
            }
        }
        return false;
    }

    @Transactional(readOnly = true)
    public List<PermissionResponse> getUserPermissions(String userId) {
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("User", "id", userId);
        }
        return loadUserPermissions(userId).stream()
                .map(this::mapPermissionToResponse)
                .collect(Collectors.toList());
    }

    private List<Permission> loadUserPermissions(String userId) {
        List<UserRole> assignments = userRoleRepository.findByUserId(userId);
        Set<Permission> permissions = new LinkedHashSet<>();
        for (UserRole assignment : assignments) {
            String roleId = assignment.getId() != null ? assignment.getId().getRoleId() : null;
            if (roleId == null && assignment.getRole() != null) {
                roleId = assignment.getRole().getId();
            }
            if (roleId == null) {
                continue;
            }
            permissions.addAll(permissionRepository.findByRoleId(roleId));
        }
        return new ArrayList<>(permissions);
    }

    private boolean matchesPermission(
            String permAction, String permResource, String requiredAction, String requiredResource) {
        String action = permAction == null ? "" : permAction.trim();
        String resource = permResource == null ? "" : permResource.trim();
        String needAction = requiredAction == null ? "" : requiredAction.trim();
        String needResource = requiredResource == null ? "" : requiredResource.trim();

        if ("*".equals(resource) && "*".equals(action)) {
            return true;
        }
        if ("*".equals(action) && resource.equalsIgnoreCase(needResource)) {
            return true;
        }
        if ("*".equals(resource) && action.equalsIgnoreCase(needAction)) {
            return true;
        }
        return resource.equalsIgnoreCase(needResource) && action.equalsIgnoreCase(needAction);
    }

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
