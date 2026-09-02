package test.java.cn.jongwong.service.impl;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;

import static org.junit.jupiter.api.Assertions.assertEquals;

class PencilDocumentVersionPathTest {

    @Test
    void ossPathStripsLeadingSlashes() {
        assertEquals("fig/gW7PewHl/20260831141012345/测试2.fig",
                PencilDocumentVersionServiceImpl.ossPath("/fig/gW7PewHl/20260831141012345/测试2.fig"));
        assertEquals("", PencilDocumentVersionServiceImpl.ossPath(null));
    }

    @Test
    void figFileNameKeepsDocumentName() {
        assertEquals("测试2.fig", PencilDocumentVersionServiceImpl.figFileName("测试2"));
        assertEquals("测试2.fig", PencilDocumentVersionServiceImpl.figFileName("测试2.fig"));
    }

    @Test
    void historyStampUsesLocalDateTimeMillis() {
        Clock clock = Clock.fixed(Instant.parse("2026-08-31T06:10:12.345Z"), ZoneId.of("Asia/Shanghai"));
        assertEquals("20260831141012345", PencilDocumentVersionServiceImpl.historyStamp(clock));
    }
}
