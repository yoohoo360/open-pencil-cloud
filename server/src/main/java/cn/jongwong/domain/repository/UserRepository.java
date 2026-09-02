package main.java.cn.jongwong.domain.repository;

import cn.jongwong.domain.entity.User;
import cn.jongwong.domain.entity.enums.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Collection;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {

    Optional<User> findByEmail(String email);

    Optional<User> findByUsername(String username);

    Optional<User> findByPhone(String phone);

    boolean existsByEmail(String email);

    boolean existsByUsername(String username);

    boolean existsByPhone(String phone);

    // Dashboard statistics queries
    long countByStatus(UserStatus status);

    long countByStatusIn(Collection<UserStatus> statuses);

    long countByCreatedAtAfter(Instant instant);

    long countByCreatedAtBetween(Instant start, Instant end);

    long countByCreatedAtBefore(Instant instant);

    long countByStatusAndLastLoginAtBetween(UserStatus status, Instant start, Instant end);

    @Query("SELECT u FROM User u WHERE " +
            "(:status IS NULL OR u.status = :status) AND " +
            "(:search IS NULL OR LOWER(u.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(u.username) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<User> findByStatusAndSearch(
            @Param("status") UserStatus status,
            @Param("search") String search,
            Pageable pageable
    );

    @Query("SELECT u FROM User u JOIN u.roles ur WHERE ur.role.id = :roleId")
    Page<User> findByRoleId(@Param("roleId") String roleId, Pageable pageable);
}
