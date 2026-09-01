package cn.jongwong.service;

import cn.jongwong.auth.AuthUsernames;
import cn.jongwong.auth.EmailVerificationService;
import cn.jongwong.auth.OauthService.OauthProfile;
import cn.jongwong.domain.entity.Role;
import cn.jongwong.domain.entity.User;
import cn.jongwong.domain.entity.UserOauthAccount;
import cn.jongwong.domain.entity.UserRole;
import cn.jongwong.domain.entity.enums.UserStatus;
import cn.jongwong.domain.entity.id.UserRoleId;
import cn.jongwong.domain.repository.RoleRepository;
import cn.jongwong.domain.repository.UserOauthAccountRepository;
import cn.jongwong.domain.repository.UserRepository;
import cn.jongwong.dto.AuthResponse;
import cn.jongwong.dto.LoginRequest;
import cn.jongwong.dto.RegisterRequest;
import cn.jongwong.dto.RegisterResponse;
import cn.jongwong.dto.UserDTO;
import cn.jongwong.exception.ApiException;
import cn.jongwong.exception.AuthenticationException;
import cn.jongwong.exception.ResourceNotFoundException;
import cn.jongwong.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.HexFormat;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final UserOauthAccountRepository oauthAccountRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserService userService;
    private final RefreshTokenService refreshTokenService;
    private final EmailVerificationService emailVerificationService;

    @Transactional
    public AuthResponse login(LoginRequest loginRequest) {
        log.debug("Attempting login for user: {}", loginRequest.getUsernameOrEmail());

        User user = userRepository.findByEmail(loginRequest.getUsernameOrEmail())
                .or(() -> userRepository.findByUsername(loginRequest.getUsernameOrEmail()))
                .orElseThrow(() -> new AuthenticationException("Invalid username/email or password"));

        if (!passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())) {
            log.warn("Failed login attempt for user: {}", loginRequest.getUsernameOrEmail());
            throw new AuthenticationException("Invalid username/email or password");
        }

        if (user.getStatus() == UserStatus.PENDING_VERIFICATION) {
            throw new AuthenticationException("Please verify your email before signing in");
        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            log.warn("Login attempt for inactive user: {}", user.getUsername());
            throw new AuthenticationException("Account is not active. Please contact support.");
        }

        return issueSession(user);
    }

    @Transactional
    public RegisterResponse register(RegisterRequest registerRequest) {
        log.debug("Attempting to register user: {}", registerRequest.getUsername());

        String email = EmailVerificationService.normalize(registerRequest.getEmail());
        User existing = userRepository.findByEmail(email).orElse(null);
        if (existing != null) {
            if (existing.getStatus() == UserStatus.PENDING_VERIFICATION) {
                emailVerificationService.sendCode(email);
                return RegisterResponse.builder().requiresVerification(true).email(email).build();
            }
            throw new AuthenticationException("Email is already in use");
        }

        if (userRepository.existsByUsername(registerRequest.getUsername())) {
            throw new AuthenticationException("Username is already taken");
        }

        if (registerRequest.getPhone() != null && !registerRequest.getPhone().isBlank()) {
            if (userRepository.existsByPhone(registerRequest.getPhone())) {
                throw new AuthenticationException("Phone number is already in use");
            }
        }

        User user = User.builder()
                .username(registerRequest.getUsername().trim())
                .email(email)
                .password(passwordEncoder.encode(registerRequest.getPassword()))
                .name(registerRequest.getName().trim())
                .phone(registerRequest.getPhone())
                .status(UserStatus.PENDING_VERIFICATION)
                .emailVerified(0)
                .roles(new LinkedHashSet<>())
                .build();

        user = userRepository.save(user);
        assignDefaultRole(user);
        emailVerificationService.sendCode(email);
        log.info("User registered, pending email verification: {}", user.getUsername());
        return RegisterResponse.builder().requiresVerification(true).email(email).build();
    }

    @Transactional
    public AuthResponse verifyEmail(String email, String code) {
        String normalized = EmailVerificationService.normalize(email);
        User user = userRepository.findByEmail(normalized)
                .orElseThrow(() -> ApiException.badRequest("Invalid or expired verification code"));
        if (user.getStatus() == UserStatus.ACTIVE && Integer.valueOf(1).equals(user.getEmailVerified())) {
            return issueSession(user);
        }
        emailVerificationService.verifyOrThrow(normalized, code);
        user.setStatus(UserStatus.ACTIVE);
        user.setEmailVerified(1);
        userRepository.save(user);
        log.info("Email verified for {}", user.getUsername());
        return issueSession(user);
    }

    @Transactional
    public void resendVerification(String email) {
        String normalized = EmailVerificationService.normalize(email);
        userRepository.findByEmail(normalized).ifPresent(user -> {
            if (user.getStatus() == UserStatus.PENDING_VERIFICATION) {
                emailVerificationService.sendCode(normalized);
            }
        });
    }

    @Transactional
    public String findOrCreateOauthUser(OauthProfile profile) {
        return oauthAccountRepository
                .findByProviderAndProviderUserId(profile.provider(), profile.providerUserId())
                .map(account -> {
                    User user = userRepository.findById(account.getUserId())
                            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
                    activateVerified(user, profile);
                    return user.getId();
                })
                .orElseGet(() -> linkOrCreateOauthUser(profile).getId());
    }

    @Transactional
    public AuthResponse issueSessionByUserId(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new AuthenticationException("Account is not active");
        }
        return issueSession(user);
    }

    @Transactional
    public AuthResponse refreshToken(String refreshTokenValue) {
        log.debug("Attempting to refresh token");
        refreshTokenService.validateRefreshToken(refreshTokenValue);
        String userId = refreshTokenService.getUserIdFromToken(refreshTokenValue);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new AuthenticationException("Account is not active");
        }
        String newRefreshToken = refreshTokenService.refreshToken(refreshTokenValue, userId);
        String newAccessToken = jwtTokenProvider.generateAccessToken(userId, user.getEmail());
        log.info("Token refreshed successfully for user: {}", user.getUsername());
        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtTokenProvider.getAccessTokenExpiration())
                .user(mapUserToDTO(user))
                .build();
    }

    @Transactional
    public void logout(String refreshTokenValue) {
        log.debug("Attempting to logout user");
        if (refreshTokenValue != null && !refreshTokenValue.isBlank()) {
            refreshTokenService.revokeRefreshToken(refreshTokenValue);
        }
        log.info("User logged out successfully");
    }

    @Transactional
    public void logoutFromAllDevices(String userId) {
        log.debug("Attempting to logout user from all devices: {}", userId);
        int revokedCount = refreshTokenService.revokeAllUserRefreshTokens(userId);
        log.info("Logged out user from {} devices", revokedCount);
    }

    @Transactional(readOnly = true)
    public UserDTO getCurrentUser() {
        return userService.getCurrentAuthenticatedUser();
    }

    @Transactional
    public void initiatePasswordReset(String email) {
        userRepository.findByEmail(email).ifPresent(user ->
                log.info("Password reset requested for {}", email)
        );
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        log.warn("Password reset called with token {} (placeholder)", token);
        if (newPassword == null || newPassword.isBlank()) {
            throw new IllegalArgumentException("New password cannot be blank");
        }
    }

    private User linkOrCreateOauthUser(OauthProfile profile) {
        String email = profile.email().trim().toLowerCase(Locale.ROOT);
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            String username = AuthUsernames.unique(
                    AuthUsernames.fromHandle(profile.usernameHint(), email),
                    userRepository::existsByUsername
            );
            user = User.builder()
                    .username(username)
                    .email(email)
                    .password(passwordEncoder.encode(randomSecret()))
                    .name(profile.name() == null || profile.name().isBlank() ? username : profile.name())
                    .avatar(blankToNull(profile.avatar()))
                    .status(UserStatus.ACTIVE)
                    .emailVerified(1)
                    .roles(new LinkedHashSet<>())
                    .build();
            user = userRepository.save(user);
            assignDefaultRole(user);
            log.info("Created user {} from {}", user.getUsername(), profile.provider());
        } else {
            activateVerified(user, profile);
        }
        oauthAccountRepository.save(UserOauthAccount.builder()
                .id(UUID.randomUUID().toString())
                .userId(user.getId())
                .provider(profile.provider())
                .providerUserId(profile.providerUserId())
                .createdAt(Instant.now())
                .build());
        return user;
    }

    private void activateVerified(User user, OauthProfile profile) {
        if (user.getStatus() == UserStatus.PENDING_VERIFICATION || user.getStatus() == UserStatus.INACTIVE) {
            user.setStatus(UserStatus.ACTIVE);
        }
        user.setEmailVerified(1);
        if ((user.getAvatar() == null || user.getAvatar().isBlank()) && profile.avatar() != null) {
            user.setAvatar(profile.avatar());
        }
        userRepository.save(user);
    }

    private AuthResponse issueSession(User user) {
        user.setLastLoginAt(Instant.now());
        userRepository.save(user);
        String accessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail());
        String refreshTokenValue = jwtTokenProvider.generateRefreshToken(user.getId());
        refreshTokenService.createRefreshToken(user.getId(), refreshTokenValue);
        log.info("User logged in successfully: {}", user.getUsername());
        return buildAuthResponse(user, accessToken, refreshTokenValue);
    }

    private void assignDefaultRole(User user) {
        Role userRole = roleRepository.findByName("USER")
                .orElseGet(this::createDefaultUserRole);

        UserRole userRoleEntity = UserRole.builder()
                .id(new UserRoleId(user.getId(), userRole.getId()))
                .user(user)
                .role(userRole)
                .build();

        user.getRoles().add(userRoleEntity);
        userRepository.save(user);
    }

    private Role createDefaultUserRole() {
        log.warn("USER role not found, creating default role");
        Role role = Role.builder()
                .name("USER")
                .label("User")
                .description("Default user role")
                .permissions(new LinkedHashSet<>())
                .users(new LinkedHashSet<>())
                .build();
        return roleRepository.save(role);
    }

    private AuthResponse buildAuthResponse(User user, String accessToken, String refreshToken) {
        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtTokenProvider.getAccessTokenExpiration())
                .user(mapUserToDTO(user))
                .build();
    }

    private UserDTO mapUserToDTO(User user) {
        return UserDTO.builder()
                .id(user.getId())
                .email(user.getEmail())
                .phone(user.getPhone())
                .username(user.getUsername())
                .name(user.getName())
                .avatar(user.getAvatar())
                .status(user.getStatus())
                .lastLoginAt(user.getLastLoginAt())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }

    private static String randomSecret() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
