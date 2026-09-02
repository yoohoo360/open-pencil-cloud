package main.java.cn.jongwong.service.impl;

import cn.jongwong.config.StorageProperties;
import cn.jongwong.dto.FileInfo;
import cn.jongwong.service.OssService;
import com.aliyun.oss.OSS;
import com.aliyun.oss.OSSClientBuilder;
import com.aliyun.oss.model.ObjectMetadata;
import com.aliyun.oss.model.OSSObject;
import lombok.extern.slf4j.Slf4j;

import java.io.ByteArrayInputStream;
import java.io.InputStream;

@Slf4j
public class AliOssServiceImpl implements OssService {

    private final OSS ossClient;
    private final String bucket;
    private final String basePath;

    public AliOssServiceImpl(StorageProperties properties) {
        StorageProperties.Oss ossConfig = properties.getOss();
        this.ossClient = new OSSClientBuilder()
                .build(ossConfig.getEndpoint(), ossConfig.getAccessKey(), ossConfig.getSecretKey());
        this.bucket = ossConfig.getBucket();
        this.basePath = ossConfig.getBasePath();
        log.info("✅ OSS 存储就绪: bucket={}, basePath={}", bucket, basePath);
    }

    @Override
    public String upload(String path, String fileName, byte[] data) {
        return upload(path, fileName, new ByteArrayInputStream(data));
    }

    @Override
    public String upload(String path, String fileName, InputStream inputStream) {
        try {
            String fullPath = buildPath(path, fileName);
            ossClient.putObject(bucket, fullPath, inputStream);
            log.info("✅ OSS 上传成功: {}", fullPath);
            return fullPath;
        } catch (Exception e) {
            throw new RuntimeException("OSS 上传失败: " + e.getMessage());
        }
    }

    @Override
    public byte[] download(String path) {
        try {
            OSSObject ossObject = ossClient.getObject(bucket, path);
            return ossObject.getObjectContent().readAllBytes();
        } catch (Exception e) {
            throw new RuntimeException("OSS 下载失败: " + e.getMessage());
        }
    }

    @Override
    public InputStream downloadAsStream(String path) {
        try {
            OSSObject ossObject = ossClient.getObject(bucket, path);
            return ossObject.getObjectContent();
        } catch (Exception e) {
            throw new RuntimeException("OSS 下载失败: " + e.getMessage());
        }
    }

    @Override
    public boolean delete(String path) {
        try {
            ossClient.deleteObject(bucket, path);
            log.info("✅ OSS 删除成功: {}", path);
            return true;
        } catch (Exception e) {
            log.error("OSS 删除失败", e);
            return false;
        }
    }

    @Override
    public FileInfo getFileInfo(String path) {
        try {
            ObjectMetadata meta = ossClient.getObjectMetadata(bucket, path);
            return FileInfo.builder()
                    .name(path.substring(path.lastIndexOf("/") + 1))
                    .path(path)
                    .size(meta.getContentLength())
                    .isDirectory(false)
                    .contentType(meta.getContentType())
                    .build();
        } catch (Exception e) {
            log.error("获取信息失败", e);
            return null;
        }
    }


    @Override
    public boolean createDirectory(String path) {
        // OSS 不需要显式创建目录
        log.info("OSS 目录无需创建: {}", path);
        return true;
    }

    @Override
    public boolean move(String fromPath, String toPath) {
        try {
            ossClient.copyObject(bucket, fromPath, bucket, toPath);
            ossClient.deleteObject(bucket, fromPath);
            log.info("✅ OSS 移动成功: {} -> {}", fromPath, toPath);
            return true;
        } catch (Exception e) {
            log.error("OSS 移动失败", e);
            return false;
        }
    }

    @Override
    public boolean copy(String fromPath, String toPath) {
        try {
            ossClient.copyObject(bucket, fromPath, bucket, toPath);
            log.info("✅ OSS 复制成功: {} -> {}", fromPath, toPath);
            return true;
        } catch (Exception e) {
            log.error("OSS 复制失败", e);
            return false;
        }
    }

    @Override
    public boolean exists(String path) {
        try {
            return ossClient.doesObjectExist(bucket, path);
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public String getRootPath() {
        return bucket + "/" + basePath;
    }

    private String buildPath(String path, String fileName) {
        String p = path == null || path.isEmpty() ? "" : path.replaceAll("^/|/$", "");
        String relative = p.isEmpty() ? fileName : p + "/" + fileName;
        return basePath + relative;
    }
}