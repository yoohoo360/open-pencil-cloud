package main.java.cn.jongwong.auth;

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
     * Public origin of this API, used as the OAuth redirect_uri host.
     */
    private String publicUrl = "http://localhost:8000";
}
