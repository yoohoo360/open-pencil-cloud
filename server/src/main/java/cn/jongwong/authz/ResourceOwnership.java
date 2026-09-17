package cn.jongwong.authz;

/**
 * Ownership / org affiliation metadata for a resource.
 * Authz does not know document/library schemas — callers supply this.
 */
public record ResourceOwnership(
        String resourceType,
        String resourceId,
        /** External key used in URLs (e.g. document key). May equal resourceId. */
        String resourceKey,
        String ownerUserId,
        /** Owning organization/team; null = personal resource (orgs cannot see it). */
        String organizationId,
        /** Resource-level flag (e.g. document allow_copy). */
        boolean allowCopy
) {
    public boolean isPersonal() {
        return organizationId == null || organizationId.isBlank();
    }
}
