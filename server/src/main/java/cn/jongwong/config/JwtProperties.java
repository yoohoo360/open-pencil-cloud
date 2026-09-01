package cn.jongwong.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "jwt")
public class JwtProperties {

    private String secret = "jongwong-jwt-secret-key-change-in-production";
    private Long accessTokenExpiration = 900000L; // 15 minutes
    private Long refreshTokenExpiration = 604800000L; // 7 days
    private String issuer = "jongwong";
}
