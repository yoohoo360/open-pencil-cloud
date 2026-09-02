package main.java.cn.jongwong.collab;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "collab")
public class CollabProperties {

    /**
     * Maximum UTF-8 text payload accepted from a peer, in bytes.
     */
    private int maxMessageBytes = 8 * 1024 * 1024;

    /**
     * Maximum concurrent sockets allowed in one share room.
     * Zero or negative means no limit.
     */
    private int maxPeersPerRoom = 0;

    /**
     * Wait this long after a socket closes before telling the room the peer left.
     * Covers Vite/proxy drops and browser reconnects so avatars do not flicker.
     */
    private int leaveGraceMs = 4000;
}
