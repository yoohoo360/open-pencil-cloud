package main.java.cn.jongwong.web.dto.role;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Response DTO for permission information.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PermissionResponse {

    private String id;
    private String action;
    private String resource;
    private String description;
    private Instant createdAt;
    private Instant updatedAt;
}
