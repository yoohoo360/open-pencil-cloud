package cn.jongwong.dto;

import cn.jongwong.domain.entity.enums.UserStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateUserStatusRequest {
    @NotNull
    private UserStatus status;
}
