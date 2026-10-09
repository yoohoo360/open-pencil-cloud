CREATE TABLE pencil_skills
(
    id          CHAR(36) PRIMARY KEY NOT NULL,
    skill_key   VARCHAR(255)         NOT NULL,
    name        VARCHAR(500)         NOT NULL,
    description TEXT,
    content     TEXT                 NOT NULL,
    scope       VARCHAR(32)          NOT NULL,
    owner_id    CHAR(36),
    team_id     CHAR(36),
    is_deleted  INT      DEFAULT 0   NOT NULL,
    created_at  BIGINT               NOT NULL,
    updated_at  BIGINT               NOT NULL
);

CREATE UNIQUE INDEX uk_pencil_skills_personal_key
    ON pencil_skills (owner_id, skill_key)
    WHERE scope = 'personal' AND is_deleted = 0;

CREATE UNIQUE INDEX uk_pencil_skills_team_key
    ON pencil_skills (team_id, skill_key)
    WHERE scope = 'team' AND is_deleted = 0;

CREATE INDEX idx_pencil_skills_owner ON pencil_skills (owner_id, is_deleted);
CREATE INDEX idx_pencil_skills_team ON pencil_skills (team_id, is_deleted);

COMMENT ON TABLE pencil_skills IS 'Personal or team AI skills (SKILL.md-style prompts) for Dev codegen';
COMMENT ON COLUMN pencil_skills.scope IS 'personal | team';
COMMENT ON COLUMN pencil_skills.content IS 'Markdown instructions injected into AI codegen';
