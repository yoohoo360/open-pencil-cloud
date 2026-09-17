package cn.jongwong.authz;

/**
 * GitHub-style repository roles mapped to our product vocabulary.
 * read / write / admin
 */
public enum AccessRole {
    READ,
    WRITE,
    ADMIN;

    public boolean atLeast(AccessRole required) {
        return this.ordinal() >= required.ordinal();
    }

    public static AccessRole parse(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Access role is required");
        }
        String normalized = value.trim().toLowerCase();
        return switch (normalized) {
            case "read", "view" -> READ;
            case "write", "edit" -> WRITE;
            case "admin", "manage" -> ADMIN;
            default -> AccessRole.valueOf(value.trim().toUpperCase());
        };
    }

    public String wire() {
        return name().toLowerCase();
    }
}
