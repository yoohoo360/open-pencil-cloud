package cn.jongwong.controller;

import cn.jongwong.common.ConvertUtils;
import cn.jongwong.dto.ApiResponse;
import cn.jongwong.entity.PencilLibrary;
import cn.jongwong.repository.PencilLibraryRepository;
import cn.jongwong.ro.PencilLibrariesResponse;
import cn.jongwong.ro.PublishLibraryRO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/libraries")
@RequiredArgsConstructor
public class PencilLibrariesController {

    @Autowired
    private PencilLibraryRepository pencilLibraryRepository;

    @GetMapping("/list")
    public ApiResponse<List<PencilLibrariesResponse>> getAllFiles() {
        List<PencilLibrary> vos = pencilLibraryRepository.findAll().stream()
                .filter(library -> library.getIsDeleted() == null || library.getIsDeleted() == 0)
                .toList();
        return ApiResponse.ok(ConvertUtils.convertList(vos, PencilLibrariesResponse.class));
    }

    /**
     * Upsert a published component library metadata row. The `.fig` bytes are uploaded to OSS by
     * the client beforehand; this endpoint only registers/updates the catalog entry.
     */
    @PostMapping
    public ApiResponse<PencilLibrariesResponse> publish(@Valid @RequestBody PublishLibraryRO request) {
        PencilLibrary existing = pencilLibraryRepository.findOneByKey(request.getKey());
        PencilLibrary library = existing != null ? existing : new PencilLibrary();
        if (existing == null) {
            library.setKey(request.getKey());
        }
        library.setName(request.getName());
        library.setUrl(request.getUrl());
        library.setDescription(request.getDescription());
        library.setThumbnailUrl(request.getThumbnailUrl());
        library.setVersion(request.getVersion() != null && !request.getVersion().isBlank()
                ? request.getVersion()
                : "1.0.0");
        library.setSchemaVersion(request.getSchemaVersion());
        if (request.getProjectId() != null) {
            library.setProjectId(request.getProjectId());
        }
        library.setIsDeleted(0);
        PencilLibrary saved = pencilLibraryRepository.save(library);
        return ApiResponse.ok(ConvertUtils.convert(saved, PencilLibrariesResponse.class));
    }
}
