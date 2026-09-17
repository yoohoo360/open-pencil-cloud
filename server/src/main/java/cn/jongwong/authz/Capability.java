package cn.jongwong.authz;

/**
 * Fine-grained actions. Policies map {@link AccessRole} → capabilities per resource type.
 */
public enum Capability {
    VIEW,
    EDIT,
    COMMENT,
    COPY,
    DUPLICATE,
    EXPORT,
    SHARE,
    MANAGE_ACCESS,
    DELETE;

    public String wire() {
        return name().toLowerCase();
    }
}
