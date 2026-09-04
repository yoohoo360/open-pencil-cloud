package cn.jongwong.auth;

import cn.jongwong.dto.AuthResponse;
import cn.jongwong.dto.OauthProvidersResponse;
import cn.jongwong.exception.ApiException;
import cn.jongwong.service.AuthService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class OauthService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Duration HTTP_TIMEOUT = Duration.ofSeconds(15);
    private static final long STATE_TTL_MINUTES = 10;

    private final OauthProperties oauthProperties;
    private final AppAuthProperties appAuthProperties;
    private final AuthService authService;
    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .connectTimeout(HTTP_TIMEOUT)
            .build();

    public String frontendOrigin() {
        String value = trimSlash(appAuthProperties.getFrontendUrl());
        return value.isBlank() ? "http://localhost:8080" : value;
    }

    public String requestOrigin(HttpServletRequest request) {
        return originFrom(
                request.getHeader("X-Forwarded-Proto"),
                request.getHeader("X-Forwarded-Host"),
                request.getHeader("Host"),
                request.getScheme(),
                request.getServerName(),
                request.getServerPort(),
                frontendOrigin()
        );
    }

    public String frontendLoginError(String message) {
        return frontendLoginError(message, frontendOrigin());
    }

    public String frontendLoginError(String message, String origin) {
        String frontend = resolveOrigin(origin);
        String text = message == null || message.isBlank() ? "Sign in was cancelled" : message;
        return frontend + "/login?error=" + url(text);
    }

    public OauthProvidersResponse providers() {
        return OauthProvidersResponse.builder()
                .github(oauthProperties.isConfigured("github"))
                .google(oauthProperties.isConfigured("google"))
                .build();
    }

    public String authorizationUrl(String provider, String redirect, String origin) {
        String normalized = normalizeProvider(provider);
        if (!oauthProperties.isConfigured(normalized)) {
            throw ApiException.badRequest(normalized + " login is not configured");
        }
        OauthProperties.Provider config = oauthProperties.config(normalized);
        String callbackUri = callbackUrl(normalized, resolveOrigin(origin));
        String state = randomToken();
        redis.opsForValue().set(
                stateKey(state),
                packState(normalized, safeRedirect(redirect), callbackUri),
                STATE_TTL_MINUTES,
                TimeUnit.MINUTES
        );
        if ("github".equals(normalized)) {
            return UriComponentsBuilder.fromUriString("https://github.com/login/oauth/authorize")
                    .queryParam("client_id", config.getClientId())
                    .queryParam("redirect_uri", callbackUri)
                    .queryParam("scope", "read:user user:email")
                    .queryParam("state", state)
                    .encode()
                    .toUriString();
        }
        return UriComponentsBuilder.fromUriString("https://accounts.google.com/o/oauth2/v2/auth")
                .queryParam("client_id", config.getClientId())
                .queryParam("redirect_uri", callbackUri)
                .queryParam("response_type", "code")
                .queryParam("scope", "openid email profile")
                .queryParam("state", state)
                .queryParam("access_type", "online")
                .queryParam("prompt", "select_account")
                .encode()
                .toUriString();
    }

    public OauthCallbackResult handleCallback(String provider, String code, String state, String origin) {
        String frontend = resolveOrigin(origin);
        try {
            if (code == null || code.isBlank() || state == null || state.isBlank()) {
                throw ApiException.badRequest("Missing OAuth code");
            }
            String packed = redis.opsForValue().get(stateKey(state));
            redis.delete(stateKey(state));
            if (packed == null) {
                throw ApiException.badRequest("OAuth state expired. Try again.");
            }
            OauthPendingState pending = parseState(packed);
            String normalized = normalizeProvider(provider);
            if (!pending.provider().equals(normalized)) {
                throw ApiException.badRequest("OAuth provider mismatch");
            }
            String callbackUri = pending.callbackUri() == null || pending.callbackUri().isBlank()
                    ? callbackUrl(normalized, frontend)
                    : pending.callbackUri();
            OauthProfile profile = fetchProfile(normalized, code, callbackUri);
            String userId = authService.findOrCreateOauthUser(profile);
            AuthResponse session = authService.issueSessionByUserId(userId);
            return new OauthCallbackResult(originFromCallbackUri(callbackUri, frontend) + pending.redirect(), session);
        } catch (ApiException error) {
            log.warn("OAuth callback failed: {}", error.getMessage());
            return new OauthCallbackResult(frontendLoginError(error.getMessage(), frontend), null);
        } catch (Exception error) {
            log.warn("OAuth callback failed", error);
            String detail = error.getMessage();
            if (detail == null || detail.isBlank()) {
                detail = "Sign in with " + provider + " failed";
            }
            return new OauthCallbackResult(frontendLoginError(detail, frontend), null);
        }
    }

    private OauthProfile fetchProfile(String provider, String code, String callbackUri) throws Exception {
        OauthProperties.Provider config = oauthProperties.config(provider);
        if ("github".equals(provider)) {
            return githubProfile(config, code, callbackUri);
        }
        return googleProfile(config, code, callbackUri);
    }

    private OauthProfile githubProfile(OauthProperties.Provider config, String code, String callbackUri) throws Exception {
        String tokenBody = "client_id=" + url(config.getClientId())
                + "&client_secret=" + url(config.getClientSecret())
                + "&code=" + url(code)
                + "&redirect_uri=" + url(callbackUri);
        JsonNode token = postForm("https://github.com/login/oauth/access_token", tokenBody, "application/json");
        String accessToken = text(token, "access_token");
        if (accessToken.isBlank()) {
            String description = text(token, "error_description");
            if (description.isBlank()) {
                description = text(token, "error");
            }
            throw ApiException.badRequest(description.isBlank()
                    ? "GitHub did not return an access token"
                    : description);
        }
        JsonNode user = getJson("https://api.github.com/user", accessToken);
        String email = text(user, "email");
        if (email.isBlank()) {
            JsonNode emails = getJson("https://api.github.com/user/emails", accessToken);
            if (emails.isArray()) {
                for (JsonNode row : emails) {
                    if (row.path("primary").asBoolean(false) && row.path("verified").asBoolean(false)) {
                        email = text(row, "email");
                        break;
                    }
                }
                if (email.isBlank()) {
                    for (JsonNode row : emails) {
                        if (row.path("verified").asBoolean(false)) {
                            email = text(row, "email");
                            break;
                        }
                    }
                }
            }
        }
        if (email.isBlank()) {
            throw ApiException.badRequest("GitHub did not provide a verified email");
        }
        String id = user.path("id").asText();
        if (id.isBlank()) {
            throw ApiException.badRequest("GitHub did not provide a user id");
        }
        String name = firstNonBlank(text(user, "name"), text(user, "login"), email);
        return new OauthProfile("github", id, email, name, text(user, "avatar_url"), text(user, "login"));
    }

    private OauthProfile googleProfile(OauthProperties.Provider config, String code, String callbackUri) throws Exception {
        String tokenBody = "client_id=" + url(config.getClientId())
                + "&client_secret=" + url(config.getClientSecret())
                + "&code=" + url(code)
                + "&redirect_uri=" + url(callbackUri)
                + "&grant_type=authorization_code";
        JsonNode token = postForm("https://oauth2.googleapis.com/token", tokenBody, null);
        String accessToken = text(token, "access_token");
        if (accessToken.isBlank()) {
            throw ApiException.badRequest("Google did not return an access token");
        }
        JsonNode user = getJson("https://www.googleapis.com/oauth2/v3/userinfo", accessToken);
        if (!user.path("email_verified").asBoolean(false)) {
            throw ApiException.badRequest("Google email is not verified");
        }
        String email = text(user, "email");
        String id = text(user, "sub");
        if (email.isBlank() || id.isBlank()) {
            throw ApiException.badRequest("Google did not provide an email");
        }
        String name = firstNonBlank(text(user, "name"), email);
        return new OauthProfile("google", id, email, name, text(user, "picture"), null);
    }

    private JsonNode postForm(String url, String body, String accept) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(url))
                .timeout(HTTP_TIMEOUT)
                .header("Content-Type", "application/x-www-form-urlencoded")
                .header("User-Agent", "HaloLight")
                .POST(HttpRequest.BodyPublishers.ofString(body));
        if (accept != null) {
            builder.header("Accept", accept);
        }
        HttpResponse<String> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
        String responseBody = response.body() == null ? "" : response.body();
        if (response.statusCode() >= 400) {
            log.warn("OAuth token HTTP {}: {}", response.statusCode(),
                    responseBody.substring(0, Math.min(300, responseBody.length())));
            throw ApiException.badRequest("OAuth provider rejected the request");
        }
        if (responseBody.isBlank() || !(responseBody.startsWith("{") || responseBody.startsWith("["))) {
            throw ApiException.badRequest("OAuth provider returned an invalid token response");
        }
        JsonNode token = objectMapper.readTree(responseBody);
        if (!text(token, "error").isBlank() && text(token, "access_token").isBlank()) {
            String description = text(token, "error_description");
            throw ApiException.badRequest(description.isBlank() ? text(token, "error") : description);
        }
        return token;
    }

    private JsonNode getJson(String url, String accessToken) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                .timeout(HTTP_TIMEOUT)
                .header("Authorization", "Bearer " + accessToken)
                .header("Accept", "application/json")
                .header("User-Agent", "HaloLight")
                .GET()
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 400) {
            throw ApiException.badRequest("Could not load the OAuth profile");
        }
        return objectMapper.readTree(response.body());
    }

    static String callbackUrl(String provider, String origin) {
        return trimSlash(origin) + "/api/auth/oauth/" + provider;
    }

    static String originFrom(
            String forwardedProto,
            String forwardedHost,
            String hostHeader,
            String scheme,
            String serverName,
            int serverPort,
            String fallback
    ) {
        String proto = firstHeaderValue(forwardedProto);
        if (proto == null || proto.isBlank()) {
            proto = scheme == null || scheme.isBlank() ? "http" : scheme;
        }
        String host = firstHeaderValue(forwardedHost);
        if (host == null || host.isBlank()) {
            host = firstHeaderValue(hostHeader);
        }
        if (isLoopbackApiHost(host, serverName)) {
            return fallback == null || fallback.isBlank() ? "http://localhost:8080" : trimSlash(fallback);
        }
        if (host == null || host.isBlank()) {
            boolean defaultPort = ("http".equals(proto) && (serverPort == 80 || serverPort <= 0))
                    || ("https".equals(proto) && serverPort == 443);
            host = defaultPort || serverPort <= 0 ? serverName : serverName + ":" + serverPort;
        }
        return proto + "://" + host;
    }

    static String originFromCallbackUri(String callbackUri, String fallback) {
        try {
            URI uri = URI.create(callbackUri);
            if (uri.getScheme() == null || uri.getHost() == null) {
                return trimSlash(fallback);
            }
            int port = uri.getPort();
            boolean defaultPort = port < 0
                    || ("http".equals(uri.getScheme()) && port == 80)
                    || ("https".equals(uri.getScheme()) && port == 443);
            return uri.getScheme() + "://" + (defaultPort ? uri.getHost() : uri.getHost() + ":" + port);
        } catch (RuntimeException ignored) {
            return trimSlash(fallback);
        }
    }

    static String normalizeProvider(String provider) {
        if (provider == null) {
            throw ApiException.badRequest("Unknown OAuth provider");
        }
        String value = provider.trim().toLowerCase(Locale.ROOT);
        if (!"github".equals(value) && !"google".equals(value)) {
            throw ApiException.badRequest("Unknown OAuth provider");
        }
        return value;
    }

    static String safeRedirect(String redirect) {
        if (redirect == null || redirect.isBlank()) {
            return "/dashboard";
        }
        String value = redirect.trim();
        if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/login")) {
            return "/dashboard";
        }
        return value;
    }

    private String packState(String provider, String redirect, String callbackUri) {
        Map<String, String> payload = new LinkedHashMap<>();
        payload.put("provider", provider);
        payload.put("redirect", redirect);
        payload.put("callbackUri", callbackUri);
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException error) {
            throw new IllegalStateException("Could not store OAuth state", error);
        }
    }

    private OauthPendingState parseState(String packed) {
        String value = packed == null ? "" : packed.trim();
        if (value.startsWith("{")) {
            try {
                JsonNode node = objectMapper.readTree(value);
                return new OauthPendingState(
                        text(node, "provider"),
                        safeRedirect(text(node, "redirect")),
                        text(node, "callbackUri")
                );
            } catch (Exception ignored) {
                // Fall through to the legacy provider|redirect format.
            }
        }
        int split = value.indexOf('|');
        String provider = split < 0 ? value : value.substring(0, split);
        String redirect = split < 0 ? "/dashboard" : value.substring(split + 1);
        return new OauthPendingState(provider, safeRedirect(redirect), "");
    }

    private String resolveOrigin(String origin) {
        if (origin == null || origin.isBlank()) {
            return frontendOrigin();
        }
        String value = origin.trim();
        if (!value.startsWith("http://") && !value.startsWith("https://")) {
            return frontendOrigin();
        }
        return trimSlash(value);
    }

    private static boolean isLoopbackApiHost(String host, String serverName) {
        String value = firstHeaderValue(host);
        if (value == null || value.isBlank()) {
            value = serverName;
        }
        if (value == null || value.isBlank()) {
            return true;
        }
        String hostname = value.split(":", 2)[0].trim();
        return "127.0.0.1".equals(hostname) || "0.0.0.0".equals(hostname) || "::1".equals(hostname);
    }

    private static String firstHeaderValue(String header) {
        if (header == null || header.isBlank()) {
            return null;
        }
        return header.split(",")[0].trim();
    }

    private static String stateKey(String state) {
        return "oauth-state:" + state;
    }

    private static String randomToken() {
        byte[] bytes = new byte[24];
        RANDOM.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    private static String url(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }

    private static String trimSlash(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.path(field);
        return value.isMissingNode() || value.isNull() ? "" : value.asText("").trim();
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return "User";
    }

    public record OauthCallbackResult(String location, AuthResponse session) {
    }

    public record OauthProfile(
            String provider,
            String providerUserId,
            String email,
            String name,
            String avatar,
            String usernameHint
    ) {
    }

    private record OauthPendingState(String provider, String redirect, String callbackUri) {
    }
}
