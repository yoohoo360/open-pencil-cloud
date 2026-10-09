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
public class SkillEntryRO {

    /** file | directory */
    @NotBlank
    private String kind;

    @NotBlank
    private String name;

    /** Parent directory entry id; omit for skill root */
    private String parentId;

    /** File content (ignored for directories) */
    private String content;
}
