package cn.jongwong.config;

import cn.jongwong.service.OssService;
import cn.jongwong.service.impl.AliOssServiceImpl;
import cn.jongwong.service.impl.LocalOssServiceImpl;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Slf4j
@Configuration
public class StorageAutoConfiguration {

    /**
     * 根据 storage.type 条件注册不同的 Bean
     */
    @Bean
    @ConditionalOnProperty(name = "storage.type", havingValue = "local", matchIfMissing = true)
    public OssService localStorageService(StorageProperties properties) {
        log.info("注册本地存储服务: {}", properties.getLocal().getPath());
        return new LocalOssServiceImpl(properties);
    }

    @Bean
    @ConditionalOnProperty(name = "storage.type", havingValue = "oss")
    public OssService ossStorageService(StorageProperties properties) {
        log.info("注册 OSS 存储服务: {}", properties.getOss().getBucket());
        return new AliOssServiceImpl(properties);
    }
}