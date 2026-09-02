package main.java.cn.jongwong.config;

import cn.jongwong.collab.CollabHandshakeInterceptor;
import cn.jongwong.collab.CollabProperties;
import cn.jongwong.collab.CollabWebSocketHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.standard.ServletServerContainerFactoryBean;

@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketConfigurer {

    private final CollabWebSocketHandler collabWebSocketHandler;
    private final CollabProperties collabProperties;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(collabWebSocketHandler, "/ws/collab", "/ws/collab/*", "/ws/collab/**")
                .addInterceptors(new CollabHandshakeInterceptor())
                .setAllowedOriginPatterns("*");
    }

    @Bean
    public ServletServerContainerFactoryBean createWebSocketContainer() {
        ServletServerContainerFactoryBean container = new ServletServerContainerFactoryBean();
        container.setMaxTextMessageBufferSize(collabProperties.getMaxMessageBytes());
        container.setMaxBinaryMessageBufferSize(collabProperties.getMaxMessageBytes());
        container.setMaxSessionIdleTimeout(0L);
        return container;
    }
}
