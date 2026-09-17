package cn.jongwong.web.dto.invite;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateInvitationRequest {

    /** organization | team | document */
    @NotBlank
    private String targetType;

    /** org/team id, or document key/id */
    @NotBlank
    private String targetId;

    /** username, email, or user id */
    @NotBlank
    private String invitee;

    /** member|admin|owner for org/team; read|write|admin for document */
    private String role;

    private String message;
}
