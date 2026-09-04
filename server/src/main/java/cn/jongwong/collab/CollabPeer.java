package cn.jongwong.collab;

import java.io.IOException;

/**
 * A connected share-room participant. Protocol peer IDs are assigned by the browser
 * and learned from the first hello/action frame.
 */
public interface CollabPeer {

    String sessionId();

    String protocolPeerId();

    void setProtocolPeerId(String protocolPeerId);

    boolean isOpen();

    void send(String text) throws IOException;
}
