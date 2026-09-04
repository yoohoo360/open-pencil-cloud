package cn.jongwong.config;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import io.swagger.v3.core.jackson.ModelResolver;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class JacksonConfig {
    @Bean
    public Jackson2ObjectMapperBuilderCustomizer jackson2ObjectMapperBuilderCustomizer() {
        return builder -> {
            // 将 Java 类/字段 保持为驼峰命名（这是 Java 代码风格），
            // 然后把 JSON 的属性命名策略统一为 SNAKE_CASE：
            // - 序列化时：camelCase -> snake_case
            // - 反序列化时：snake_case -> camelCase
            builder.propertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE);

            // 可选：忽略 null 字段、不抛未知字段等（按需开启）
            builder.serializationInclusion(JsonInclude.Include.NON_NULL);

            // 可选：接受不区分大小写的属性名（增加容错）
            builder.featuresToEnable(MapperFeature.ACCEPT_CASE_INSENSITIVE_PROPERTIES);
        };
    }

    // 复用项目中已配置好的全局ObjectMapper
    @Bean
    public ModelResolver modelResolver(ObjectMapper objectMapper) {
        // 强制Swagger使用和Jackson完全一致的SNAKE_CASE命名策略
        objectMapper.setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE);
        return new ModelResolver(objectMapper);
    }

}