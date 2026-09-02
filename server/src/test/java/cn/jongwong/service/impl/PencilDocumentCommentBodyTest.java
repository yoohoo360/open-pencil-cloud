package test.java.cn.jongwong.service.impl;

import cn.jongwong.exception.ApiException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PencilDocumentCommentBodyTest {

    @Test
    void requireBodyTrimsAndCapsLength() {
        assertEquals("Hello", PencilDocumentCommentServiceImpl.requireBody("  Hello  "));
        String longBody = "a".repeat(PencilDocumentCommentServiceImpl.MAX_BODY + 8);
        assertEquals(
                PencilDocumentCommentServiceImpl.MAX_BODY,
                PencilDocumentCommentServiceImpl.requireBody(longBody).length()
        );
    }

    @Test
    void requireBodyRejectsBlank() {
        assertThrows(ApiException.class, () -> PencilDocumentCommentServiceImpl.requireBody("   "));
        assertThrows(ApiException.class, () -> PencilDocumentCommentServiceImpl.requireBody(null));
    }
}
