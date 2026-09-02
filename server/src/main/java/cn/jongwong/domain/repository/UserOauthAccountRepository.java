package main.java.cn.jongwong.domain.repository;

import cn.jongwong.domain.entity.UserOauthAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserOauthAccountRepository extends JpaRepository<UserOauthAccount, String> {

    Optional<UserOauthAccount> findByProviderAndProviderUserId(String provider, String providerUserId);
}
