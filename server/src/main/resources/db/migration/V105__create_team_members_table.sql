-- Team members (composite PK: team_id + user_id)
CREATE TABLE public.team_members (
  -- 组合主键
  team_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  -- 业务字段
  role_id CHAR(36),
  joined_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  PRIMARY KEY (team_id, user_id)
);

COMMENT ON TABLE public.team_members IS '团队成员表（不使用 FK）';
COMMENT ON COLUMN public.team_members.team_id IS '团队 ID（CHAR(36)）';
COMMENT ON COLUMN public.team_members.user_id IS '用户 ID（CHAR(36)）';
COMMENT ON COLUMN public.team_members.role_id IS '在团队内的角色 ID（CHAR(36)）';
COMMENT ON COLUMN public.team_members.joined_at IS '加入时间，毫秒时间戳';
COMMENT ON COLUMN public.team_members.updated_at IS '更新时间，毫秒时间戳';