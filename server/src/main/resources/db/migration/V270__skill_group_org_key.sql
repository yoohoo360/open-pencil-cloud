-- Org-scoped group keys so skill workspace config can match groups by key.
-- Allow renaming group_key / skill_key after create (enforced in service).

ALTER TABLE pencil_skill_groups
    ADD COLUMN IF NOT EXISTS org_id CHAR(36);

CREATE INDEX IF NOT EXISTS idx_pencil_skill_groups_org
    ON pencil_skill_groups (org_id, is_deleted);

-- Prefer owner-scoped uniqueness when org is unknown (legacy rows).
-- When org_id is set, group_key is unique within that organization.
DROP INDEX IF EXISTS uk_pencil_skill_groups_owner_key;

CREATE UNIQUE INDEX IF NOT EXISTS uk_pencil_skill_groups_org_key
    ON pencil_skill_groups (org_id, group_key)
    WHERE is_deleted = 0 AND org_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uk_pencil_skill_groups_owner_key_legacy
    ON pencil_skill_groups (owner_id, group_key)
    WHERE is_deleted = 0 AND org_id IS NULL;

COMMENT ON COLUMN pencil_skill_groups.org_id IS 'Organization scope for group_key uniqueness and workspace pull matching';
