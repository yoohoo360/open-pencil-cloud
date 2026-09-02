package main.java.cn.jongwong.auth;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "oauth")
public class OauthProperties {

    private Provider github = new Provider();
    private Provider google = new Provider();

    @Getter
    @Setter
    public static class Provider {
        private String clientId = "";
        private String clientSecret = "";
    }

    public boolean isConfigured(String provider) {
        Provider config = config(provider);
        return config != null
                && config.getClientId() != null
                && !config.getClientId().isBlank()
                && config.getClientSecret() != null
                && !config.getClientSecret().isBlank();
    }

    public Provider config(String provider) {
        if ("github".equals(provider)) {
            return github;
        }
        if ("google".equals(provider)) {
            return google;
        }
        return null;
    }
}
