package cn.jongwong.collab;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class CollabMessage {

    public static final String HELLO = "hello";
    public static final String WELCOME = "welcome";
    public static final String LEAVE = "leave";
    public static final String ACTION = "action";

    @JsonProperty("type")
    private final String type;
    @JsonProperty("senderId")
    private final String senderId;
    @JsonProperty("targetId")
    private final String targetId;
    @JsonProperty("namespace")
    private final String namespace;
    @JsonProperty("data")
    private final int[] data;

    public CollabMessage(String type, String senderId, String targetId, String namespace, int[] data) {
        this.type = type;
        this.senderId = senderId;
        this.targetId = targetId;
        this.namespace = namespace;
        this.data = data;
    }

    public static CollabMessage leave(String senderId) {
        return new CollabMessage(LEAVE, senderId, null, null, null);
    }

    public String type() {
        return type;
    }

    public String senderId() {
        return senderId;
    }

    public String targetId() {
        return targetId;
    }

    public String namespace() {
        return namespace;
    }

    public int[] data() {
        return data;
    }

    public boolean hasKnownType() {
        return HELLO.equals(type) || WELCOME.equals(type) || LEAVE.equals(type) || ACTION.equals(type);
    }
}
