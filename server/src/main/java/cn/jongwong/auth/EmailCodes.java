package cn.jongwong.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;

public final class EmailCodes {

    private static final SecureRandom RANDOM = new SecureRandom();

    private EmailCodes() {
    }

    public static String sixDigits() {
        return String.format("%06d", RANDOM.nextInt(1_000_000));
    }

    public static boolean matches(String expected, String actual) {
        if (expected == null || actual == null) {
            return false;
        }
        byte[] left = expected.getBytes(StandardCharsets.UTF_8);
        byte[] right = actual.trim().getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(left, right);
    }
}
