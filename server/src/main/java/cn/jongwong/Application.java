package cn.jongwong;

import cn.jongwong.auth.AppAuthProperties;
import cn.jongwong.auth.OauthProperties;
import cn.jongwong.collab.CollabProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
@EnableConfigurationProperties({CollabProperties.class, OauthProperties.class, AppAuthProperties.class})
public class Application {

    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
