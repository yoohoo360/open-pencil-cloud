package cn.jongwong.service;

import cn.jongwong.exception.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.net.InetAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Locale;
import java.util.Set;

/**
 * Fetches remote http(s) images server-side so the browser can bypass CORS.
 * Same registrable (apex) domain as the API host is rejected — clients should load those directly.
 */
@Slf4j
@Service
public class RemoteImageFetchService {

    private static final Duration TIMEOUT = Duration.ofSeconds(30);
    private static final long MAX_BYTES = 12L * 1024 * 1024;
    private static final Set<String> IMAGE_TYPES = Set.of(
            "image/png",
            "image/jpeg",
            "image/jpg",
            "image/webp",
            "image/gif",
            "image/avif",
            "image/svg+xml",
            "application/octet-stream"
    );

    private final HttpClient httpClient = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .followRedirects(HttpClient.Redirect.NORMAL)
            .connectTimeout(TIMEOUT)
            .build();

    public record FetchedImage(byte[] bytes, MediaType contentType) {}

    public FetchedImage fetch(String rawUrl, HttpServletRequest request) {
        URI uri = parseHttpUri(rawUrl);
        String remoteApex = apexDomain(uri.getHost());
        String localApex = apexDomain(requestHost(request));
        if (!remoteApex.isEmpty() && remoteApex.equals(localApex)) {
            throw ApiException.badRequest("URL shares the API apex domain; fetch it directly");
        }
        rejectPrivateHost(uri.getHost());

        HttpRequest httpRequest = HttpRequest.newBuilder(uri)
                .timeout(TIMEOUT)
                .header("User-Agent", "OpenPencil-ImageProxy/1.0")
                .header("Accept", "image/*,*/*;q=0.8")
                .GET()
                .build();

        try {
            HttpResponse<InputStream> response = httpClient.send(
                    httpRequest,
                    HttpResponse.BodyHandlers.ofInputStream()
            );
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new ApiException(HttpStatus.BAD_GATEWAY, "Remote image fetch failed (" + response.statusCode() + ")");
            }
            MediaType mediaType = resolveMediaType(response.headers().firstValue("Content-Type").orElse(""));
            if (!isAllowedImageType(mediaType)) {
                throw ApiException.badRequest("URL did not return an image");
            }
            byte[] bytes = readBounded(response.body());
            if (bytes.length == 0) {
                throw ApiException.badRequest("Remote image was empty");
            }
            return new FetchedImage(bytes, mediaType);
        } catch (ApiException error) {
            throw error;
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Remote image fetch interrupted", error);
        } catch (IOException error) {
            log.warn("Remote image fetch failed for {}", uri, error);
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Remote image fetch failed", error);
        }
    }

    private static URI parseHttpUri(String rawUrl) {
        if (rawUrl == null || rawUrl.isBlank()) {
            throw ApiException.badRequest("url is required");
        }
        URI uri;
        try {
            uri = URI.create(rawUrl.trim());
        } catch (IllegalArgumentException error) {
            throw ApiException.badRequest("Invalid url");
        }
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        if (!scheme.equals("http") && !scheme.equals("https")) {
            throw ApiException.badRequest("Only http(s) urls are allowed");
        }
        if (uri.getHost() == null || uri.getHost().isBlank()) {
            throw ApiException.badRequest("url host is required");
        }
        return uri;
    }

    /**
     * Registrable-ish apex: last two labels (`cdn.example.com` → `example.com`).
     * Single-label hosts (`localhost`) stay as-is.
     */
    static String apexDomain(String host) {
        if (host == null || host.isBlank()) {
            return "";
        }
        String normalized = host.trim().toLowerCase(Locale.ROOT);
        if (normalized.endsWith(".")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        if (normalized.startsWith("[") && normalized.endsWith("]")) {
            return normalized;
        }
        String[] parts = normalized.split("\\.");
        if (parts.length <= 2) {
            return normalized;
        }
        return parts[parts.length - 2] + "." + parts[parts.length - 1];
    }

    private static String requestHost(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-Host");
        if (forwarded != null && !forwarded.isBlank()) {
            return stripPort(forwarded.split(",")[0].trim());
        }
        String host = request.getHeader("Host");
        if (host != null && !host.isBlank()) {
            return stripPort(host.trim());
        }
        return request.getServerName() == null ? "" : request.getServerName();
    }

    private static String stripPort(String host) {
        if (host.startsWith("[")) {
            int end = host.indexOf(']');
            return end >= 0 ? host.substring(0, end + 1) : host;
        }
        int colon = host.indexOf(':');
        return colon >= 0 ? host.substring(0, colon) : host;
    }

    private static void rejectPrivateHost(String host) {
        try {
            InetAddress address = InetAddress.getByName(host);
            if (address.isAnyLocalAddress()
                    || address.isLoopbackAddress()
                    || address.isLinkLocalAddress()
                    || address.isSiteLocalAddress()
                    || address.isMulticastAddress()) {
                throw ApiException.badRequest("Private or local hosts are not allowed");
            }
        } catch (ApiException error) {
            throw error;
        } catch (Exception error) {
            throw ApiException.badRequest("Unable to resolve url host");
        }
    }

    private static MediaType resolveMediaType(String raw) {
        if (raw == null || raw.isBlank()) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
        try {
            return MediaType.parseMediaType(raw.split(";")[0].trim());
        } catch (Exception ignored) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
    }

    private static boolean isAllowedImageType(MediaType mediaType) {
        String value = mediaType.toString().toLowerCase(Locale.ROOT);
        if (value.startsWith("image/")) {
            return true;
        }
        return IMAGE_TYPES.contains(value);
    }

    private static byte[] readBounded(InputStream input) throws IOException {
        try (InputStream stream = input) {
            byte[] buffer = stream.readNBytes((int) (MAX_BYTES + 1));
            if (buffer.length > MAX_BYTES) {
                throw ApiException.badRequest("Remote image exceeds size limit");
            }
            return buffer;
        }
    }
}
