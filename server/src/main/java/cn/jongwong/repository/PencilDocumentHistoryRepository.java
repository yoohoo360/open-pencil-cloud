package main.java.cn.jongwong.repository;

import cn.jongwong.entity.PencilDocumentHistory;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PencilDocumentHistoryRepository extends JpaRepository<PencilDocumentHistory, String> {

    Optional<PencilDocumentHistory> findByIdAndDocumentIdAndIsDeleted(String id, String documentId, int isDeleted);

    List<PencilDocumentHistory> findByDocumentIdAndKindAndIsDeletedOrderByCreatedAtDesc(
            String documentId,
            String kind,
            int isDeleted
    );

    List<PencilDocumentHistory> findByDocumentIdAndKindAndIsDeletedOrderByCreatedAtDesc(
            String documentId,
            String kind,
            int isDeleted,
            Pageable pageable
    );

    List<PencilDocumentHistory> findByDocumentIdAndKindAndIsDeletedAndCreatedAtLessThanOrderByCreatedAtDesc(
            String documentId,
            String kind,
            int isDeleted,
            long createdAt,
            Pageable pageable
    );
}
