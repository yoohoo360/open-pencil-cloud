package main.java.cn.jongwong.auth;

import cn.jongwong.dto.OauthProvidersResponse;
import cn.jongwong.exception.ApiException;
import cn.jongwong.service.AuthService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.util.Locale;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class OauthService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Duration HTTP_TIMEOUT = Duration.ofSeconds(15);
    private static final long STATE_TTL_MINUTES = 10;
    private static final long TICKET_TTL_MINUTES = 2;

    private final OauthProperties oauthProperties;
    private final AppAuthProperties appAuthProperties;
    private final AuthService authService;
    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(HTTP_TIMEOUT)
            .build();

    public String frontendLoginError(String message) {
        String frontend = trimSlash(appAuthProperties.getFrontendUrl());
        String text = message == null || message.isBlank() ? "Sign in was cancelled" : message;
        return frontend + "/login?error=" + url(text);
    }

    public OauthProvidersResponse providers() {
        return OauthProvidersResponse.builder()
                .github(oauthProperties.isConfigured("github"))
                .google(oauthProperties.isConfigured("google"))
                .build();
    }

    public String authorizationUrl(String provider, String redirect) {
        String normalized = normalizeProvider(provider);
        if (!oauthProperties.isConfigured(normalized)) {
            throw ApiException.badRequest(normalized + " login is not configured");
        }
        OauthProperties.Provider config = oauthProperties.config(normalized);
        String state = randomToken();
        redis.opsForValue().set(
                stateKey(state),
                normalized + "|" + safeRedirect(redirect),
                STATE_TTL_MINUTES,
                TimeUnit.MINUTES
        );
        if ("github".equals(normalized)) {
            return UriComponentsBuilder.fromUriString("https://github.com/login/oauth/authorize")
                    .queryParam("client_id", config.getClientId())
                    .queryParam("redirect_uri", callbackUrl(normalized))
                    .queryParam("scope", "read:user user:email")
                    .queryParam("state", state)
                    .encode()
                    .toUriString();
        }
        return UriComponentsBuilder.fromUriString("https://accounts.google.com/o/oauth2/v2/auth")
                .queryParam("client_id", config.getClientId())
                .queryParam("redirect_uri", callbackUrl(normalized))
                .queryParam("response_type", "code")
                .queryParam("scope", "openid email profile")
                .queryParam("state", state)
                .queryParam("access_type", "online")
                .queryParam("prompt", "select_account")
                .encode()
                .toUriString();
    }

    public String handleCallback(String provider, String code, String state) {
        String frontend = trimSlash(appAuthProperties.getFrontendUrl());
        try {
            if (code == null || code.isBlank() || state == null || state.isBlank()) {
                throw ApiException.badRequest("Missing OAuth code");
            }
            String packed = redis.opsForValue().get(stateKey(state));
            redis.delete(stateKey(state));
            if (packed == null) {
                throw ApiException.badRequest("OAuth state expired. Try again.");
            }
            int split = packed.indexOf('|');
            String expectedProvider = split < 0 ? packed : packed.substring(0, split);
            String redirect = split < 0 ? "/dashboard" : packed.substring(split + 1);
            String normalized = normalizeProvider(provider);
            if (!expectedProvider.equals(normalized)) {
                throw ApiException.badRequest("OAuth provider mismatch");
            }
            OauthProfile profile = fetchProfile(normalized, code);
            String userId = authService.findOrCreateOauthUser(profile);
            String ticket = randomToken();
            redis.opsForValue().set(ticketKey(ticket), userId, TICKET_TTL_MINUTES, TimeUnit.MINUTES);
            return frontend + "/login/oauth?ticket=" + url(ticket) + "&redirect=" + url(redirect);
        } catch (ApiException error) {
            log.warn("OAuth callback failed: {}", error.getMessage());
            return frontend + "/login?error=" + url(error.getMessage());
        } catch (Exception error) {
            log.warn("OAuth callback failed", error);
            return frontend + "/login?error=" + url("Sign in with " + provider + " failed");
        }
    }

    public String consumeTicket(String ticket) {
        if (ticket == null || ticket.isBlank()) {
            throw ApiException.badRequest("ticket is required");
        }
        String key = ticketKey(ticket.trim());
        String userId = redis.opsForValue().get(key);
        redis.delete(key);
        if (userId == null) {
            throw ApiException.badRequest("Sign-in expired. Try again.");
        }
        return userId;
    }

    private OauthProfile fetchProfile(String provider, String code) throws Exception {
        OauthProperties.Provider config = oauthProperties.config(provider);
        if ("github".equals(provider)) {
            return githubProfile(config, code);
        }
        return googleProfile(config, code);
    }

    private OauthProfile githubProfile(OauthProperties.Provider config, String code) throws Exception {
        String tokenBody = "client_id=" + url(config.getClientId())
                + "&client_secret=" + url(config.getClientSecret())
                + "&code=" + url(code)
                + "&redirect_uri=" + url(callbackUrl("github"));
        JsonNode token = postForm("https://github.com/login/oauth/access_token", tokenBody, "application/json");
        String accessToken = text(token, "access_token");
        if (accessToken.isBlank()) {
            throw ApiException.badRequest("GitHub did not return an access token");
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

    private OauthProfile googleProfile(OauthProperties.Provider config, String code) throws Exception {
        String tokenBody = "client_id=" + url(config.getClientId())
                + "&client_secret=" + url(config.getClientSecret())
                + "&code=" + url(code)
                + "&redirect_uri=" + url(callbackUrl("google"))
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
                .POST(HttpRequest.BodyPublishers.ofString(body));
        if (accept != null) {
            builder.header("Accept", accept);
        }
        HttpResponse<String> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 400) {
            throw ApiException.badRequest("OAuth provider rejected the request");
        }
        return objectMapper.readTree(response.body());
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

    private String callbackUrl(String provider) {
        return trimSlash(appAuthProperties.getPublicUrl()) + "/api/auth/oauth/" + provider + "/callback";
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

    private static String stateKey(String state) {
        return "oauth-state:" + state;
    }

    private static String ticketKey(String ticket) {
        return "oauth-ticket:" + ticket;
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

    public record OauthProfile(
            String provider,
            String providerUserId,
            String email,
            String name,
            String avatar,
            String usernameHint
    ) {
    }
}
