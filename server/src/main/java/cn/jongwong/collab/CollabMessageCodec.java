package cn.jongwong.collab;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

/**
 * Share-room frames stay camelCase so they match the browser transport.
 * Do not reuse the API ObjectMapper (that one writes snake_case).
 */
@Component
public class CollabMessageCodec {

    private final ObjectMapper mapper = new ObjectMapper();

    public CollabMessage read(String json) throws Exception {
        JsonNode node = mapper.readTree(json);
        if (node == null || !node.isObject()) {
            return null;
        }
        String type = text(node, "type");
        String senderId = text(node, "senderId");
        if (type == null || senderId == null) {
            return null;
        }
        return new CollabMessage(type, senderId, text(node, "targetId"), text(node, "namespace"), null);
    }

    public String write(CollabMessage message) throws Exception {
        return mapper.writeValueAsString(message);
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || value.isNull() || !value.isTextual()) {
            return null;
        }
        String text = value.asText();
        return text.isBlank() ? null : text;
    }
}
