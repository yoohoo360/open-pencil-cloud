package main.java.cn.jongwong.controller;

import cn.jongwong.common.ConvertUtils;
import cn.jongwong.dto.ApiResponse;
import cn.jongwong.entity.PencilLibrary;
import cn.jongwong.repository.PencilDocumentLibraryRefRepository;
import cn.jongwong.repository.PencilLibraryRepository;
import cn.jongwong.ro.PencilDocumentRequest;
import cn.jongwong.ro.PencilDocumentResponse;
import cn.jongwong.ro.PencilLibrariesResponse;
import cn.jongwong.service.PencilDocumentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/libraries")
@RequiredArgsConstructor
public class PencilLibrariesController {


    @Autowired
    private PencilLibraryRepository pencilLibraryRepository;

    @GetMapping("/list")
    public ApiResponse<List<PencilLibrariesResponse>> getAllFiles() {


        List<PencilLibrary> vos = pencilLibraryRepository.findAll();


        return ApiResponse.ok(ConvertUtils.convertList(vos, PencilLibrariesResponse.class));
    }


}