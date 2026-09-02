package main.java.cn.jongwong.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "storage")
public class StorageProperties {

    /**
     * 存储类型: local / oss
     */
    private String type = "local";

    /**
     * 本地存储配置
     */
    private Local local = new Local();

    /**
     * OSS 存储配置
     */
    private Oss oss = new Oss();

    @Data
    public static class Local {
        /**
         * 本地存储根路径
         */
        private String path = "/tmp/file-storage/";
    }

    @Data
    public static class Oss {
        /**
         * OSS Endpoint
         */
        private String endpoint = "oss-cn-hangzhou.aliyuncs.com";

        /**
         * AccessKey ID
         */
        private String accessKey = "your-access-key";

        /**
         * AccessKey Secret
         */
        private String secretKey = "your-secret-key";

        /**
         * Bucket 名称
         */
        private String bucket = "your-bucket";

        /**
         * 文件前缀路径
         */
        private String basePath = "files/";
    }
}