package cn.jongwong.ro;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PencilDocumentRequest {

    /**
     * Figma 文件 KEY
     */
    private String key;

    /**
     * 文件名称
     */
    private String name;

    /**
     * 文件描述
     */
    private String description;

    /**
     * 团队 ID
     */
    private String teamId;

    /**
     * 项目 ID
     */
    private String projectId;


    /**
     * 版本号
     */
    private String version;
}