package cn.jongwong.ro;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublishLibraryRO {

    @NotBlank
    private String key;

    @NotBlank
    private String name;

    @NotBlank
    private String url;

    private String description;

    private String thumbnailUrl;

    private String version;

    private String schemaVersion;

    private String projectId;
}
