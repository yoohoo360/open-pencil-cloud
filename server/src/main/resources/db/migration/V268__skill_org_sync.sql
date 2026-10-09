-- Org-scoped keys, team remotes, and git-like merge requests for skill sharing.

ALTER TABLE pencil_skills
    ADD COLUMN IF NOT EXISTS org_id CHAR(36);

ALTER TABLE pencil_skills
    ADD COLUMN IF NOT EXISTS team_id CHAR(36);

-- Backfill org_id from group owner is not enough; leave null for legacy and set on next write.
CREATE INDEX IF NOT EXISTS idx_pencil_skills_org ON pencil_skills (org_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_pencil_skills_team ON pencil_skills (team_id, is_deleted);

DROP INDEX IF EXISTS uk_pencil_skills_group_key;

-- Personal working copies: unique per owner within an org.
CREATE UNIQUE INDEX IF NOT EXISTS uk_pencil_skills_org_personal_key
    ON pencil_skills (org_id, owner_id, skill_key)
    WHERE is_deleted = 0 AND team_id IS NULL AND org_id IS NOT NULL;

-- Team remotes: unique per team within an org.
CREATE UNIQUE INDEX IF NOT EXISTS uk_pencil_skills_org_team_key
    ON pencil_skills (org_id, team_id, skill_key)
    WHERE is_deleted = 0 AND team_id IS NOT NULL AND org_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS pencil_skill_merge_requests
(
    id               CHAR(36) PRIMARY KEY NOT NULL,
    org_id           CHAR(36)             NOT NULL,
    source_skill_id  CHAR(36)             NOT NULL,
    target_team_id   CHAR(36)             NOT NULL,
    target_skill_id  CHAR(36),
    skill_key        VARCHAR(255)         NOT NULL,
    title            VARCHAR(500)         NOT NULL,
    message          TEXT,
    status           VARCHAR(32)          NOT NULL,
    created_by       CHAR(36)             NOT NULL,
    reviewed_by      CHAR(36),
    review_note      TEXT,
    created_at       BIGINT               NOT NULL,
    updated_at       BIGINT               NOT NULL,
    merged_at        BIGINT
);

CREATE INDEX IF NOT EXISTS idx_skill_mr_org_status
    ON pencil_skill_merge_requests (org_id, status);

CREATE INDEX IF NOT EXISTS idx_skill_mr_team_status
    ON pencil_skill_merge_requests (target_team_id, status);

CREATE INDEX IF NOT EXISTS idx_skill_mr_source
    ON pencil_skill_merge_requests (source_skill_id);

COMMENT ON TABLE pencil_skill_merge_requests IS 'Share personal skills to a team with merge admission (git-like)';
COMMENT ON COLUMN pencil_skill_merge_requests.status IS 'pending | approved | rejected | merged | cancelled';
COMMENT ON COLUMN pencil_skills.team_id IS 'NULL = personal working copy; set = team remote';
COMMENT ON COLUMN pencil_skills.org_id IS 'Organization scope for key uniqueness and sharing';
