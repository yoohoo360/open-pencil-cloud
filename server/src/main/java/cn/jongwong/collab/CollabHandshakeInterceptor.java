package main.java.cn.jongwong.collab;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;

public class CollabHandshakeInterceptor implements HandshakeInterceptor {

    public static final String ROOM_ID_ATTR = "collabRoomId";

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes
    ) {
        String roomId = extractRoomId(request);
        if (!CollabRoomIds.isValid(roomId)) {
            return false;
        }
        attributes.put(ROOM_ID_ATTR, roomId);
        return true;
    }

    @Override
    public void afterHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Exception exception
    ) {
    }

    static String extractRoomId(ServerHttpRequest request) {
        String path = request.getURI().getPath();
        String prefix = "/ws/collab/";
        int index = path.indexOf(prefix);
        if (index >= 0) {
            String rest = path.substring(index + prefix.length());
            int slash = rest.indexOf('/');
            String candidate = slash >= 0 ? rest.substring(0, slash) : rest;
            if (!candidate.isBlank()) {
                return candidate;
            }
        }
        return UriComponentsBuilder.fromUri(request.getURI()).build().getQueryParams().getFirst("roomId");
    }
}
