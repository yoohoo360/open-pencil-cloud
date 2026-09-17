-- Organization nickname + uniqueness + membership invitations

ALTER TABLE public.teams
    ADD COLUMN IF NOT EXISTS nickname VARCHAR(100);

ALTER TABLE public.teams
    ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) NOT NULL DEFAULT 'approved';

COMMENT ON COLUMN public.teams.nickname IS '组织/团队显示昵称，可重复';
COMMENT ON COLUMN public.teams.approval_status IS 'pending|approved|rejected — 组织创建审核状态';

-- Org (root) names must be unique
CREATE UNIQUE INDEX IF NOT EXISTS uk_teams_org_name
    ON public.teams (LOWER(name))
    WHERE parent_id IS NULL;

-- Team names unique within the same organization
CREATE UNIQUE INDEX IF NOT EXISTS uk_teams_name_under_parent
    ON public.teams (parent_id, LOWER(name))
    WHERE parent_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.membership_invitations (
    id              CHAR(36) PRIMARY KEY,
    target_type     VARCHAR(32) NOT NULL,
    target_id       CHAR(36) NOT NULL,
    target_key      VARCHAR(255),
    target_name     VARCHAR(255),
    invitee_id      CHAR(36) NOT NULL,
    inviter_id      CHAR(36) NOT NULL,
    role            VARCHAR(32) NOT NULL DEFAULT 'member',
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    message         TEXT,
    created_at      BIGINT NOT NULL,
    updated_at      BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_membership_invitations_invitee_status
    ON public.membership_invitations (invitee_id, status);

CREATE INDEX IF NOT EXISTS idx_membership_invitations_target
    ON public.membership_invitations (target_type, target_id, status);

COMMENT ON TABLE public.membership_invitations IS '组织/团队/文档邀请，受邀人接受或拒绝';
COMMENT ON COLUMN public.membership_invitations.target_type IS 'organization | team | document';
