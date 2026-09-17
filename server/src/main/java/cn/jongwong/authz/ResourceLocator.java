package cn.jongwong.authz;

import java.util.Optional;

/**
 * Resolves resource ownership for a given type + id-or-key.
 * Each product domain registers its own locator (document, library, …).
 */
public interface ResourceLocator {
    String resourceType();

    Optional<ResourceOwnership> findByIdOrKey(String idOrKey);
}
