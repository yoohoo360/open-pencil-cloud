package cn.jongwong.authz.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccessRequestResponse {
    private String id;
    private String resourceType;
    private String resourceId;
    private String resourceKey;
    private String resourceName;
    private String requesterId;
    private String requesterName;
    private String requesterUsername;
    private String requesterEmail;
    private String requestedRole;
    private String status;
    private String message;
    private String reviewedBy;
    private Long reviewedAt;
    private Long createdAt;
}
