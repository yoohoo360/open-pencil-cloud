package cn.jongwong.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import cn.jongwong.config.RateLimitConfig;
import cn.jongwong.dto.ApiResponse;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;

/**
 * Rate limiting filter using Bucket4j
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {

    private final Map<String, Bucket> rateLimitBuckets;
    private final RateLimitConfig rateLimitConfig;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String clientId = getClientId(request);
        String uri = request.getRequestURI();

        // Get or create bucket for this client
        Bucket bucket = rateLimitBuckets.computeIfAbsent(clientId, k -> getBucketForUri(uri));

        // Try to consume a token
        if (bucket.tryConsume(1)) {
            // Request allowed
            filterChain.doFilter(request, response);
        } else {
            // Rate limit exceeded
            log.warn("Rate limit exceeded for client: {} on URI: {}", clientId, uri);

            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);

            ApiResponse<Object> apiResponse = ApiResponse
                    .fail("Too many requests. Please try again later.");

            objectMapper.writeValue(response.getWriter(), apiResponse);
        }
    }

    /**
     * Get client identifier from request
     * Uses IP address as identifier
     */
    private String getClientId(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    /**
     * Get appropriate bucket based on URI
     * Auth endpoints have stricter limits
     */
    private Bucket getBucketForUri(String uri) {
        if (uri.startsWith("/api/auth")) {
            return rateLimitConfig.createAuthBucket();
        }
        return rateLimitConfig.createBucket();
    }
}
