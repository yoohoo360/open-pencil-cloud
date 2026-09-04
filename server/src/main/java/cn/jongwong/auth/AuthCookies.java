package cn.jongwong.auth;

import org.springframework.http.ResponseCookie;

import java.time.Duration;

public final class AuthCookies {

    private AuthCookies() {
    }

    public static ResponseCookie accessToken(String token, boolean secure) {
        return ResponseCookie.from("access_token", token)
                .path("/")
                .maxAge(Duration.ofDays(7))
                .sameSite("Lax")
                .httpOnly(false)
                .secure(secure)
                .build();
    }

    public static ResponseCookie refreshToken(String token, boolean secure) {
        return ResponseCookie.from("refresh_token", token)
                .path("/")
                .maxAge(Duration.ofDays(30))
                .sameSite("Lax")
                .httpOnly(false)
                .secure(secure)
                .build();
    }
}
