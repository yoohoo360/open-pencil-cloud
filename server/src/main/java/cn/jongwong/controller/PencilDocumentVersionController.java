package main.java.cn.jongwong.controller;

import cn.jongwong.dto.ApiResponse;
import cn.jongwong.ro.PencilDocumentVersionListResponse;
import cn.jongwong.ro.PencilDocumentVersionResponse;
import cn.jongwong.ro.UpdateDocumentVersionRequest;
import cn.jongwong.service.PencilDocumentVersionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/document/{key}/versions")
@RequiredArgsConstructor
public class PencilDocumentVersionController {

    private final PencilDocumentVersionService versionService;

    @GetMapping
    public ApiResponse<PencilDocumentVersionListResponse> list(
            @PathVariable String key,
            @RequestParam(value = "named_before", required = false) Long namedBefore,
            @RequestParam(value = "named_limit", required = false) Integer namedLimit
    ) {
        return ApiResponse.ok(versionService.list(key, namedBefore, namedLimit));
    }

    @PostMapping
    public ApiResponse<PencilDocumentVersionResponse> create(
            @PathVariable String key,
            @RequestParam("kind") String kind,
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam("file") MultipartFile file
    ) {
        return ApiResponse.ok(versionService.create(key, kind, title, description, file));
    }

    @PatchMapping("/{versionId}")
    public ApiResponse<PencilDocumentVersionResponse> update(
            @PathVariable String key,
            @PathVariable String versionId,
            @RequestBody UpdateDocumentVersionRequest request
    ) {
        return ApiResponse.ok(versionService.update(key, versionId, request));
    }

    @PostMapping("/{versionId}/restore")
    public ApiResponse<PencilDocumentVersionResponse> restore(
            @PathVariable String key,
            @PathVariable String versionId
    ) {
        return ApiResponse.ok(versionService.restore(key, versionId));
    }
}
