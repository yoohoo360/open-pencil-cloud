package cn.jongwong.service.impl;

import cn.jongwong.common.ConvertUtils;
import cn.jongwong.entity.PencilDocument;
import cn.jongwong.repository.PencilChangeRepository;
import cn.jongwong.repository.PencilDocumentCommentRepository;
import cn.jongwong.repository.PencilDocumentCommentThreadRepository;
import cn.jongwong.repository.PencilDocumentHistoryRepository;
import cn.jongwong.repository.PencilDocumentLibraryRefRepository;
import cn.jongwong.repository.PencilFileRepository;
import cn.jongwong.repository.PencilNodeChangeRepository;
import cn.jongwong.ro.PencilDocumentRequest;
import cn.jongwong.ro.PencilDocumentResponse;
import cn.jongwong.security.SecurityUtils;
import cn.jongwong.service.OssService;
import cn.jongwong.service.PencilDocumentService;
import cn.jongwong.storage.DocumentKeys;
import cn.jongwong.storage.StorageObjectPaths;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.List;

@Service
@Slf4j
public class PencilDocumentServiceImpl implements PencilDocumentService {

    private static final int MAX_RETRY = 8;
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final byte[] BLANK_SCENE_GRAPH_JSON =
            "{\"format\":\"openpencil-scene-graph\",\"version\":1,\"nodes\":{}}".getBytes(StandardCharsets.UTF_8);

    @Autowired
    private OssService ossService;

    @Autowired
    private PencilFileRepository pencilFileRepository;

    @Autowired
    private PencilDocumentHistoryRepository historyRepository;

    @Autowired
    private PencilDocumentCommentThreadRepository commentThreadRepository;

    @Autowired
    private PencilDocumentCommentRepository commentRepository;

    @Autowired
    private PencilDocumentLibraryRefRepository libraryRefRepository;

    @Autowired
    private PencilChangeRepository changeRepository;

    @Autowired
    private PencilNodeChangeRepository nodeChangeRepository;

    @Autowired
    private SecurityUtils securityUtils;

    @Override
    @Transactional
    public PencilDocumentResponse create(PencilDocumentRequest request) {
        String key = generateUniqueKey();
        String directory = StorageObjectPaths.documentDirectory("op", key);
        String storedPath = ossService.upload(directory, StorageObjectPaths.documentJsonFileName(key), BLANK_SCENE_GRAPH_JSON);

        long now = System.currentTimeMillis();
        PencilDocument file = PencilDocument.builder()
                .key(key)
                .name(request.getName())
                .description(request.getDescription())
                .teamId(request.getTeamId())
                .projectId(request.getProjectId())
                .url(storedPath)
                .isDeleted(0)
                .createdAt(now)
                .version("1.0.0")
                .updatedAt(now)
                .build();

        PencilDocument saved = pencilFileRepository.save(file);
        log.info("文件创建成功: key={}, url={}", saved.getKey(), saved.getUrl());
        return ConvertUtils.convert(saved, PencilDocumentResponse.class);
    }

    @Override
    @Transactional
    public Boolean updateThumbnail(String key, MultipartFile file) {
        PencilDocument doc = pencilFileRepository.findByKeyAndIsDeleted(key, 0)
                .orElseThrow(() -> new RuntimeException("文件不存在: " + key));

        String documentUrl = doc.getUrl();
        if (documentUrl == null || documentUrl.isBlank()) {
            throw new RuntimeException("文档存储路径不存在: " + key);
        }
        String directory = StorageObjectPaths.documentFolder(documentUrl);
        String fileName = StorageObjectPaths.THUMBNAIL_FILE_NAME;
        String existing = doc.getThumbnailUrl();
        try {
            String storedPath = ossService.upload(directory, fileName, file.getBytes());
            if (!storedPath.equals(existing)) {
                doc.setThumbnailUrl(storedPath);
            }
            doc.setUpdatedAt(System.currentTimeMillis());
            pencilFileRepository.save(doc);
            return true;
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

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

    @Override
    @Transactional
    public PencilDocumentResponse update(String key, PencilDocumentRequest request) {
        log.info("更新文件: key={}", key);
        PencilDocument existing = pencilFileRepository.findByKeyAndIsDeleted(key, 0)
                .orElseThrow(() -> new RuntimeException("文件不存在: " + key));

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
        log.info("文件更新成功: key={}", key);
        return ConvertUtils.convert(updated, PencilDocumentResponse.class);
    }

    @Override
    @Transactional
    public void delete(String key) {
        log.info("删除文件: key={}", key);
        PencilDocument existing = pencilFileRepository.findByKeyAndIsDeleted(key, 0)
                .orElseThrow(() -> new RuntimeException("文件不存在: " + key));

        commentRepository.deleteByDocumentId(existing.getId());
        commentThreadRepository.deleteByDocumentId(existing.getId());
        historyRepository.deleteByDocumentId(existing.getId());
        libraryRefRepository.deleteByDocumentKey(existing.getKey());
        changeRepository.deleteByFileId(existing.getId());
        nodeChangeRepository.deleteByFileId(existing.getId());

        String folder = StorageObjectPaths.documentFolder(existing.getUrl());
        if (folder != null && !folder.isBlank()) {
            ossService.deletePrefix(folder);
        }

        pencilFileRepository.delete(existing);
        log.info("文件已删除: key={}", key);
    }

    private String generateUniqueKey() {
        for (int i = 0; i < MAX_RETRY; i++) {
            String key = generateRandomKey();
            if (!pencilFileRepository.existsByKeyAndIsDeleted(key, 0)) {
                return key;
            }
            log.warn("KEY 冲突: {}, 重试第 {} 次", key, i + 1);
        }
        throw new RuntimeException("Failed to generate a unique document key");
    }

    private String generateRandomKey() {
        return DocumentKeys.random(RANDOM);
    }
}
