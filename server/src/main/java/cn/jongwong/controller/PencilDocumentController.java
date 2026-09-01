package cn.jongwong.controller;

import cn.jongwong.dto.ApiResponse;
import cn.jongwong.entity.PencilDocumentLibraryRef;
import cn.jongwong.entity.PencilLibrary;
import cn.jongwong.repository.PencilDocumentLibraryRefRepository;
import cn.jongwong.repository.PencilLibraryRepository;
import cn.jongwong.ro.PencilDocumentRequest;
import cn.jongwong.ro.PencilDocumentResponse;
import cn.jongwong.ro.UpdateDocumentLibraryRefRO;
import cn.jongwong.service.PencilDocumentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/document")
@RequiredArgsConstructor
public class PencilDocumentController {

    @Autowired
    private PencilDocumentService pencilDocumentService;


    @GetMapping("/list")
    public ApiResponse<List<PencilDocumentResponse>> getAllFiles() {
        return ApiResponse.ok(pencilDocumentService.getAllFiles());
    }

    @PostMapping
    public ApiResponse<PencilDocumentResponse> create(@Valid @RequestBody PencilDocumentRequest request) {
        return ApiResponse.ok(pencilDocumentService.create(request));
    }

    @GetMapping("/{key}")
    public ApiResponse<PencilDocumentResponse> getByKey(@PathVariable String key) {
        return ApiResponse.ok(pencilDocumentService.getByKey(key));
    }

    @PutMapping("/{key}")
    public ApiResponse<PencilDocumentResponse> update(
            @PathVariable String key,
            @Valid @RequestBody PencilDocumentRequest request) {
        return ApiResponse.ok(pencilDocumentService.update(key, request));
    }

    /**
     * 更新库的缩略图
     */
    @PutMapping("/{key}/thumbnail")
    public ApiResponse<Boolean> updateThumbnailUrl(
            @PathVariable String key,
            @RequestParam("file") MultipartFile file) {

        return ApiResponse.ok(pencilDocumentService.updateThumbnail(key, file));
    }

    @DeleteMapping("/{key}")
    public ApiResponse<Void> delete(@PathVariable String key) {
        pencilDocumentService.delete(key);
        return ApiResponse.ok();
    }

    @Autowired
    private PencilDocumentLibraryRefRepository pencilDocumentLibraryRefRepository;
    @Autowired
    private PencilLibraryRepository pencilLibraryRepository;

    @GetMapping("/{documentKey}/library")
    public ApiResponse<List<PencilLibrary>> getByLibraryKey(
            @PathVariable String documentKey,
            @RequestParam("document_version") String documentVersion
    ) {
        // 查询该文档版本下的所有库引用
        List<PencilDocumentLibraryRef> refs = pencilDocumentLibraryRefRepository
                .findByDocumentKeyAndDocumentVersion(documentKey, documentVersion);

        if (refs == null || refs.isEmpty()) {
            return ApiResponse.ok(Collections.emptyList());
        }

        // 根据引用查询所有库信息
        List<PencilLibrary> libraries = refs.stream()
                .map(ref -> pencilLibraryRepository.findOneByKeyAndVersion(
                        ref.getLibraryKey(), ref.getLibraryVersion()))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        return ApiResponse.ok(libraries);
    }

    @PutMapping("/{documentKey}/library")
    public ApiResponse<PencilDocumentLibraryRef> updateLibrary(
            @PathVariable String documentKey,
            @RequestBody UpdateDocumentLibraryRefRO ro
    ) {

        PencilDocumentLibraryRef vo = pencilDocumentLibraryRefRepository.findByDocumentKeyAndLibraryKeyAndDocumentVersion(documentKey, ro.getLibraryKey(), ro.getDocumentVersion());
        if (vo == null) {
            vo = new PencilDocumentLibraryRef();
            vo.setDocumentKey(documentKey);
            vo.setDocumentVersion(ro.getDocumentVersion());
            vo.setLibraryKey(ro.getLibraryKey());
            vo.setLibraryVersion(ro.getLibraryVersion());
        } else {
            vo.setLibraryKey(ro.getLibraryKey());
            vo.setLibraryVersion(ro.getLibraryVersion());
        }
        pencilDocumentLibraryRefRepository.save(vo);

        return ApiResponse.ok(vo);
    }

}