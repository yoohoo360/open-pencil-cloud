package cn.jongwong.repository;

import cn.jongwong.entity.PencilDocumentAiReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PencilDocumentAiReviewRepository
        extends JpaRepository<PencilDocumentAiReview, String> {

    Optional<PencilDocumentAiReview> findByIdAndDocumentIdAndIsDeleted(
            String id,
            String documentId,
            int isDeleted
    );

    List<PencilDocumentAiReview> findByDocumentIdAndIsDeletedOrderByCreatedAtDesc(
            String documentId,
            int isDeleted
    );
}
