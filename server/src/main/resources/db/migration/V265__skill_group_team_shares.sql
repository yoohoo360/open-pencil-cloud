-- Flexible model: skills belong to groups; groups are owned personally and optionally shared to teams.
-- Idempotent so a failed mid-migration can be repaired and re-run.

CREATE TABLE IF NOT EXISTS pencil_skill_group_teams
(
    id         CHAR(36) PRIMARY KEY NOT NULL,
    group_id   CHAR(36)             NOT NULL,
    team_id    CHAR(36)             NOT NULL,
    created_by CHAR(36),
    created_at BIGINT               NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_pencil_skill_group_teams
    ON pencil_skill_group_teams (group_id, team_id);

CREATE INDEX IF NOT EXISTS idx_pencil_skill_group_teams_team
    ON pencil_skill_group_teams (team_id);

-- Move legacy team-scoped groups into share rows (only while scope/team_id still exist).
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'pencil_skill_groups'
          AND column_name = 'scope'
    ) AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'pencil_skill_groups'
          AND column_name = 'team_id'
    ) THEN
        INSERT INTO pencil_skill_group_teams (id, group_id, team_id, created_by, created_at)
        SELECT gen_random_uuid()::text,
               g.id,
               TRIM(g.team_id),
               TRIM(g.owner_id),
               COALESCE(g.created_at, (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT)
        FROM pencil_skill_groups g
        WHERE g.is_deleted = 0
          AND g.scope = 'team'
          AND g.team_id IS NOT NULL
          AND TRIM(g.team_id) <> ''
          AND NOT EXISTS (
                SELECT 1
                FROM pencil_skill_group_teams s
                WHERE s.group_id = g.id
                  AND s.team_id = TRIM(g.team_id)
            );
    END IF;
END $$;

DROP INDEX IF EXISTS uk_pencil_skill_groups_personal_key;
DROP INDEX IF EXISTS uk_pencil_skill_groups_team_key;
DROP INDEX IF EXISTS uk_pencil_skills_personal_key;
DROP INDEX IF EXISTS uk_pencil_skills_team_key;

ALTER TABLE pencil_skill_groups
    DROP COLUMN IF EXISTS scope;
ALTER TABLE pencil_skill_groups
    DROP COLUMN IF EXISTS team_id;
ALTER TABLE pencil_skill_groups
    DROP COLUMN IF EXISTS is_default;

ALTER TABLE pencil_skills
    DROP COLUMN IF EXISTS scope;
ALTER TABLE pencil_skills
    DROP COLUMN IF EXISTS team_id;

-- Collapse duplicate (owner_id, group_key) rows left by per-team Default groups.
-- Keep the oldest group; move skills + shares; soft-delete the rest.
DO $$
DECLARE
    dup RECORD;
    keeper_id CHAR(36);
    loser_id CHAR(36);
BEGIN
    FOR dup IN
        SELECT TRIM(owner_id) AS owner_key, group_key
        FROM pencil_skill_groups
        WHERE is_deleted = 0
        GROUP BY TRIM(owner_id), group_key
        HAVING COUNT(*) > 1
    LOOP
        SELECT id
        INTO keeper_id
        FROM pencil_skill_groups
        WHERE is_deleted = 0
          AND TRIM(owner_id) = dup.owner_key
          AND group_key = dup.group_key
        ORDER BY created_at ASC NULLS LAST, id ASC
        LIMIT 1;

        FOR loser_id IN
            SELECT id
            FROM pencil_skill_groups
            WHERE is_deleted = 0
              AND TRIM(owner_id) = dup.owner_key
              AND group_key = dup.group_key
              AND id <> keeper_id
        LOOP
            -- Soft-delete loser skills that would collide on (group_id, skill_key).
            UPDATE pencil_skills s
            SET is_deleted = 1,
                skill_key = skill_key || '-merged-' || REPLACE(id::text, '-', ''),
                updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
            WHERE s.group_id = loser_id
              AND s.is_deleted = 0
              AND EXISTS (
                    SELECT 1
                    FROM pencil_skills k
                    WHERE k.group_id = keeper_id
                      AND k.skill_key = s.skill_key
                      AND k.is_deleted = 0
                );

            UPDATE pencil_skills
            SET group_id = keeper_id,
                updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
            WHERE group_id = loser_id
              AND is_deleted = 0;

            -- Move shares; ignore conflicts with existing keeper shares.
            INSERT INTO pencil_skill_group_teams (id, group_id, team_id, created_by, created_at)
            SELECT gen_random_uuid()::text,
                   keeper_id,
                   s.team_id,
                   s.created_by,
                   s.created_at
            FROM pencil_skill_group_teams s
            WHERE s.group_id = loser_id
              AND NOT EXISTS (
                    SELECT 1
                    FROM pencil_skill_group_teams k
                    WHERE k.group_id = keeper_id
                      AND k.team_id = s.team_id
                );

            DELETE FROM pencil_skill_group_teams WHERE group_id = loser_id;

            UPDATE pencil_skill_groups
            SET is_deleted = 1,
                group_key = group_key || '-merged-' || REPLACE(id::text, '-', ''),
                updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
            WHERE id = loser_id;
        END LOOP;
    END LOOP;
END $$;

-- Normalize padded CHAR owner ids so the unique index is stable.
UPDATE pencil_skill_groups
SET owner_id = TRIM(owner_id)
WHERE owner_id IS NOT NULL
  AND owner_id <> TRIM(owner_id);

CREATE UNIQUE INDEX IF NOT EXISTS uk_pencil_skill_groups_owner_key
    ON pencil_skill_groups (owner_id, group_key)
    WHERE is_deleted = 0;

CREATE UNIQUE INDEX IF NOT EXISTS uk_pencil_skills_group_key
    ON pencil_skills (group_id, skill_key)
    WHERE is_deleted = 0 AND group_id IS NOT NULL;

COMMENT ON TABLE pencil_skill_group_teams IS 'Share a skill group with a team';
COMMENT ON TABLE pencil_skill_groups IS 'Owned skill groups; visible personally and via team shares';
