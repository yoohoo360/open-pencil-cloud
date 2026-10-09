CREATE TABLE pencil_skill_groups
(
    id          CHAR(36) PRIMARY KEY NOT NULL,
    group_key   VARCHAR(255)         NOT NULL,
    name        VARCHAR(500)         NOT NULL,
    description TEXT,
    scope       VARCHAR(32)          NOT NULL,
    owner_id    CHAR(36),
    team_id     CHAR(36),
    is_default  INT      DEFAULT 0   NOT NULL,
    sort_order  INT      DEFAULT 0   NOT NULL,
    is_deleted  INT      DEFAULT 0   NOT NULL,
    created_at  BIGINT               NOT NULL,
    updated_at  BIGINT               NOT NULL
);

CREATE UNIQUE INDEX uk_pencil_skill_groups_personal_key
    ON pencil_skill_groups (owner_id, group_key)
    WHERE scope = 'personal' AND is_deleted = 0;

CREATE UNIQUE INDEX uk_pencil_skill_groups_team_key
    ON pencil_skill_groups (team_id, group_key)
    WHERE scope = 'team' AND is_deleted = 0;

CREATE INDEX idx_pencil_skill_groups_owner ON pencil_skill_groups (owner_id, is_deleted);
CREATE INDEX idx_pencil_skill_groups_team ON pencil_skill_groups (team_id, is_deleted);

ALTER TABLE pencil_skills
    ADD COLUMN group_id CHAR(36);

CREATE INDEX idx_pencil_skills_group ON pencil_skills (group_id, is_deleted);

COMMENT ON TABLE pencil_skill_groups IS 'Personal or team skill groups; each scope has a Default group';
COMMENT ON COLUMN pencil_skill_groups.is_default IS '1 = Default group (cannot delete)';
COMMENT ON COLUMN pencil_skills.group_id IS 'Owning skill group';
