package main.java.cn.jongwong.collab;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Slf4j
@Component
@RequiredArgsConstructor
public class CollabWebSocketHandler extends TextWebSocketHandler {

    private static final String PEER_ATTR = "collabPeer";

    private final CollabRoomRegistry registry;
    private final CollabMessageCodec codec;
    private final CollabProperties properties;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String roomId = roomId(session);
        SessionCollabPeer peer = new SessionCollabPeer(session);
        session.getAttributes().put(PEER_ATTR, peer);
        if (!registry.join(roomId, peer)) {
            log.info("Rejecting collab socket {}, room {} is full", session.getId(), roomId);
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }
        log.debug("Collab peer {} joined room {}", session.getId(), roomId);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        if (message.getPayloadLength() > properties.getMaxMessageBytes()) {
            log.warn("Dropping oversized collab frame from {}", session.getId());
            return;
        }
        CollabMessage parsed;
        try {
            parsed = codec.read(message.getPayload());
        } catch (Exception error) {
            log.debug("Ignoring invalid collab frame from {}: {}", session.getId(), error.getMessage());
            return;
        }
        if (parsed == null || parsed.senderId() == null || !parsed.hasKnownType()) {
            return;
        }
        String roomId = roomId(session);
        registry.rememberPeer(roomId, session.getId(), parsed.senderId());
        registry.dispatch(roomId, session.getId(), parsed.targetId(), message.getPayload());
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String roomId = roomId(session);
        CollabPeer closed = registry.leave(roomId, session.getId());
        if (closed == null) {
            closed = (CollabPeer) session.getAttributes().get(PEER_ATTR);
        }
        registry.scheduleLeave(roomId, closed);
        log.debug("Collab peer {} left room {} ({})", session.getId(), roomId, status);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        log.debug("Collab transport error on {}: {}", session.getId(), exception.getMessage());
    }

    private static String roomId(WebSocketSession session) {
        Object value = session.getAttributes().get(CollabHandshakeInterceptor.ROOM_ID_ATTR);
        return value instanceof String roomId ? roomId : "";
    }
}
