package main.java.cn.jongwong.service;

import cn.jongwong.ro.PencilDocumentRequest;
import cn.jongwong.ro.PencilDocumentResponse;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

public interface PencilDocumentService {
    /**
     * 创建文件
     */
    PencilDocumentResponse create(PencilDocumentRequest request);


    /**
     * 更新文件缩略图
     */
    Boolean updateThumbnail(String key, MultipartFile file);

    /**
     * 根据 KEY 查询
     */
    PencilDocumentResponse getByKey(String key);

    /**
     * 获取所有文件列表
     */
    List<PencilDocumentResponse> getAllFiles();

    /**
     * 根据 KEY 更新
     */
    PencilDocumentResponse update(String key, PencilDocumentRequest request);

    /**
     * 根据 KEY 删除 (软删除)
     */
    void delete(String key);
}
