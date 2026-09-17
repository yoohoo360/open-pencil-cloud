-- Tighten org_code length for new organizations (6–15 alphanumeric)

ALTER TABLE public.teams
    ALTER COLUMN org_code TYPE VARCHAR(15);

COMMENT ON COLUMN public.teams.org_code IS '组织代码：仅字母数字，长度 6–15，系统生成不可改';
