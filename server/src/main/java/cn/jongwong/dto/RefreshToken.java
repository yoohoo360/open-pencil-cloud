package main.java.cn.jongwong.dto;

import cn.jongwong.domain.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;


@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefreshToken {



    private String userId;

    private String token;

    private Instant expiresAt;

    @Builder.Default
    private Boolean isRevoked = false;

    private String deviceInfo;

    private String ipAddress;

    @CreationTimestamp
    private Instant createdAt;

}
