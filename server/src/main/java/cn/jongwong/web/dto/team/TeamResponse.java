package cn.jongwong.web.dto.team;

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
public class TeamResponse {

    private String id;
    private String name;
    private String description;
    private String avatar;
    private String ownerId;
    private Instant createdAt;
    private Instant updatedAt;
    private OwnerInfo owner;
    private List<TeamMemberResponse> members;
    private Long memberCount;

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
}
