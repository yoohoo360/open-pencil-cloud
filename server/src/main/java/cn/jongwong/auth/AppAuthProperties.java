package cn.jongwong.auth;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "app")
public class AppAuthProperties {

    /**
     * Default React app origin when the OAuth start request does not send one.
     */
    private String frontendUrl = "http://localhost:8080";

    /**
     * Public origin of this API. GitHub/Google {@code redirect_uri} must hit
     * this host; the browser is then sent back to an allowlisted frontend.
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
