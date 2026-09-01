package cn.jongwong.service;

import cn.jongwong.ro.PencilDocumentVersionListResponse;
import cn.jongwong.ro.PencilDocumentVersionResponse;
import cn.jongwong.ro.UpdateDocumentVersionRequest;
import org.springframework.web.multipart.MultipartFile;

public interface PencilDocumentVersionService {

    PencilDocumentVersionListResponse list(String documentKey, Long namedBefore, Integer namedLimit);

    PencilDocumentVersionResponse create(
            String documentKey,
            String kind,
            String title,
            String description,
            MultipartFile file
    );

    PencilDocumentVersionResponse update(String documentKey, String versionId, UpdateDocumentVersionRequest request);

    PencilDocumentVersionResponse restore(String documentKey, String versionId);
}
