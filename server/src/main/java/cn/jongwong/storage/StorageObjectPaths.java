package cn.jongwong.storage;

import java.time.LocalDate;
import java.util.Locale;

public final class StorageObjectPaths {

    private StorageObjectPaths() {
    }

    public static String quarterDirectory() {
        return quarterDirectory(LocalDate.now());
    }

    public static String quarterDirectory(LocalDate date) {
        int quarter = (date.getMonthValue() - 1) / 3 + 1;
        return date.getYear() + "Q" + quarter;
    }

    public static String sanitizeSegment(String value) {
        if (value == null || value.isBlank()) {
            return "anonymous";
        }
        String cleaned = value.trim().replace('\\', '-').replace('/', '-').replaceAll("\\s+", "-");
        return cleaned.isEmpty() ? "anonymous" : cleaned;
    }

    public static String directory(String kind, String username) {
        return kind + "/" + sanitizeSegment(username) + "/" + quarterDirectory();
    }

    public static String documentDirectory(String kind, String key) {
        return kind + "/" + quarterDirectory() + "/" + key;
    }

    public static String documentJsonFileName(String key) {
        return key + ".json";
    }

    public static String documentFolder(String storedPath) {
        String path = stripSlashes(storedPath);
        int slash = path.lastIndexOf('/');
        if (slash < 0) {
            return stem(path);
        }
        String fileName = path.substring(slash + 1);
        String parent = path.substring(0, slash);
        String name = stem(fileName);
        if (parent.equals(name) || parent.endsWith("/" + name)) {
            return parent;
        }
        return parent + "/" + name;
    }

    public static String versionDirectory(String storedPath) {
        return documentFolder(storedPath) + "/versions";
    }

    public static String versionSnapshotDirectory(String storedPath, String versionId) {
        return versionDirectory(storedPath) + "/" + versionId;
    }

    public static String versionJsonFileName(String versionId) {
        return versionId + ".json";
    }

    public static final String THUMBNAIL_FILE_NAME = "thumbnail.png";

    public static String thumbnailPath(String storedPath) {
        return documentFolder(storedPath) + "/" + THUMBNAIL_FILE_NAME;
    }

    public static String blobDirectory(String storedPath) {
        return documentFolder(storedPath) + "/blobs";
    }

    private static String stem(String fileName) {
        String name = stripSlashes(fileName);
        String lower = name.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".json")) {
            return name.substring(0, name.length() - 5);
        }
        if (lower.endsWith(".fig")) {
            return name.substring(0, name.length() - 4);
        }
        return name;
    }

    private static String stripSlashes(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value.trim().replaceAll("^/+", "").replaceAll("/+$", "");
    }
}
