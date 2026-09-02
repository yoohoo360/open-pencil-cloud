package main.java.cn.jongwong.repository;

import cn.jongwong.entity.PencilNodeChange;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PencilNodeChangeRepository extends JpaRepository<PencilNodeChange, String> {
}
