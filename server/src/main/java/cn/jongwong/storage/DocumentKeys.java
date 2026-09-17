package cn.jongwong.storage;

import java.security.SecureRandom;

public final class DocumentKeys {

    public static final int LENGTH = 22;
    private static final char[] ALPHABET =
            "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".toCharArray();

    private DocumentKeys() {
    }

    public static String random(SecureRandom random) {
        char[] chars = new char[LENGTH];
        for (int i = 0; i < LENGTH; i++) {
            chars[i] = ALPHABET[random.nextInt(ALPHABET.length)];
        }
        return new String(chars);
    }

    public static boolean isSafe(String key) {
        if (key == null || key.length() < 8 || key.length() > 64) {
            return false;
        }
        for (int i = 0; i < key.length(); i++) {
            char c = key.charAt(i);
            boolean ok = (c >= '0' && c <= '9') || (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z');
            if (!ok) {
                return false;
            }
        }
        return true;
    }
}
