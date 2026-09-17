package cn.jongwong.web.dto.invite;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InvitationResponse {

    private String id;
    private String targetType;
    private String targetId;
    private String targetKey;
    private String targetName;
    private String inviteeId;
    private String inviteeName;
    private String inviteeUsername;
    private String inviteeEmail;
    private String inviterId;
    private String inviterName;
    private String inviterUsername;
    private String role;
    private String status;
    private String message;
    private Long createdAt;
    private Long updatedAt;
}
