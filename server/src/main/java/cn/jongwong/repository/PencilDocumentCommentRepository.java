package main.java.cn.jongwong.repository;

import cn.jongwong.entity.PencilDocumentComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface PencilDocumentCommentRepository extends JpaRepository<PencilDocumentComment, String> {

    Optional<PencilDocumentComment> findByIdAndDocumentIdAndIsDeleted(String id, String documentId, int isDeleted);

    List<PencilDocumentComment> findByThreadIdInAndIsDeletedOrderByCreatedAtAsc(
            Collection<String> threadIds,
            int isDeleted
    );

    List<PencilDocumentComment> findByThreadIdAndIsDeletedOrderByCreatedAtAsc(String threadId, int isDeleted);

    long countByThreadIdAndIsDeleted(String threadId, int isDeleted);
}
