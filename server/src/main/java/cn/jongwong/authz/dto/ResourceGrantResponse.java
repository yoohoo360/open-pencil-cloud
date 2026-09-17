package cn.jongwong.authz.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResourceGrantResponse {
    private String id;
    private String principalType;
    private String principalId;
    private String principalName;
    private String principalUsername;
    private String principalEmail;
    private String role;
    private String grantedBy;
    private Long createdAt;
    private Boolean owner;
}
