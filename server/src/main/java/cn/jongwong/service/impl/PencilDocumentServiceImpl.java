package cn.jongwong.service.impl;

import cn.jongwong.common.ConvertUtils;
import cn.jongwong.entity.PencilDocument;
import cn.jongwong.repository.PencilFileRepository;
import cn.jongwong.ro.PencilDocumentRequest;
import cn.jongwong.ro.PencilDocumentResponse;
import cn.jongwong.service.PencilDocumentService;
import cn.jongwong.service.OssService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.List;

@Service
@Slf4j
public class PencilDocumentServiceImpl implements PencilDocumentService {

    private static final int KEY_LENGTH = 8;
    private static final int MAX_RETRY = 5;

    private static final String ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    private static final SecureRandom RANDOM = new SecureRandom();
    @Autowired
    private OssService ossService;

    @Autowired
    private PencilFileRepository pencilFileRepository;

    // ==================== 创建 ====================

    @Override
    @Transactional
    public PencilDocumentResponse create(PencilDocumentRequest request) {
        String key = generateUniqueKey(request.getName(), Instant.now());
        // 检查 KEY 是否已存在
        if (pencilFileRepository.existsByKeyAndIsDeleted(key, 0)) {
            throw new RuntimeException("文件 KEY 已存在: " + key);
        }

        long now = System.currentTimeMillis();

        PencilDocument file = PencilDocument.builder()
                .key(key)
                .name(request.getName())
                .description(request.getDescription())
                .teamId(request.getTeamId())
                .projectId(request.getProjectId())
                .thumbnailUrl("/dev-static/img/" + key + ".png")
                .version(request.getVersion())
                .url("/" + key + "/" + request.getName() + ".fig")
                .isDeleted(0)
                .createdAt(now)
                .version("1.0.0")
                .updatedAt(now)
                .build();


        PencilDocument saved = pencilFileRepository.save(file);
        log.info("✅ 文件创建成功: key={}", saved.getKey());

        return ConvertUtils.convert(saved, PencilDocumentResponse.class);
    }

    @Override
    public Boolean updateThumbnail(String key, MultipartFile file) {
        PencilDocument doc = pencilFileRepository.findByKeyAndIsDeleted(key, 0)
                .orElseThrow(() -> new RuntimeException("文件不存在: " + key));

        // 从 URL 中提取路径和文件名
        String url = doc.getThumbnailUrl();
        String path = url.substring(0, url.lastIndexOf('/'));
        String fileName = url.substring(url.lastIndexOf('/') + 1);
        try {
            ossService.upload(path, fileName, file.getBytes());
            return true;
        } catch (IOException e) {
            throw new RuntimeException(e);
        }

    }

    // ==================== 查询 ====================

    @Override
    public PencilDocumentResponse getByKey(String key) {
        log.debug("根据 KEY 查询文件: {}", key);

        PencilDocument file = pencilFileRepository.findByKeyAndIsDeleted(key, 0)
                .orElseThrow(() -> new RuntimeException("文件不存在: " + key));

        return ConvertUtils.convert(file, PencilDocumentResponse.class);
    }

    @Override
    public List<PencilDocumentResponse> getAllFiles() {
        log.debug("获取所有文件列表");

        List<PencilDocument> files = pencilFileRepository.findByIsDeletedOrderByUpdatedAtDesc(0);

        return ConvertUtils.convertList(files, PencilDocumentResponse.class);
    }

    // ==================== 更新 ====================

    @Override
    @Transactional
    public PencilDocumentResponse update(String key, PencilDocumentRequest request) {
        log.info("更新文件: key={}", key);

        // 根据 KEY 查找文件
        PencilDocument existing = pencilFileRepository.findByKeyAndIsDeleted(key, 0)
                .orElseThrow(() -> new RuntimeException("文件不存在: " + key));

        // 更新字段
        if (request.getName() != null) {
            existing.setName(request.getName());
        }
        if (request.getDescription() != null) {
            existing.setDescription(request.getDescription());
        }
        if (request.getTeamId() != null) {
            existing.setTeamId(request.getTeamId());
        }
        if (request.getProjectId() != null) {
            existing.setProjectId(request.getProjectId());
        }

        if (request.getVersion() != null) {
            existing.setVersion(request.getVersion());
        }

        existing.setUpdatedAt(System.currentTimeMillis());

        PencilDocument updated = pencilFileRepository.save(existing);
        log.info("✅ 文件更新成功: key={}", key);

        return ConvertUtils.convert(updated, PencilDocumentResponse.class);
    }

    // ==================== 删除 ====================

    @Override
    @Transactional
    public void delete(String key) {
        log.info("删除文件: key={}", key);

        // 根据 KEY 查找文件
        PencilDocument existing = pencilFileRepository.findByKeyAndIsDeleted(key, 0)
                .orElseThrow(() -> new RuntimeException("文件不存在: " + key));

        // 软删除
        existing.setIsDeleted(1);
        existing.setUpdatedAt(System.currentTimeMillis());

        pencilFileRepository.save(existing);
        log.info("✅ 文件已删除: key={}", key);
    }

    /**
     * 生成唯一 Key
     * 入参: userId + 创建时间
     */
    private String generateUniqueKey(String userId, Instant createTime) {
        for (int i = 0; i < MAX_RETRY; i++) {
            String key = generateKeyByUserAndTime(userId, createTime);
            if (!pencilFileRepository.existsByKeyAndIsDeleted(key, 0)) {
                return key;
            }
            log.warn("KEY 冲突: {}, 重试第 {} 次", key, i + 1);
        }
        // 重试失败，使用纯随机
        return generateRandomKey(KEY_LENGTH);
    }

    /**
     * 生成纯随机 Key
     */
    private String generateRandomKey(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        }
        return sb.toString();
    }

    private String generateKeyByUserAndTime(String userId, Instant timestamp) {
        // 加入随机数防止同一毫秒重复
        int random = RANDOM.nextInt(10000);
        String source = userId + "_" + timestamp.toEpochMilli() + "_" + random;
        String hash = sha256(source);
        return toShortKey(hash, KEY_LENGTH);
    }

    /**
     * SHA-256 哈希 (byte[] → String)
     */
    private String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(input.getBytes(StandardCharsets.UTF_8));

            // byte[] → 十六进制 String
            StringBuilder hexString = new StringBuilder();
            for (byte b : hashBytes) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("Hash 生成失败", e);
        }
    }

    /**
     * Hash 转短 Key
     */
    private String toShortKey(String hash, int length) {
        // 取前 16 位十六进制转数字
        String sub = hash.substring(0, Math.min(16, hash.length()));
        long num = Long.parseLong(sub, 16);

        StringBuilder sb = new StringBuilder();
        while (num > 0 && sb.length() < length) {
            sb.insert(0, ALPHABET.charAt((int) (num % 62)));
            num /= 62;
        }

        // 补齐长度
        while (sb.length() < length) {
            sb.insert(0, ALPHABET.charAt(RANDOM.nextInt(62)));
        }

        return sb.toString();
    }
}