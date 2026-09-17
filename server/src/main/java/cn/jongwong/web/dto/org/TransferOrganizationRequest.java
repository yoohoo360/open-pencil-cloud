package cn.jongwong.web.dto.org;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransferOrganizationRequest {

    /** username, email, or user id */
    @NotBlank
    private String newOwner;
}
