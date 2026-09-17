package cn.jongwong.repository;

import cn.jongwong.entity.PencilDocumentRecent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PencilDocumentRecentRepository extends JpaRepository<PencilDocumentRecent, String> {

    Optional<PencilDocumentRecent> findByUserIdAndDocumentId(String userId, String documentId);

    List<PencilDocumentRecent> findByUserIdOrderByOpenedAtDesc(String userId);

    void deleteByDocumentId(String documentId);

    void deleteByDocumentKey(String documentKey);
}
