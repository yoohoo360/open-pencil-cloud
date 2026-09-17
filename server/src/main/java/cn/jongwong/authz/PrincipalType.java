package cn.jongwong.authz;

public enum PrincipalType {
    USER,
    TEAM;

    public static PrincipalType parse(String value) {
        return PrincipalType.valueOf(value.trim().toUpperCase());
    }

    public String wire() {
        return name().toLowerCase();
    }
}
