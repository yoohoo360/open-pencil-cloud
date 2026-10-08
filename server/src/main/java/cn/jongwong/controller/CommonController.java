package cn.jongwong.controller;

import cn.jongwong.service.RemoteImageFetchService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Shared helpers that are not tied to a single product domain.
 */
@RestController
@RequestMapping("/api/common")
@RequiredArgsConstructor
public class CommonController {

    private final RemoteImageFetchService remoteImageFetchService;

    /**
     * Fetch a cross-origin http(s) image for Markdown/canvas (server-side, no browser CORS).
     * Rejects URLs whose apex domain matches the API host (compare only to the registrable domain).
     * GET /api/common/fetch-url?url=https://example.com/a.png
     */
    @GetMapping("/fetch-url")
    public ResponseEntity<byte[]> fetchUrl(@RequestParam String url, HttpServletRequest request) {
        RemoteImageFetchService.FetchedImage image = remoteImageFetchService.fetch(url, request);
        return ResponseEntity.ok()
                .contentType(image.contentType())
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=3600")
                .body(image.bytes());
    }
}
