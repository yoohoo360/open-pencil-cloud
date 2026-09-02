package main.java.cn.jongwong.auth;

import cn.jongwong.exception.ApiException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailVerificationService {

    static final String CODE_KEY = "email-verify:";
    static final String COOLDOWN_KEY = "email-verify-cooldown:";
    static final long CODE_TTL_MINUTES = 15;
    static final long COOLDOWN_SECONDS = 60;

    private final StringRedisTemplate redis;
    private final MailService mailService;
    private final AppAuthProperties appAuthProperties;

    public void sendCode(String email) {
        String normalized = normalize(email);
        if (Boolean.TRUE.equals(redis.hasKey(COOLDOWN_KEY + normalized))) {
            throw ApiException.badRequest("Please wait before requesting another code");
        }
        String code = EmailCodes.sixDigits();
        redis.opsForValue().set(CODE_KEY + normalized, code, CODE_TTL_MINUTES, TimeUnit.MINUTES);
        redis.opsForValue().set(COOLDOWN_KEY + normalized, "1", COOLDOWN_SECONDS, TimeUnit.SECONDS);
        mailService.sendText(
                normalized,
                "Verify your " + appName() + " email",
                "Your verification code is " + code + ".\n\nIt expires in " + CODE_TTL_MINUTES + " minutes."
        );
        log.info("Sent email verification code to {}", normalized);
    }

    public void verifyOrThrow(String email, String code) {
        String normalized = normalize(email);
        String expected = redis.opsForValue().get(CODE_KEY + normalized);
        if (expected == null || !EmailCodes.matches(expected, code)) {
            throw ApiException.badRequest("Invalid or expired verification code");
        }
        redis.delete(CODE_KEY + normalized);
        redis.delete(COOLDOWN_KEY + normalized);
    }

    private String appName() {
        String url = appAuthProperties.getFrontendUrl();
        return url == null || url.isBlank() ? "HaloLight" : "HaloLight";
    }

    public static String normalize(String email) {
        if (email == null || email.isBlank()) {
            throw ApiException.badRequest("email is required");
        }
        return email.trim().toLowerCase();
    }
}
