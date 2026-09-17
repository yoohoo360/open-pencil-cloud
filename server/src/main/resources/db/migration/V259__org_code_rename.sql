-- Rename org display: nickname → name, former name → org_code (immutable, unique for orgs)

ALTER TABLE public.teams
    ADD COLUMN IF NOT EXISTS org_code VARCHAR(64);

-- Existing root orgs: keep current name as org_code; display name prefers nickname
UPDATE public.teams
SET org_code = name
WHERE parent_id IS NULL
  AND (org_code IS NULL OR org_code = '');

UPDATE public.teams
SET name = COALESCE(NULLIF(TRIM(nickname), ''), name)
WHERE parent_id IS NULL
  AND nickname IS NOT NULL
  AND TRIM(nickname) <> '';

-- Teams do not use org_code
UPDATE public.teams
SET org_code = NULL
WHERE parent_id IS NOT NULL;

ALTER TABLE public.teams
    DROP COLUMN IF EXISTS nickname;

-- Replace org unique-on-name with unique-on-org_code
DROP INDEX IF EXISTS uk_teams_org_name;

CREATE UNIQUE INDEX IF NOT EXISTS uk_teams_org_code
    ON public.teams (LOWER(org_code))
    WHERE parent_id IS NULL AND org_code IS NOT NULL;

COMMENT ON COLUMN public.teams.name IS '显示名称；组织可重复，团队在同组织下不可重名';
COMMENT ON COLUMN public.teams.org_code IS '组织代码，系统生成，唯一且不可修改；团队为空';
