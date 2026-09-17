package cn.jongwong.authz;

public enum AccessRequestStatus {
    PENDING,
    APPROVED,
    REJECTED;

    public static AccessRequestStatus parse(String value) {
        return AccessRequestStatus.valueOf(value.trim().toUpperCase());
    }

    public String wire() {
        return name().toLowerCase();
    }
}
