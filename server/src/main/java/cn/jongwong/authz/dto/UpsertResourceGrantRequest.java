package cn.jongwong.authz.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpsertResourceGrantRequest {
    /** user | team */
    @NotBlank
    private String principalType;

    @NotBlank
    private String principalId;

    /** read | write | admin */
    @NotBlank
    private String role;
}
