package cn.jongwong.collab;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CollabRoomRegistryTest {

    private CollabRoomRegistry registry;

    @BeforeEach
    void setUp() {
        CollabProperties properties = new CollabProperties();
        properties.setMaxPeersPerRoom(2);
        registry = new CollabRoomRegistry(properties, new CollabMessageCodec());
    }

    @AfterEach
    void tearDown() {
        registry.shutdown();
    }

    @Test
    void broadcastsToOtherPeersAndHonorsTarget() {
        FakePeer alice = new FakePeer("s1", "alice");
        FakePeer bob = new FakePeer("s2", "bob");
        FakePeer carol = new FakePeer("s3", "carol");

        assertTrue(registry.join("room-a", alice));
        assertTrue(registry.join("room-a", bob));
        assertFalse(registry.join("room-a", carol));

        registry.dispatch("room-a", alice.sessionId(), null, "{\"type\":\"hello\",\"senderId\":\"alice\"}");
        assertEquals(1, bob.inbox.size());
        assertEquals(0, alice.inbox.size());

        registry.dispatch("room-a", alice.sessionId(), "bob", "{\"type\":\"action\",\"senderId\":\"alice\",\"targetId\":\"bob\"}");
        assertEquals(2, bob.inbox.size());
    }

    @Test
    void announcesLeaveWhenAPeerDisconnects() {
        FakePeer alice = new FakePeer("s1", "alice");
        FakePeer bob = new FakePeer("s2", "bob");
        registry.join("room-a", alice);
        registry.join("room-a", bob);

        CollabPeer closed = registry.leave("room-a", alice.sessionId());
        registry.broadcastLeave("room-a", closed);

        assertEquals(1, bob.inbox.size());
        assertTrue(bob.inbox.getFirst().contains("\"type\":\"leave\""));
        assertTrue(bob.inbox.getFirst().contains("\"senderId\":\"alice\""));
        assertEquals(1, registry.roomSize("room-a"));
    }

    @Test
    void doesNotAnnounceLeaveWhenTheSamePeerReconnects() {
        FakePeer alice = new FakePeer("s1", "alice");
        FakePeer bob = new FakePeer("s2", "bob");
        FakePeer aliceAgain = new FakePeer("s3", null);
        registry.join("room-a", alice);
        registry.join("room-a", bob);

        CollabPeer closed = registry.leave("room-a", alice.sessionId());
        registry.scheduleLeave("room-a", closed);
        registry.join("room-a", aliceAgain);
        registry.rememberPeer("room-a", aliceAgain.sessionId(), "alice");
        registry.broadcastLeave("room-a", closed);

        assertEquals(0, bob.inbox.size());
        assertEquals(2, registry.roomSize("room-a"));
    }

    @Test
    void rejectsInvalidRoomIds() {
        assertTrue(CollabRoomIds.isValid("e2e-collaboration-room"));
        assertTrue(CollabRoomIds.isValid("abcd1234"));
        assertFalse(CollabRoomIds.isValid(""));
        assertFalse(CollabRoomIds.isValid("../secret"));
        assertFalse(CollabRoomIds.isValid("room with space"));
    }

    private static final class FakePeer implements CollabPeer {
        private final String sessionId;
        private String protocolPeerId;
        private final List<String> inbox = new ArrayList<>();

        private FakePeer(String sessionId, String protocolPeerId) {
            this.sessionId = sessionId;
            this.protocolPeerId = protocolPeerId;
        }

        @Override
        public String sessionId() {
            return sessionId;
        }

        @Override
        public String protocolPeerId() {
            return protocolPeerId;
        }

        @Override
        public void setProtocolPeerId(String protocolPeerId) {
            this.protocolPeerId = protocolPeerId;
        }

        @Override
        public boolean isOpen() {
            return true;
        }

        @Override
        public void send(String text) throws IOException {
            inbox.add(text);
        }
    }
}
