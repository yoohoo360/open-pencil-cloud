package main.java.cn.jongwong.collab;

import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;

public final class SessionCollabPeer implements CollabPeer {

    private final WebSocketSession session;
    private volatile String protocolPeerId;

    public SessionCollabPeer(WebSocketSession session) {
        this.session = session;
    }

    @Override
    public String sessionId() {
        return session.getId();
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
        return session.isOpen();
    }

    @Override
    public void send(String text) throws IOException {
        synchronized (session) {
            if (!session.isOpen()) {
                return;
            }
            session.sendMessage(new TextMessage(text));
        }
    }
}
