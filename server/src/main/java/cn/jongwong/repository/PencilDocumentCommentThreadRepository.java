package cn.jongwong.repository;

import cn.jongwong.entity.PencilDocumentCommentThread;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PencilDocumentCommentThreadRepository extends JpaRepository<PencilDocumentCommentThread, String> {

    Optional<PencilDocumentCommentThread> findByIdAndDocumentIdAndIsDeleted(String id, String documentId, int isDeleted);

    List<PencilDocumentCommentThread> findByDocumentIdAndIsDeletedOrderByUpdatedAtDesc(
            String documentId,
            int isDeleted
    );

    List<PencilDocumentCommentThread> findByDocumentIdAndIsDeletedAndResolvedOrderByUpdatedAtDesc(
            String documentId,
            int isDeleted,
            int resolved
    );

    List<PencilDocumentCommentThread> findByDocumentIdAndPageIdAndIsDeletedOrderByUpdatedAtDesc(
            String documentId,
            String pageId,
            int isDeleted
    );

    List<PencilDocumentCommentThread> findByDocumentIdAndPageIdAndIsDeletedAndResolvedOrderByUpdatedAtDesc(
            String documentId,
            String pageId,
            int isDeleted,
            int resolved
    );
}
