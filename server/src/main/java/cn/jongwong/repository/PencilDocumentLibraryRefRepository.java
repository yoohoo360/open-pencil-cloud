package cn.jongwong.repository;

import cn.jongwong.entity.PencilDocumentLibraryRef;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

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

    List<PencilDocumentLibraryRef> findByDocumentKeyAndLibraryKey(
            String documentKey,
            String libraryKey
    );

    void deleteByDocumentKey(String documentKey);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("""
            delete from PencilDocumentLibraryRef r
            where r.documentKey = :documentKey and r.libraryKey = :libraryKey
            """)
    int deleteByDocumentKeyAndLibraryKey(
            @Param("documentKey") String documentKey,
            @Param("libraryKey") String libraryKey
    );

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("""
            delete from PencilDocumentLibraryRef r
            where r.documentKey = :documentKey
              and r.libraryKey = :libraryKey
              and r.documentVersion = :documentVersion
            """)
    int deleteByDocumentKeyAndLibraryKeyAndDocumentVersion(
            @Param("documentKey") String documentKey,
            @Param("libraryKey") String libraryKey,
            @Param("documentVersion") String documentVersion
    );
}
