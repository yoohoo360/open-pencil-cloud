package cn.jongwong.service;

import cn.jongwong.ro.CreateDocumentVersionRequest;
import cn.jongwong.ro.PencilDocumentVersionListResponse;
import cn.jongwong.ro.PencilDocumentVersionResponse;
import cn.jongwong.ro.UpdateDocumentVersionRequest;

public interface PencilDocumentVersionService {

    PencilDocumentVersionListResponse list(String documentKey, Long namedBefore, Integer namedLimit);

    /**
     * Allocate a version snapshot path and persist metadata.
     * The client uploads the JSON body (+ binaries) directly to OSS.
     */
    PencilDocumentVersionResponse create(String documentKey, CreateDocumentVersionRequest request);

    PencilDocumentVersionResponse update(String documentKey, String versionId, UpdateDocumentVersionRequest request);

    PencilDocumentVersionResponse restore(String documentKey, String versionId);
}
