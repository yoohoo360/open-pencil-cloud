package cn.jongwong.service;

import cn.jongwong.ro.PencilDocumentRequest;
import cn.jongwong.ro.PencilDocumentResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface PencilDocumentService {
    PencilDocumentResponse create(PencilDocumentRequest request);

    Boolean updateThumbnail(String key, MultipartFile file);

    PencilDocumentResponse getByKey(String key);

    /**
     * @param teamId       when set, list org docs for that org (and optionally descendants);
     *                     personal docs are never included
     * @param personalOnly when true, only personal docs (no organization)
     * @param recentOnly   when true, only docs the current user recently opened, sorted by opened_at desc
     */
    List<PencilDocumentResponse> getAllFiles(String teamId, boolean personalOnly, boolean recentOnly);

    PencilDocumentResponse update(String key, PencilDocumentRequest request);

    void delete(String key);
}
