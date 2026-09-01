-- Role permissions (which permissions a role has)
CREATE TABLE public.role_permissions (
  permission_id CHAR(36) NOT NULL,
  role_id CHAR(36) NOT NULL,
  assigned_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  PRIMARY KEY (permission_id, role_id)
);

COMMENT ON TABLE public.role_permissions IS '角色-权限关联表（不使用 FK）';
COMMENT ON COLUMN public.role_permissions.permission_id IS '权限 ID（CHAR(36)）';
COMMENT ON COLUMN public.role_permissions.role_id IS '角色 ID（CHAR(36)）';
COMMENT ON COLUMN public.role_permissions.assigned_at IS '分配时间，毫秒时间戳';
COMMENT ON COLUMN public.role_permissions.updated_at IS '更新时间，毫秒时间戳';