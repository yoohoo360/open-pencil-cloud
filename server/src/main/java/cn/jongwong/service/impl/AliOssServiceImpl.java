package cn.jongwong.service.impl;

import cn.jongwong.config.StorageProperties;
import cn.jongwong.dto.FileInfo;
import cn.jongwong.dto.OssPresignResponse;
import cn.jongwong.service.OssService;
import com.aliyun.oss.HttpMethod;
import com.aliyun.oss.OSS;
import com.aliyun.oss.OSSClientBuilder;
import com.aliyun.oss.model.GeneratePresignedUrlRequest;
import com.aliyun.oss.model.ListObjectsRequest;
import com.aliyun.oss.model.OSSObject;
import com.aliyun.oss.model.OSSObjectSummary;
import com.aliyun.oss.model.ObjectListing;
import com.aliyun.oss.model.ObjectMetadata;
import lombok.extern.slf4j.Slf4j;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.net.URL;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Slf4j
public class AliOssServiceImpl implements OssService {

    private final OSS ossClient;
    private final String bucket;
    private final String basePath;
    private final long presignExpirationMillis;

    public AliOssServiceImpl(StorageProperties properties) {
        StorageProperties.Oss ossConfig = properties.getOss();
        this.ossClient = new OSSClientBuilder()
                .build(ossConfig.getEndpoint(), ossConfig.getAccessKey(), ossConfig.getSecretKey());
        this.bucket = ossConfig.getBucket();
        this.basePath = ossConfig.getBasePath();
        this.presignExpirationMillis = TimeUnit.SECONDS.toMillis(
                Math.max(60, ossConfig.getPresignExpirationSeconds())
        );
        log.info("✅ OSS 存储就绪: bucket={}, basePath={}", bucket, basePath);
    }

    @Override
    public String upload(String path, String fileName, byte[] data) {
        try {
            String fullPath = toObjectKey(path, fileName);
            ObjectMetadata meta = objectMetadata(fileName);
            meta.setContentLength(data.length);
            ossClient.putObject(bucket, fullPath, new ByteArrayInputStream(data), meta);
            log.info("✅ OSS 上传成功: {}", fullPath);
            return fullPath;
        } catch (Exception e) {
            throw new RuntimeException("OSS 上传失败: " + e.getMessage());
        }
    }

    @Override
    public String upload(String path, String fileName, InputStream inputStream) {
        try {
            String fullPath = toObjectKey(path, fileName);
            ObjectMetadata meta = objectMetadata(fileName);
            ossClient.putObject(bucket, fullPath, inputStream, meta);
            log.info("✅ OSS 上传成功: {}", fullPath);
            return fullPath;
        } catch (Exception e) {
            throw new RuntimeException("OSS 上传失败: " + e.getMessage());
        }
    }

    @Override
    public byte[] download(String path) {
        try {
            OSSObject ossObject = ossClient.getObject(bucket, toObjectKey(path));
            return ossObject.getObjectContent().readAllBytes();
        } catch (Exception e) {
            throw new RuntimeException("OSS 下载失败: " + e.getMessage());
        }
    }

    @Override
    public InputStream downloadAsStream(String path) {
        try {
            OSSObject ossObject = ossClient.getObject(bucket, toObjectKey(path));
            return ossObject.getObjectContent();
        } catch (Exception e) {
            throw new RuntimeException("OSS 下载失败: " + e.getMessage());
        }
    }

    @Override
    public boolean delete(String path) {
        try {
            ossClient.deleteObject(bucket, toObjectKey(path));
            log.info("✅ OSS 删除成功: {}", path);
            return true;
        } catch (Exception e) {
            log.error("OSS 删除失败", e);
            return false;
        }
    }

    @Override
    public List<String> list(String prefix) {
        String keyPrefix = toObjectKey(prefix);
        if (!keyPrefix.isEmpty() && !keyPrefix.endsWith("/")) {
            keyPrefix += "/";
        }
        List<String> keys = new ArrayList<>();
        String marker = null;
        try {
            do {
                ListObjectsRequest request = new ListObjectsRequest(bucket)
                        .withPrefix(keyPrefix)
                        .withMarker(marker)
                        .withMaxKeys(1000);
                ObjectListing listing = ossClient.listObjects(request);
                for (OSSObjectSummary summary : listing.getObjectSummaries()) {
                    if (summary.getKey() == null || summary.getKey().endsWith("/")) continue;
                    keys.add(summary.getKey());
                }
                marker = listing.isTruncated() ? listing.getNextMarker() : null;
            } while (marker != null && !marker.isBlank());
            return keys;
        } catch (Exception e) {
            log.error("OSS 列出失败", e);
            return List.of();
        }
    }

