-- Safety net if V265 failed after dropping columns but before unique indexes.
-- Deduplicate remaining (owner_id, group_key) pairs and ensure indexes exist.

DO $$
DECLARE
    dup RECORD;
    keeper_id CHAR(36);
    loser_id CHAR(36);
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = current_schema() AND table_name = 'pencil_skill_groups'
    ) THEN
        RETURN;
    END IF;

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

            IF EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = current_schema() AND table_name = 'pencil_skill_group_teams'
            ) THEN
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
            END IF;

            UPDATE pencil_skill_groups
            SET is_deleted = 1,
                group_key = group_key || '-merged-' || REPLACE(id::text, '-', ''),
                updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
            WHERE id = loser_id;
        END LOOP;
    END LOOP;
END $$;

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
