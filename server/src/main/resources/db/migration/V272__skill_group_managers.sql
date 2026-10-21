-- Skill group managers: creator is first manager; at least one manager required.
CREATE TABLE IF NOT EXISTS pencil_skill_group_managers
(
    id         CHAR(36) PRIMARY KEY NOT NULL,
    group_id   CHAR(36)             NOT NULL,
    user_id    CHAR(36)             NOT NULL,
    created_at BIGINT               NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_pencil_skill_group_managers
    ON pencil_skill_group_managers (group_id, user_id);

CREATE INDEX IF NOT EXISTS idx_pencil_skill_group_managers_user
    ON pencil_skill_group_managers (user_id);

-- Backfill: each group's owner becomes its first manager.
INSERT INTO pencil_skill_group_managers (id, group_id, user_id, created_at)
SELECT gen_random_uuid()::text,
       g.id,
       TRIM(g.owner_id),
       COALESCE(g.created_at, (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT)
FROM pencil_skill_groups g
WHERE g.is_deleted = 0
  AND g.owner_id IS NOT NULL
  AND TRIM(g.owner_id) <> ''
  AND NOT EXISTS (
        SELECT 1
        FROM pencil_skill_group_managers m
        WHERE m.group_id = g.id
          AND m.user_id = TRIM(g.owner_id)
    );

COMMENT ON TABLE pencil_skill_group_managers IS 'Managers of a skill group; creator is seeded; at least one required';
