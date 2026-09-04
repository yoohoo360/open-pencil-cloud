package cn.jongwong.auth;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "app")
public class AppAuthProperties {

    /**
     * Public browser origin of the React app, e.g. http://localhost:8080.
     */
    private String frontendUrl = "http://localhost:8080";

    /**
     * Public origin of this API. OAuth callbacks must use {@link #frontendUrl}
     * so the browser returns through the SPA proxy, not this address.
     */
    private String publicUrl = "http://localhost:8000";

    private Auth auth = new Auth();

    public boolean requireEmailVerification() {
        return auth == null || auth.isRequireEmailVerification();
    }

    @Getter
    @Setter
    public static class Auth {
        /**
         * Local/dev backends set this false so password signup and login
         * skip the email verification code.
         */
        private boolean requireEmailVerification = true;
    }
}
