-- Multi-file skill packages: SKILL.md plus directories like references/.

CREATE TABLE pencil_skill_entries
(
    id          CHAR(36) PRIMARY KEY NOT NULL,
    skill_id    CHAR(36)             NOT NULL,
    parent_id   CHAR(36),
    kind        VARCHAR(16)          NOT NULL,
    name        VARCHAR(255)         NOT NULL,
    path        VARCHAR(1024)        NOT NULL,
    content     TEXT,
    sort_order  INT      DEFAULT 0   NOT NULL,
    is_deleted  INT      DEFAULT 0   NOT NULL,
    created_at  BIGINT               NOT NULL,
    updated_at  BIGINT               NOT NULL
);

CREATE UNIQUE INDEX uk_pencil_skill_entries_path
    ON pencil_skill_entries (skill_id, path)
    WHERE is_deleted = 0;

CREATE INDEX idx_pencil_skill_entries_skill
    ON pencil_skill_entries (skill_id, is_deleted);

CREATE INDEX idx_pencil_skill_entries_parent
    ON pencil_skill_entries (parent_id, is_deleted);

-- Backfill each existing skill as a SKILL.md root file.
INSERT INTO pencil_skill_entries (id, skill_id, parent_id, kind, name, path, content, sort_order, is_deleted, created_at, updated_at)
SELECT gen_random_uuid()::text,
       s.id,
       NULL,
       'file',
       'SKILL.md',
       'SKILL.md',
       s.content,
       0,
       0,
       COALESCE(s.created_at, (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT),
       COALESCE(s.updated_at, (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT)
FROM pencil_skills s
WHERE s.is_deleted = 0
  AND NOT EXISTS (
        SELECT 1
        FROM pencil_skill_entries e
        WHERE e.skill_id = s.id
          AND e.path = 'SKILL.md'
          AND e.is_deleted = 0
    );

COMMENT ON TABLE pencil_skill_entries IS 'Files and directories inside a skill package (SKILL.md, references/, …)';
COMMENT ON COLUMN pencil_skill_entries.kind IS 'file | directory';
COMMENT ON COLUMN pencil_skill_entries.path IS 'Path relative to skill root, e.g. references/api.md';
