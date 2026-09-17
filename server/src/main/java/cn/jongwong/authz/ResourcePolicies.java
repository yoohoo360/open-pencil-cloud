package cn.jongwong.authz;

import java.util.Collections;
import java.util.EnumSet;
import java.util.Set;

/**
 * Maps roles to capabilities. Document policy mirrors Figma/GitHub write semantics.
 */
public final class ResourcePolicies {

    private ResourcePolicies() {}

    public static Set<Capability> capabilities(String resourceType, AccessRole role, boolean allowCopy) {
        if (role == null) {
            return Set.of();
        }
        // Default policy shared by document-like resources.
        EnumSet<Capability> caps = EnumSet.of(Capability.VIEW, Capability.COMMENT);
        if (role.atLeast(AccessRole.WRITE)) {
            caps.add(Capability.EDIT);
            if (allowCopy) {
                caps.add(Capability.COPY);
                caps.add(Capability.DUPLICATE);
                caps.add(Capability.EXPORT);
            }
        }
        if (role.atLeast(AccessRole.ADMIN)) {
            caps.add(Capability.SHARE);
            caps.add(Capability.MANAGE_ACCESS);
            caps.add(Capability.DELETE);
            caps.add(Capability.COPY);
            caps.add(Capability.DUPLICATE);
            caps.add(Capability.EXPORT);
        }
        return Collections.unmodifiableSet(caps);
    }
}
