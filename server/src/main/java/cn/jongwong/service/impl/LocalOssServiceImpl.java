package cn.jongwong.service.impl;

import cn.jongwong.config.StorageProperties;
import cn.jongwong.dto.FileInfo;
import cn.jongwong.dto.OssPresignResponse;
import cn.jongwong.exception.ApiException;
import cn.jongwong.service.OssService;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;

import java.io.*;
import java.nio.file.*;
import java.util.ArrayList;
import java.util.List;


@Slf4j
public class LocalOssServiceImpl implements OssService {

    private final String storagePath;

    public LocalOssServiceImpl(StorageProperties properties) {
        this.storagePath = properties.getLocal().getPath();
    }

    @PostConstruct
    public void init() throws IOException {
        Files.createDirectories(Paths.get(storagePath));
        log.info("✅ 本地存储就绪: {}", storagePath);
    }

    @Override
    public String upload(String path, String fileName, byte[] data) {
        return upload(path, fileName, new ByteArrayInputStream(data));
    }

    @Override
    public String upload(String path, String fileName, InputStream inputStream) {
        try {
            String fullPath = buildPath(path, fileName);
            Path target = Paths.get(storagePath, fullPath);
            Files.createDirectories(target.getParent());
            Files.copy(inputStream, target, StandardCopyOption.REPLACE_EXISTING);
            log.info("✅ 上传成功: {}", fullPath);
            return fullPath;
        } catch (Exception e) {
            throw new RuntimeException("上传失败: " + e.getMessage());
        }
    }

    @Override
    public byte[] download(String path) {
        try {
            Path file = Paths.get(storagePath, path);
            if (!Files.exists(file)) {
                throw new RuntimeException("文件不存在: " + path);
            }
            return Files.readAllBytes(file);
        } catch (Exception e) {
            throw new RuntimeException("下载失败: " + e.getMessage());
        }
    }

    @Override
    public InputStream downloadAsStream(String path) {
        try {
            Path file = Paths.get(storagePath, path);
            if (!Files.exists(file)) {
                throw new RuntimeException("文件不存在: " + path);
            }
            return Files.newInputStream(file);
        } catch (Exception e) {
            throw new RuntimeException("下载失败: " + e.getMessage());
        }
    }

    @Override
    public boolean delete(String path) {
        try {
            Path file = Paths.get(storagePath, path);
            if (!Files.exists(file)) {
                return false;
            }
            Files.delete(file);
            log.info("✅ 删除成功: {}", path);
            return true;
        } catch (Exception e) {
            log.error("删除失败", e);
            return false;
        }
    }

    @Override
    public List<String> list(String prefix) {
        Path root = Paths.get(storagePath).toAbsolutePath().normalize();
        Path dir = root.resolve(stripSlashes(prefix)).normalize();
        if (!dir.startsWith(root) || !Files.isDirectory(dir)) {
            return List.of();
        }
        List<String> paths = new ArrayList<>();
        try (var stream = Files.walk(dir)) {
            stream.filter(Files::isRegularFile).forEach(child -> paths.add(relativePath(child)));
        } catch (Exception e) {
            log.error("列出文件失败", e);
            return List.of();
        }
        return paths;
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
            Path file = Paths.get(storagePath, path);
            if (!Files.exists(file)) {
                return null;
            }
            return buildFileInfo(file, path);
        } catch (Exception e) {
            log.error("获取信息失败", e);
            return null;
        }
    }

    @Override
    public boolean createDirectory(String path) {
        try {
            Path dir = Paths.get(storagePath, path);
            Files.createDirectories(dir);
            log.info("✅ 创建目录: {}", path);
            return true;
        } catch (Exception e) {
            log.error("创建目录失败", e);
            return false;
        }
    }

    @Override
    public boolean move(String fromPath, String toPath) {
        try {
            Path source = Paths.get(storagePath, fromPath);
            Path target = Paths.get(storagePath, toPath);
            if (!Files.exists(source)) {
                return false;
            }
            Files.createDirectories(target.getParent());
            Files.move(source, target, StandardCopyOption.REPLACE_EXISTING);
            log.info("✅ 移动成功: {} -> {}", fromPath, toPath);
            return true;
        } catch (Exception e) {
            log.error("移动失败", e);
            return false;
        }
    }

    @Override
    public boolean copy(String fromPath, String toPath) {
        try {
            Path source = Paths.get(storagePath, fromPath);
            Path target = Paths.get(storagePath, toPath);
            if (!Files.exists(source)) {
                return false;
            }
            Files.createDirectories(target.getParent());
            Files.copy(source, target, StandardCopyOption.REPLACE_EXISTING);
            log.info("✅ 复制成功: {} -> {}", fromPath, toPath);
            return true;
        } catch (Exception e) {
            log.error("复制失败", e);
            return false;
        }
    }

    @Override
    public boolean exists(String path) {
        return Files.exists(Paths.get(storagePath, path));
    }

    @Override
    public String getRootPath() {
        return storagePath;
    }

    @Override
    public OssPresignResponse presignUpload(String path, String fileName, String contentType) {
        throw ApiException.badRequest("Direct upload is not supported for local storage");
    }

    @Override
    public OssPresignResponse presignDownload(String path) {
        throw ApiException.badRequest("Direct download is not supported for local storage");
    }

    private String relativePath(Path file) {
        Path root = Paths.get(storagePath).toAbsolutePath().normalize();
        Path absolute = file.toAbsolutePath().normalize();
        return root.relativize(absolute).toString().replace('\\', '/');
    }

    private String buildPath(String path, String fileName) {
        if (path == null || path.isEmpty()) {
            return fileName;
        }
        return path.replaceAll("^/|/$", "") + "/" + fileName;
    }

    private static String stripSlashes(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value.replaceAll("^/+", "").replaceAll("/+$", "");
    }

    private FileInfo buildFileInfo(Path path, String base) {
        try {
            String relative = path.toString().replace(storagePath, "").replaceAll("^/", "");
            return FileInfo.builder()
                    .name(path.getFileName().toString())
                    .path(relative)
                    .size(Files.size(path))
                    .isDirectory(Files.isDirectory(path))
                    .contentType(Files.probeContentType(path))
                    .build();
        } catch (Exception e) {
            return FileInfo.builder()
                    .name(path.getFileName().toString())
                    .isDirectory(true)
                    .build();
        }
    }
}