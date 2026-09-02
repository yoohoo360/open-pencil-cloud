package main.java.cn.jongwong.collab;

import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
public class CollabRoomRegistry {

    private final CollabProperties properties;
    private final CollabMessageCodec codec;
    private final ConcurrentHashMap<String, ConcurrentHashMap<String, CollabPeer>> rooms =
            new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, ScheduledFuture<?>> pendingLeaves = new ConcurrentHashMap<>();
    private final ScheduledExecutorService leaveScheduler =
            Executors.newSingleThreadScheduledExecutor(runnable -> {
                Thread thread = new Thread(runnable, "collab-leave");
                thread.setDaemon(true);
                return thread;
            });

    public CollabRoomRegistry(CollabProperties properties, CollabMessageCodec codec) {
        this.properties = properties;
        this.codec = codec;
    }

    public boolean join(String roomId, CollabPeer peer) {
        ConcurrentHashMap<String, CollabPeer> room = rooms.computeIfAbsent(roomId, key -> new ConcurrentHashMap<>());
        int maxPeers = properties.getMaxPeersPerRoom();
        if (maxPeers > 0 && room.size() >= maxPeers && !room.containsKey(peer.sessionId())) {
            return false;
        }
        room.put(peer.sessionId(), peer);
        return true;
    }

    public CollabPeer leave(String roomId, String sessionId) {
        ConcurrentHashMap<String, CollabPeer> room = rooms.get(roomId);
        if (room == null) {
            return null;
        }
        CollabPeer removed = room.remove(sessionId);
        if (room.isEmpty()) {
            rooms.remove(roomId, room);
        }
        return removed;
    }

    public void rememberPeer(String roomId, String sessionId, String protocolPeerId) {
        if (protocolPeerId == null || protocolPeerId.isBlank()) {
            return;
        }
        ConcurrentHashMap<String, CollabPeer> room = rooms.get(roomId);
        if (room == null) {
            return;
        }
        CollabPeer peer = room.get(sessionId);
        if (peer != null) {
            peer.setProtocolPeerId(protocolPeerId);
        }
        cancelLeave(roomId, protocolPeerId);
    }

    public void dispatch(String roomId, String senderSessionId, String targetPeerId, String payload) {
        ConcurrentHashMap<String, CollabPeer> room = rooms.get(roomId);
        if (room == null) {
            return;
        }
        if (targetPeerId != null && !targetPeerId.isBlank()) {
            sendToProtocolPeer(room, senderSessionId, targetPeerId, payload);
            return;
        }
        broadcast(room, senderSessionId, payload);
    }

    public void scheduleLeave(String roomId, CollabPeer closed) {
        if (closed == null || closed.protocolPeerId() == null) {
            return;
        }
        int graceMs = properties.getLeaveGraceMs();
        if (graceMs <= 0) {
            broadcastLeave(roomId, closed);
            return;
        }
        String key = leaveKey(roomId, closed.protocolPeerId());
        ScheduledFuture<?> previous = pendingLeaves.remove(key);
        if (previous != null) {
            previous.cancel(false);
        }
        pendingLeaves.put(
                key,
                leaveScheduler.schedule(
                        () -> {
                            pendingLeaves.remove(key);
                            broadcastLeave(roomId, closed);
                        },
                        graceMs,
                        TimeUnit.MILLISECONDS));
    }

    public void broadcastLeave(String roomId, CollabPeer closed) {
        if (closed == null || closed.protocolPeerId() == null) {
            return;
        }
        if (isPresent(roomId, closed.protocolPeerId())) {
            return;
        }
        ConcurrentHashMap<String, CollabPeer> room = rooms.get(roomId);
        if (room == null) {
            return;
        }
        try {
            broadcast(room, closed.sessionId(), codec.write(CollabMessage.leave(closed.protocolPeerId())));
        } catch (Exception error) {
            log.warn("Failed to encode leave for room {}: {}", roomId, error.getMessage());
        }
    }

    int roomSize(String roomId) {
        Map<String, CollabPeer> room = rooms.get(roomId);
        return room == null ? 0 : room.size();
    }

    @PreDestroy
    void shutdown() {
        leaveScheduler.shutdownNow();
    }

    private void cancelLeave(String roomId, String protocolPeerId) {
        ScheduledFuture<?> pending = pendingLeaves.remove(leaveKey(roomId, protocolPeerId));
        if (pending != null) {
            pending.cancel(false);
        }
    }

    private boolean isPresent(String roomId, String protocolPeerId) {
        ConcurrentHashMap<String, CollabPeer> room = rooms.get(roomId);
        if (room == null) {
            return false;
        }
        for (CollabPeer peer : room.values()) {
            if (protocolPeerId.equals(peer.protocolPeerId())) {
                return true;
            }
        }
        return false;
    }

    private static String leaveKey(String roomId, String protocolPeerId) {
        return roomId + '\0' + protocolPeerId;
    }

    private void sendToProtocolPeer(
            ConcurrentHashMap<String, CollabPeer> room,
            String senderSessionId,
            String targetPeerId,
            String payload
    ) {
        for (CollabPeer peer : snapshot(room)) {
            if (peer.sessionId().equals(senderSessionId)) {
                continue;
            }
            if (targetPeerId.equals(peer.protocolPeerId())) {
                sendQuietly(peer, payload);
                return;
            }
        }
    }

    private void broadcast(ConcurrentHashMap<String, CollabPeer> room, String senderSessionId, String payload) {
        for (CollabPeer peer : snapshot(room)) {
            if (peer.sessionId().equals(senderSessionId)) {
                continue;
            }
            sendQuietly(peer, payload);
        }
    }

    private List<CollabPeer> snapshot(ConcurrentHashMap<String, CollabPeer> room) {
        return new ArrayList<>(room.values());
    }

    private void sendQuietly(CollabPeer peer, String payload) {
        if (!peer.isOpen()) {
            return;
        }
        try {
            peer.send(payload);
        } catch (IOException error) {
            log.debug("Dropping closed collab peer {}: {}", peer.sessionId(), error.getMessage());
        }
    }
}
