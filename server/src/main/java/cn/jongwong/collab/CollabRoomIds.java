package main.java.cn.jongwong.collab;

import java.util.regex.Pattern;

public final class CollabRoomIds {

    private static final Pattern ROOM_ID = Pattern.compile("^[A-Za-z0-9_-]{1,64}$");

    private CollabRoomIds() {
    }

    public static boolean isValid(String roomId) {
        return roomId != null && ROOM_ID.matcher(roomId).matches();
    }
}
