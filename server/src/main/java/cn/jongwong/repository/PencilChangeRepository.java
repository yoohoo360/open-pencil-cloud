package main.java.cn.jongwong.repository;

import cn.jongwong.entity.PencilChange;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PencilChangeRepository extends JpaRepository<PencilChange, String> {
}
