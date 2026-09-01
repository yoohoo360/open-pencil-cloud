package cn.jongwong.web.dto.role;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

/**
 * Response DTO for role information.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoleResponse {

    private String id;
    private String name;
    private String label;
    private String description;
    private List<PermissionResponse> permissions;
    private List<UserSummary> users;
    private Instant createdAt;
    private Instant updatedAt;

    /**
     * Nested DTO for user summary information.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserSummary {
        private String id;
        private String name;
        private String email;
        private String avatar;
    }
}
