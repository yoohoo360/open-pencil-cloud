package cn.jongwong.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileInfo {

    private String name;
    private String path;
    private Long size;
    private String modifiedTime;
    private Boolean isDirectory;
    private String contentType;

    public static FileInfo fromPath(java.nio.file.Path path, String basePath) {
        try {
            java.nio.file.Path absolute = path.toAbsolutePath();
            String relative = basePath != null
                    ? absolute.toString().replace(basePath, "").replaceAll("^/", "")
                    : path.getFileName().toString();

            return FileInfo.builder()
                    .name(path.getFileName().toString())
                    .path(relative)
                    .size(java.nio.file.Files.size(path))
                    .isDirectory(java.nio.file.Files.isDirectory(path))
                    .contentType(java.nio.file.Files.probeContentType(path))
                    .build();
        } catch (Exception e) {
            return FileInfo.builder()
                    .name(path.getFileName().toString())
                    .isDirectory(true)
                    .build();
        }
    }
}