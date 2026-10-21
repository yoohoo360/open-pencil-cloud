-- Team names unique within an organization (re-assert; case-insensitive).
CREATE UNIQUE INDEX IF NOT EXISTS uk_teams_name_under_parent
    ON public.teams (parent_id, LOWER(name))
    WHERE parent_id IS NOT NULL;

-- Skill group keys unique within the highest-level team (organization).
-- org_id is required for new groups; legacy null rows keep owner-scoped uniqueness.
CREATE UNIQUE INDEX IF NOT EXISTS uk_pencil_skill_groups_org_key
    ON pencil_skill_groups (org_id, group_key)
    WHERE is_deleted = 0 AND org_id IS NOT NULL;

COMMENT ON INDEX uk_teams_name_under_parent IS 'Team display names unique per organization';
COMMENT ON INDEX uk_pencil_skill_groups_org_key IS 'Skill group keys unique under the organization (top-level team)';
