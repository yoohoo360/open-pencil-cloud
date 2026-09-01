package cn.jongwong.ro;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PencilLibrariesResponse {

    private String id;
    private String key;
    private String name;
    private String description;
    private String url;
    private String teamId;
    private String projectId;
    private String thumbnailUrl;
    private String version;
    private String schemaVersion;
    private Integer isDeleted;
    private Instant createdAt;
    private Instant updatedAt;
}