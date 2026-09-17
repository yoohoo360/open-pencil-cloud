package cn.jongwong.authz.locator;

import cn.jongwong.authz.ResourceLocator;
import cn.jongwong.authz.ResourceOwnership;
import cn.jongwong.entity.PencilDocument;
import cn.jongwong.repository.PencilFileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Adapts pencil documents into the generic authz resource model.
 * Authorization logic stays in {@link cn.jongwong.authz.AuthzService}.
 */
@Component
@RequiredArgsConstructor
public class DocumentResourceLocator implements ResourceLocator {

    public static final String TYPE = "document";

    private final PencilFileRepository pencilFileRepository;

    @Override
    public String resourceType() {
        return TYPE;
    }

    @Override
    public Optional<ResourceOwnership> findByIdOrKey(String idOrKey) {
        Optional<PencilDocument> byKey = pencilFileRepository.findByKeyAndIsDeleted(idOrKey, 0);
        PencilDocument doc = byKey.orElseGet(() ->
                pencilFileRepository.findById(idOrKey).filter(d -> d.getIsDeleted() == null || d.getIsDeleted() == 0)
                        .orElse(null));
        if (doc == null) {
            return Optional.empty();
        }
        return Optional.of(toOwnership(doc));
    }

    public static ResourceOwnership toOwnership(PencilDocument doc) {
        return new ResourceOwnership(
                TYPE,
                doc.getId(),
                doc.getKey(),
                doc.getOwnerId(),
                doc.getTeamId(),
                !Boolean.FALSE.equals(doc.getAllowCopy()));
    }
}
