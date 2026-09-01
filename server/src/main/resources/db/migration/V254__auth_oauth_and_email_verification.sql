ALTER TABLE users
    ADD COLUMN IF NOT EXISTS email_verified INT NOT NULL DEFAULT 0;

ALTER TABLE users
    ALTER COLUMN avatar TYPE TEXT;

UPDATE users
SET email_verified = 1
WHERE email_verified = 0;

COMMENT ON COLUMN users.email_verified IS '1 if the email address has been verified';

CREATE TABLE IF NOT EXISTS user_oauth_accounts
(
    id                CHAR(36) PRIMARY KEY NOT NULL,
    user_id           CHAR(36)             NOT NULL,
    provider          VARCHAR(20)          NOT NULL,
    provider_user_id  VARCHAR(255)         NOT NULL,
    created_at        BIGINT               NOT NULL,
    CONSTRAINT fk_user_oauth_accounts_user
        FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT uk_user_oauth_provider_user
        UNIQUE (provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_oauth_accounts_user
    ON user_oauth_accounts (user_id);

COMMENT ON TABLE user_oauth_accounts IS 'Linked GitHub/Google identities for a user';
COMMENT ON COLUMN user_oauth_accounts.provider IS 'github or google';
COMMENT ON COLUMN user_oauth_accounts.provider_user_id IS 'Provider-stable user id';
