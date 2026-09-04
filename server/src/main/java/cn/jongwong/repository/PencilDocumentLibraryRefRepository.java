package cn.jongwong.repository;

import cn.jongwong.entity.PencilDocumentLibraryRef;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PencilDocumentLibraryRefRepository extends JpaRepository<PencilDocumentLibraryRef, String> {

    PencilDocumentLibraryRef findByDocumentKeyAndLibraryKeyAndDocumentVersion(
            String documentKey,
            String libraryKey,
            String documentVersion
    );

    List<PencilDocumentLibraryRef> findByDocumentKeyAndDocumentVersion(
            String documentKey,
            String documentVersion
    );

}
