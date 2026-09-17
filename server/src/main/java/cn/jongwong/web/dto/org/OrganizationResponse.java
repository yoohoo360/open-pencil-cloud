package cn.jongwong.web.dto.org;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrganizationResponse {

    private String id;
    private String name;
    /** System-generated unique code; immutable. */
    private String orgCode;
    private String description;
    private String avatar;
    private String ownerId;
    private String basePermission;
    private String approvalStatus;
    private Instant createdAt;
    private Instant updatedAt;
    private Long memberCount;
    private Long teamCount;
    private OwnerInfo owner;
    private List<MemberInfo> members;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OwnerInfo {
        private String id;
        private String username;
        private String name;
        private String email;
        private String avatar;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MemberInfo {
        private String userId;
        private String username;
        private String name;
        private String email;
        private String avatar;
        private String roleId;
    }
}
