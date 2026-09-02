package main.java.cn.jongwong.config;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.PropertyAccessor;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.jsontype.impl.LaissezFaireSubTypeValidator;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.Jackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
public class RedisConfig {

    // ==================== 方式一：只影响 Redis 的 ObjectMapper ====================
//
//    /**
//     * Redis 专用 ObjectMapper
//     * - 只用于 Redis 序列化，不影响其他地方
//     * - SNAKE_CASE: camelCase ↔ snake_case
//     * - 支持 LocalDateTime
//     */
//    @Bean
//    public ObjectMapper redisObjectMapper() {
//        ObjectMapper mapper = new ObjectMapper();
//
//        // 1. 命名策略：camelCase ↔ snake_case
//        mapper.setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE);
//
//        // 2. 忽略 null 值
//        mapper.setDefaultPropertyInclusion(JsonInclude.Include.NON_NULL);
//
//        // 3. 不区分大小写属性名
//        mapper.enable(MapperFeature.ACCEPT_CASE_INSENSITIVE_PROPERTIES);
//
//        // 4. 忽略未知属性
//        mapper.disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
//
//        // 5. 禁用日期时间戳（使用 ISO 8601 格式）
//        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
//
//        // 6. 注册 Java 8 时间模块
//        mapper.registerModule(new JavaTimeModule());
//
//        // 7. 可见性设置
//        mapper.setVisibility(PropertyAccessor.ALL, JsonAutoDetect.Visibility.ANY);
//
//        // 8. 启用类型信息（支持多态）
//        mapper.activateDefaultTyping(
//                LaissezFaireSubTypeValidator.instance,
//                ObjectMapper.DefaultTyping.NON_FINAL
//        );
//
//        return mapper;
//    }
//
//    // ==================== RedisTemplate ====================

    @Bean
    public RedisTemplate<String, Object> redisTemplate(
            RedisConnectionFactory factory,
            ObjectMapper redisObjectMapper) {

        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);

        // Jackson2JsonRedisSerializer (新版构造方式)
        Jackson2JsonRedisSerializer<Object> jacksonSerializer =
                new Jackson2JsonRedisSerializer<>(redisObjectMapper, Object.class);

        // Key 序列化 (String)
        StringRedisSerializer stringSerializer = new StringRedisSerializer();
        template.setKeySerializer(stringSerializer);
        template.setHashKeySerializer(stringSerializer);

        // Value 序列化 (JSON)
        template.setValueSerializer(jacksonSerializer);
        template.setHashValueSerializer(jacksonSerializer);

        template.afterPropertiesSet();

        return template;
    }
}