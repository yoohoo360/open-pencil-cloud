-- User roles (which roles a user has)
CREATE TABLE public.user_roles (
  role_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  assigned_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  PRIMARY KEY (role_id, user_id)
);

COMMENT ON TABLE public.user_roles IS '用户-角色关联表（不使用 FK）';
COMMENT ON COLUMN public.user_roles.role_id IS '角色 ID（CHAR(36)）';
COMMENT ON COLUMN public.user_roles.user_id IS '用户 ID（CHAR(36)）';
COMMENT ON COLUMN public.user_roles.assigned_at IS '分配时间，毫秒时间戳';
COMMENT ON COLUMN public.user_roles.updated_at IS '更新时间，毫秒时间戳';