package cn.jongwong.service;

import cn.jongwong.dto.RefreshToken;
import cn.jongwong.exception.AuthenticationException;
import cn.jongwong.security.JwtTokenProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Set;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private static final String TOKEN_KEY_PREFIX = "refresh_token:";
    private static final String USER_TOKENS_KEY_PREFIX = "user_tokens:";
    private static final String TOKEN_META_KEY_PREFIX = "refresh_token_meta:";

    private final RedisTemplate<String, String> stringRedisTemplate;
    private final JwtTokenProvider jwtTokenProvider;
    private final ObjectMapper objectMapper;

    /**
     * 创建 RefreshToken
     */
    public void createRefreshToken(String userId, String tokenValue) {
        createRefreshToken(userId, tokenValue, null, null);
    }

    /**
     * 创建 RefreshToken (带设备信息)
     */
    public void createRefreshToken(String userId, String tokenValue, String deviceInfo, String ipAddress) {
        long ttlMillis = jwtTokenProvider.getRefreshTokenExpiration();

        // 1. 存储 token -> userId 映射
        String tokenKey = TOKEN_KEY_PREFIX + tokenValue;
        stringRedisTemplate.opsForValue().set(tokenKey, userId, ttlMillis, TimeUnit.MILLISECONDS);

        // 2. 存储用户 token 索引 (用于批量吊销)
        String userKey = USER_TOKENS_KEY_PREFIX + userId;
        stringRedisTemplate.opsForSet().add(userKey, tokenValue);
        stringRedisTemplate.expire(userKey, ttlMillis, TimeUnit.MILLISECONDS);

        // 3. 存储 token 元数据 (可选)
        if (deviceInfo != null || ipAddress != null) {
            try {
                RefreshToken meta = RefreshToken.builder()
                        .userId(userId)
                        .deviceInfo(deviceInfo)
                        .ipAddress(ipAddress)
                        .createdAt(Instant.now())
                        .expiresAt(Instant.now().plusMillis(ttlMillis))
                        .build();

                String metaKey = TOKEN_META_KEY_PREFIX + tokenValue;
                stringRedisTemplate.opsForValue().set(metaKey, objectMapper.writeValueAsString(meta),
                        ttlMillis, TimeUnit.MILLISECONDS);
            } catch (Exception e) {
                log.warn("Failed to store token metadata: {}", e.getMessage());
            }
        }

        log.debug("Refresh token created for user: {}", userId);
    }

    /**
     * 验证 RefreshToken 是否有效
     */
    public void validateRefreshToken(String tokenValue) {
        // 1. 验证 JWT 格式
        if (!jwtTokenProvider.validateToken(tokenValue)) {
            throw new AuthenticationException("Invalid refresh token");
        }

        // 2. 检查是否存在于 Redis
        String tokenKey = TOKEN_KEY_PREFIX + tokenValue;
        Boolean exists = stringRedisTemplate.hasKey(tokenKey);
        if (exists == null || !exists) {
            throw new AuthenticationException("Refresh token not found or has been revoked");
        }

        // 3. 获取 userId
        String userId = stringRedisTemplate.opsForValue().get(tokenKey);
        if (userId == null) {
            throw new AuthenticationException("Refresh token has expired");
        }

        // 4. 验证 token 中的 userId 是否匹配
        String tokenUserId = jwtTokenProvider.getUserIdFromToken(tokenValue);
        if (!tokenUserId.equals(userId)) {
            throw new AuthenticationException("Refresh token does not match user");
        }

        log.debug("Refresh token validated for user: {}", userId);
    }

    /**
     * 从 RefreshToken 获取用户 ID
     */
    public String getUserIdFromToken(String tokenValue) {
        String tokenKey = TOKEN_KEY_PREFIX + tokenValue;
        String userId = stringRedisTemplate.opsForValue().get(tokenKey);
        if (userId == null) {
            throw new AuthenticationException("Refresh token not found");
        }
        return userId;
    }

    /**
     * 获取 Token 元数据
     */
    public RefreshToken getTokenMeta(String tokenValue) {
        String metaKey = TOKEN_META_KEY_PREFIX + tokenValue;
        String metaJson = stringRedisTemplate.opsForValue().get(metaKey);
        if (metaJson == null) {
            return null;
        }
        try {
            return objectMapper.readValue(metaJson, RefreshToken.class);
        } catch (Exception e) {
            log.warn("Failed to parse token metadata: {}", e.getMessage());
            return null;
        }
    }

    /**
     * 刷新 Token: 吊销旧 Token，创建新 Token
     */
    public String refreshToken(String refreshTokenValue, String userId) {
        log.debug("Refreshing token for user: {}", userId);

        // 验证旧 token
        validateRefreshToken(refreshTokenValue);

        // 获取旧 token 元数据 (保留设备信息)
        RefreshToken oldMeta = getTokenMeta(refreshTokenValue);

        // 吊销旧 token
        revokeRefreshToken(refreshTokenValue);

        // 生成新 token
        String newRefreshTokenValue = jwtTokenProvider.generateRefreshToken(userId);

        // 保存新 refresh token (保留设备信息)
        createRefreshToken(userId, newRefreshTokenValue,
                oldMeta != null ? oldMeta.getDeviceInfo() : null,
                oldMeta != null ? oldMeta.getIpAddress() : null);

        log.info("Token refreshed successfully for user: {}", userId);

        return newRefreshTokenValue;
    }

    /**
     * 吊销单个 RefreshToken (登出)
     */
    public void revokeRefreshToken(String tokenValue) {
        String tokenKey = TOKEN_KEY_PREFIX + tokenValue;

        // 获取 userId
        String userId = stringRedisTemplate.opsForValue().get(tokenKey);

        // 删除 token
        stringRedisTemplate.delete(tokenKey);

        // 删除元数据
        String metaKey = TOKEN_META_KEY_PREFIX + tokenValue;
        stringRedisTemplate.delete(metaKey);

        // 从用户 token 列表中移除
        if (userId != null) {
            String userKey = USER_TOKENS_KEY_PREFIX + userId;
            stringRedisTemplate.opsForSet().remove(userKey, tokenValue);
        }

        log.debug("Refresh token revoked: {}...", tokenValue.substring(0, Math.min(10, tokenValue.length())));
    }

    /**
     * 吊销用户所有 RefreshToken (登出所有设备)
     */
    public int revokeAllUserRefreshTokens(String userId) {
        String userKey = USER_TOKENS_KEY_PREFIX + userId;
        Set<String> tokens = stringRedisTemplate.opsForSet().members(userKey);

        if (tokens == null || tokens.isEmpty()) {
            log.debug("No refresh tokens found for user: {}", userId);
            return 0;
        }

        // 删除所有 token
        for (String token : tokens) {
            String tokenKey = TOKEN_KEY_PREFIX + token;
            stringRedisTemplate.delete(tokenKey);

            String metaKey = TOKEN_META_KEY_PREFIX + token;
            stringRedisTemplate.delete(metaKey);
        }

        // 删除用户 token 列表
        stringRedisTemplate.delete(userKey);

        log.info("Revoked {} refresh tokens for user: {}", tokens.size(), userId);
        return tokens.size();
    }

    /**
     * 检查 RefreshToken 是否存在且有效
     */
    public boolean existsAndValid(String tokenValue) {
        try {
            validateRefreshToken(tokenValue);
            return true;
        } catch (AuthenticationException e) {
            return false;
        }
    }

    /**
     * 获取用户所有活跃的 RefreshToken
     */
    public Set<String> getUserRefreshTokens(String userId) {
        String userKey = USER_TOKENS_KEY_PREFIX + userId;
        Set<String> tokens = stringRedisTemplate.opsForSet().members(userKey);
        return tokens != null ? tokens : Set.of();
    }

    /**
     * 清理过期的 RefreshToken (Redis TTL 自动处理)
     */
    public long cleanExpiredRefreshTokens() {
        log.info("Redis TTL automatically handles expired tokens");
        return 0;
    }
}