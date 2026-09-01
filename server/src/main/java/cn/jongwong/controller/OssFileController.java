package cn.jongwong.controller;

import cn.jongwong.dto.FileInfo;
import cn.jongwong.service.OssService;
import jakarta.annotation.security.PermitAll;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;

@Slf4j
@RestController
@RequestMapping("/api/oss")
@RequiredArgsConstructor
public class OssFileController {


    @Autowired
    private OssService storageService;

    // ==================== 上传 ====================

    /**
     * 上传文件
     * POST /files/upload?path=docs
     */
    @PostMapping("/upload")
    public ResponseEntity<FileInfo> upload(
            @RequestParam(value = "path", required = false) String path,
            @RequestParam("file") MultipartFile file) {
        try {
            String fileName = file.getOriginalFilename();
            byte[] data = file.getBytes();

            String filePath = storageService.upload(path, fileName, data);
            FileInfo fileInfo = storageService.getFileInfo(filePath);
            System.out.printf("=============filePath===========%s%n", filePath);
            log.info("上传成功: {}", filePath);
            return ResponseEntity.ok(fileInfo);

        } catch (IOException e) {
            log.error("上传失败", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 上传文件到指定路径（路径在 URL 中）
     * POST /files/upload/docs
     */
    @PostMapping("/upload/{path}")
    public ResponseEntity<FileInfo> uploadToPath(
            @PathVariable String path,
            @RequestParam("file") MultipartFile file) {
        try {
            String fileName = file.getOriginalFilename();
            byte[] data = file.getBytes();

            String filePath = storageService.upload(path, fileName, data);
            FileInfo fileInfo = storageService.getFileInfo(filePath);

            log.info("✅ 上传成功: {}", filePath);
            return ResponseEntity.ok(fileInfo);

        } catch (IOException e) {
            log.error("上传失败", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ==================== 下载 ====================

    /**
     * 下载文件
     * GET /api/oss/download?path=docs/test.txt
     */
    @GetMapping("/download")
    public ResponseEntity<byte[]> download(@RequestParam String path) {
        try {
            byte[] data = storageService.download(path);
            FileInfo info = storageService.getFileInfo(path);

            if (info == null) {
                return ResponseEntity.notFound().build();
            }

            String fileName = URLEncoder.encode(info.getName(), StandardCharsets.UTF_8)
                    .replaceAll("\\+", "%20");

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename*=UTF-8''" + fileName)
                    .body(data);

        } catch (Exception e) {
            log.error("下载失败", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 下载文件（流式，适合大文件）
     * GET /files/download/stream?path=docs/test.txt
     */
    @GetMapping("/download/stream")
    public ResponseEntity<InputStream> downloadStream(@RequestParam String path) {
        try {
            InputStream inputStream = storageService.downloadAsStream(path);
            FileInfo info = storageService.getFileInfo(path);

            if (info == null) {
                return ResponseEntity.notFound().build();
            }

            String fileName = URLEncoder.encode(info.getName(), StandardCharsets.UTF_8)
                    .replaceAll("\\+", "%20");

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename*=UTF-8''" + fileName)
                    .body(inputStream);

        } catch (Exception e) {
            log.error("下载失败", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ==================== 预览 ====================

    /**
     * 预览文件（直接显示）
     * GET /files/preview?path=docs/test.txt
     */
    @GetMapping("/preview")
    public ResponseEntity<byte[]> preview(@RequestParam String path) {
        try {
            byte[] data = storageService.download(path);
            FileInfo info = storageService.getFileInfo(path);

            if (info == null) {
                return ResponseEntity.notFound().build();
            }

            MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
            if (info.getContentType() != null) {
                try {
                    mediaType = MediaType.parseMediaType(info.getContentType());
                } catch (Exception e) {
                    // ignore
                }
            }

            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .body(data);

        } catch (Exception e) {
            log.error("预览失败", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ==================== 删除 ====================

    /**
     * 删除文件
     * DELETE /files/delete?path=docs/test.txt
     */
    @DeleteMapping("/delete")
    public ResponseEntity<Void> delete(@RequestParam String path) {
        try {
            boolean deleted = storageService.delete(path);
            if (deleted) {
                log.info("✅ 删除成功: {}", path);
                return ResponseEntity.ok().build();
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            log.error("删除失败", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ==================== 查询 ====================

    /**
     * 获取文件信息
     * GET /files/info?path=docs/test.txt
     */
    @GetMapping("/info")
    public ResponseEntity<FileInfo> getInfo(@RequestParam String path) {
        try {
            FileInfo info = storageService.getFileInfo(path);
            if (info == null) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(info);
        } catch (Exception e) {
            log.error("获取信息失败", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }


    /**
     * 检查文件是否存在
     * GET /files/exists?path=docs/test.txt
     */
    @GetMapping("/exists")
    public ResponseEntity<Boolean> exists(@RequestParam String path) {
        try {
            boolean exists = storageService.exists(path);
            return ResponseEntity.ok(exists);
        } catch (Exception e) {
            log.error("检查存在失败", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ==================== 目录操作 ====================

    /**
     * 创建目录
     * POST /files/mkdir?path=docs/archive
     */
    @PostMapping("/mkdir")
    public ResponseEntity<Void> createDirectory(@RequestParam String path) {
        try {
            boolean created = storageService.createDirectory(path);
            if (created) {
                log.info("✅ 创建目录成功: {}", path);
                return ResponseEntity.ok().build();
            } else {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
            }
        } catch (Exception e) {
            log.error("创建目录失败", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ==================== 移动/复制 ====================

    /**
     * 移动/重命名文件
     * POST /files/move?from=docs/a.txt&to=archive/a.txt
     */
    @PostMapping("/move")
    public ResponseEntity<Void> move(
            @RequestParam("from") String fromPath,
            @RequestParam("to") String toPath) {
        try {
            boolean moved = storageService.move(fromPath, toPath);
            if (moved) {
                log.info("✅ 移动成功: {} -> {}", fromPath, toPath);
                return ResponseEntity.ok().build();
            } else {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
            }
        } catch (Exception e) {
            log.error("移动失败", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 复制文件
     * POST /files/copy?from=docs/a.txt&to=backup/a.txt
     */
    @PostMapping("/copy")
    public ResponseEntity<Void> copy(
            @RequestParam("from") String fromPath,
            @RequestParam("to") String toPath) {
        try {
            boolean copied = storageService.copy(fromPath, toPath);
            if (copied) {
                log.info("✅ 复制成功: {} -> {}", fromPath, toPath);
                return ResponseEntity.ok().build();
            } else {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
            }
        } catch (Exception e) {
            log.error("复制失败", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ==================== 系统信息 ====================

    /**
     * 获取存储根路径
     * GET /files/root
     */
    @GetMapping("/root")
    public ResponseEntity<String> getRootPath() {
        return ResponseEntity.ok(storageService.getRootPath());
    }

    /**
     * 获取存储总大小
     * GET /files/total-size
     */
    @GetMapping("/total-size")
    public ResponseEntity<String> getTotalSize() {
        try {
            // 需要 StorageService 添加 getTotalSize 方法
            // long size = storageService.getTotalSize();
            // return ResponseEntity.ok(FileSizeUtil.byteCountToDisplaySize(size));
            return ResponseEntity.ok("功能待实现");
        } catch (Exception e) {
            log.error("获取总大小失败", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }


}