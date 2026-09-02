package main.java.cn.jongwong.controller;

import cn.jongwong.domain.entity.User;
import cn.jongwong.dto.FileInfo;
import cn.jongwong.service.OssService;
import io.swagger.v3.oas.annotations.Hidden;
import jakarta.annotation.security.PermitAll;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * 首页控制器
 * 提供美观的首页和健康检查端点
 */
@RestController
@Hidden // 不显示在 Swagger 文档中
@Slf4j
public class HomeController {


    @Autowired
    private RedisTemplate<String, Object> redisTemplate;


    @Value("${spring.application.name:Jongwong API}")
    private String appName;

    @Value("${spring.profiles.active:dev}")
    private String environment;


    @Autowired
    private OssService storageService;

    /**
     * 首页 - 美观的 HTML 页面
     */
    @GetMapping(value = "/", produces = MediaType.TEXT_HTML_VALUE)
    public String home() {
        return "OK";
    }


    @GetMapping("/cache")
    public String cache() {
        User user = User.builder()
                .id(UUID.randomUUID().toString())
                .name("张三")
                .build();

        // 存 Redis: camelCase → snake_case
        redisTemplate.opsForValue().set("1", user);
        return "OK";
    }


    @GetMapping("/cache/{id}")
    public User get(@PathVariable Long id) {
        // 取 Redis: snake_case → camelCase
        return (User) redisTemplate.opsForValue().get("user:" + id);
    }

    /**
     * 健康检查端点
     */
    @GetMapping("/health")
    public Map<String, Object> health() {
        Map<String, Object> health = new HashMap<>();
        health.put("name", appName);
        health.put("version", "1.0.0");
        health.put("environment", environment);
        health.put("status", "ok");
        health.put("timestamp", Instant.now().toString());
        health.put("database", "Use /actuator/health to check database connection");
        return health;
    }

}
