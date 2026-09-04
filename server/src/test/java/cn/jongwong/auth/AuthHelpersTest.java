package cn.jongwong.auth;

import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AuthHelpersTest {

    @Test
    void usernamesSanitizeAndUniquify() {
        assertEquals("adalovelace", AuthUsernames.fromHandle("Ada Lovelace", "ada@example.com"));
        assertEquals("userab", AuthUsernames.fromHandle("ab", "x@example.com"));
        Set<String> taken = new HashSet<>();
        taken.add("ada");
        taken.add("ada2");
        assertEquals("ada3", AuthUsernames.unique("ada", taken::contains));
    }

    @Test
    void emailCodesAreSixDigitsAndMatchTrimmedInput() {
        String code = EmailCodes.sixDigits();
        assertEquals(6, code.length());
        assertTrue(code.chars().allMatch(Character::isDigit));
        assertTrue(EmailCodes.matches(code, " " + code + " "));
        assertFalse(EmailCodes.matches(code, "000000".equals(code) ? "000001" : "000000"));
    }

    @Test
    void oauthRedirectsStayOnSite() {
        assertEquals("/dashboard", OauthService.safeRedirect("https://evil.example"));
        assertEquals("/dashboard", OauthService.safeRedirect("/login"));
        assertEquals("/design/abc", OauthService.safeRedirect("/design/abc"));
        assertEquals("github", OauthService.normalizeProvider("GitHub"));
    }
}
