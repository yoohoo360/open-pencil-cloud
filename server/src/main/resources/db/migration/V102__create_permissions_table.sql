-- Permissions table
CREATE TABLE public.permissions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  -- 业务字段
  resource VARCHAR(255) NOT NULL,
  action VARCHAR(255) NOT NULL,
  description VARCHAR(255),
  -- 时间字段
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  CONSTRAINT uk_permissions_resource_action UNIQUE (resource, action)
);

COMMENT ON TABLE public.permissions IS '权限表（资源+动作）';
COMMENT ON COLUMN public.permissions.id IS '主键，UUID 字符串，CHAR(36)';
COMMENT ON COLUMN public.permissions.resource IS '资源名称/类型';
COMMENT ON COLUMN public.permissions.action IS '动作名，如 read/write/delete';
COMMENT ON COLUMN public.permissions.description IS '权限描述';
COMMENT ON COLUMN public.permissions.created_at IS '创建时间，毫秒时间戳';
COMMENT ON COLUMN public.permissions.updated_at IS '更新时间，毫秒时间戳';