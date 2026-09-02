package main.java.cn.jongwong.repository;

import cn.jongwong.entity.PencilLibrary;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PencilLibraryRepository extends JpaRepository<PencilLibrary, String> {

    PencilLibrary findOneByKeyAndVersion(String key, String version);


}