    @Override
    public boolean deletePrefix(String prefix) {
        boolean ok = true;
        for (String path : list(prefix)) {
            if (!delete(path)) {
                ok = false;
            }
        }
        return ok;
    }

    @Override
    public FileInfo getFileInfo(String path) {
        try {
            String key = toObjectKey(path);
            ObjectMetadata meta = ossClient.getObjectMetadata(bucket, key);
            int slash = key.lastIndexOf('/');
            return FileInfo.builder()
                    .name(slash >= 0 ? key.substring(slash + 1) : key)
                    .path(key)
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
            ossClient.copyObject(bucket, toObjectKey(fromPath), bucket, toObjectKey(toPath));
            ossClient.deleteObject(bucket, toObjectKey(fromPath));
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
            ossClient.copyObject(bucket, toObjectKey(fromPath), bucket, toObjectKey(toPath));
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
            return ossClient.doesObjectExist(bucket, toObjectKey(path));
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public String getRootPath() {
        return bucket + "/" + basePath;
    }

    @Override
    public OssPresignResponse presignUpload(String path, String fileName, String contentType) {
        try {
            String objectKey = toObjectKey(path, fileName);
            GeneratePresignedUrlRequest request = new GeneratePresignedUrlRequest(
                    bucket,
                    objectKey,
                    HttpMethod.PUT
            );
            request.setExpiration(new Date(System.currentTimeMillis() + presignExpirationMillis));
            Map<String, String> headers = new LinkedHashMap<>();
            if (contentType != null && !contentType.isBlank()) {
                request.setContentType(contentType);
                headers.put("Content-Type", contentType);
            }
            URL url = ossClient.generatePresignedUrl(request);
            return OssPresignResponse.builder()
                    .url(url.toString())
                    .headers(headers.isEmpty() ? null : headers)
                    .key(objectKey)
                    .build();
        } catch (Exception e) {
            throw new RuntimeException("OSS 预签名失败: " + e.getMessage());
        }
    }

    @Override
    public OssPresignResponse presignDownload(String path) {
        try {
            String objectKey = toObjectKey(path);
            GeneratePresignedUrlRequest request = new GeneratePresignedUrlRequest(
                    bucket,
                    objectKey,
                    HttpMethod.GET
            );
            request.setExpiration(new Date(System.currentTimeMillis() + presignExpirationMillis));
            URL url = ossClient.generatePresignedUrl(request);
            return OssPresignResponse.builder()
                    .url(url.toString())
                    .key(objectKey)
                    .build();
        } catch (Exception e) {
            throw new RuntimeException("OSS 预签名失败: " + e.getMessage());
        }
    }

    private String toObjectKey(String path, String fileName) {
        return toObjectKey(join(path, fileName));
    }

    private String toObjectKey(String path) {
        String relative = stripSlashes(path);
        String prefix = stripSlashes(basePath);
        if (relative.isEmpty()) {
            return prefix;
        }
        if (prefix.isEmpty() || relative.equals(prefix) || relative.startsWith(prefix + "/")) {
            return relative;
        }
        return prefix + "/" + relative;
    }

    private static String join(String path, String fileName) {
        String directory = stripSlashes(path);
        String name = stripSlashes(fileName);
        if (name.isEmpty()) {
            throw new IllegalArgumentException("File name is required");
        }
        return directory.isEmpty() ? name : directory + "/" + name;
    }

    private static ObjectMetadata objectMetadata(String fileName) {
        ObjectMetadata meta = new ObjectMetadata();
        String lower = fileName == null ? "" : fileName.toLowerCase();
        if (lower.endsWith(".png")) {
            meta.setContentType("image/png");
            meta.setCacheControl("no-store, no-cache, must-revalidate");
        } else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
            meta.setContentType("image/jpeg");
            meta.setCacheControl("no-store, no-cache, must-revalidate");
        } else if (lower.endsWith(".webp")) {
            meta.setContentType("image/webp");
            meta.setCacheControl("no-store, no-cache, must-revalidate");
        } else if (lower.endsWith(".gif")) {
            meta.setContentType("image/gif");
            meta.setCacheControl("no-store, no-cache, must-revalidate");
        } else if (lower.endsWith(".avif")) {
            meta.setContentType("image/avif");
            meta.setCacheControl("no-store, no-cache, must-revalidate");
        }
        return meta;
    }

    private static String stripSlashes(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value.replaceAll("^/+", "").replaceAll("/+$", "");
    }
}