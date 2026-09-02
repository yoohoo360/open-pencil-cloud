package main.java.cn.jongwong.auth;

import java.security.SecureRandom;
import java.util.Locale;
import java.util.function.Predicate;

public final class AuthUsernames {

    private static final SecureRandom RANDOM = new SecureRandom();

    private AuthUsernames() {
    }

    public static String fromHandle(String handle, String email) {
        String source = handle == null || handle.isBlank() ? emailLocalPart(email) : handle;
        String cleaned = source == null ? "" : source.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9_]", "");
        if (cleaned.length() < 3) {
            cleaned = "user" + cleaned;
        }
        if (cleaned.length() > 40) {
            cleaned = cleaned.substring(0, 40);
        }
        return cleaned;
    }

    public static String unique(String base, Predicate<String> taken) {
        String candidate = base;
        int suffix = 2;
        while (taken.test(candidate)) {
            String extra = String.valueOf(suffix++);
            int maxBase = Math.max(3, 50 - extra.length());
            String trimmed = base.length() > maxBase ? base.substring(0, maxBase) : base;
            candidate = trimmed + extra;
            if (suffix > 10_000) {
                candidate = "user" + Integer.toUnsignedString(RANDOM.nextInt(), 36);
            }
        }
        return candidate;
    }

    private static String emailLocalPart(String email) {
        if (email == null || !email.contains("@")) {
            return "user";
        }
        return email.substring(0, email.indexOf('@'));
    }
}
