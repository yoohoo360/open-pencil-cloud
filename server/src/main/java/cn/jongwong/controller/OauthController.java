package cn.jongwong.controller;

import cn.jongwong.auth.OauthService;
import cn.jongwong.auth.OauthService.OauthCallbackResult;
import cn.jongwong.dto.ApiResponse;
import cn.jongwong.dto.AuthResponse;
import cn.jongwong.dto.OauthProvidersResponse;
import cn.jongwong.dto.OauthTicketRequest;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;

@Tag(name = "OAuth", description = "GitHub and Google sign-in")
@RestController
@RequestMapping("/api/oauth")
@RequiredArgsConstructor
public class OauthController {

    private final OauthService oauthService;

    @GetMapping("/providers")
    public ApiResponse<OauthProvidersResponse> providers() {
        return ApiResponse.ok(oauthService.providers());
    }

    @GetMapping("/{provider}")
    public ResponseEntity<Void> start(
            @PathVariable String provider,
            @RequestParam(value = "redirect_uri", required = false) String redirectUri,
            @RequestParam(value = "code", required = false) String code,
            @RequestParam(value = "state", required = false) String state,
            @RequestParam(value = "error", required = false) String error,
            HttpServletRequest request
    ) {
        return finish(provider, redirectUri, code, state, error, request);
    }

    @GetMapping("/{provider}/callback")
    public ResponseEntity<Void> callback(
            @PathVariable String provider,
            @RequestParam(value = "code", required = false) String code,
            @RequestParam(value = "state", required = false) String state,
            @RequestParam(value = "error", required = false) String error,
            HttpServletRequest request
    ) {
        return finish(provider, null, code, state, error, request);
    }

    @PostMapping("/session")
    public ApiResponse<AuthResponse> session(@Valid @RequestBody OauthTicketRequest request) {
        return ApiResponse.ok("Login successful", oauthService.consumeTicket(request.getTicket()));
    }

    private ResponseEntity<Void> finish(
            String provider,
            String redirectUri,
            String code,
            String state,
            String error,
            HttpServletRequest request
    ) {
        String frontendOrigin = oauthService.requestOrigin(request);
        String apiOrigin = oauthService.apiRequestOrigin(request);
        if (error != null && !error.isBlank()) {
            return redirectTo(oauthService.frontendLoginError(error, oauthService.frontendOriginFromState(state)));
        }
        if (code != null && !code.isBlank()) {
            OauthCallbackResult result = oauthService.handleCallback(provider, code, state, frontendOrigin);
            return redirectTo(result.location());
        }
        return redirectTo(oauthService.authorizationUrl(provider, redirectUri, apiOrigin));
    }

    private ResponseEntity<Void> redirectTo(String location) {
        HttpHeaders headers = new HttpHeaders();
        headers.setLocation(URI.create(location));
        return new ResponseEntity<>(headers, HttpStatus.FOUND);
    }
}
