package main.java.cn.jongwong.repository;

import cn.jongwong.entity.PencilDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PencilFileRepository extends JpaRepository<PencilDocument, String> {
    Optional<PencilDocument> findByKeyAndIsDeleted(String key, int isDeleted);

    List<PencilDocument> findByIsDeletedOrderByUpdatedAtDesc(int isDeleted);

    // 且不是IsDeleted
    boolean existsByKeyAndIsDeleted(String key, int isDeleted);
}
