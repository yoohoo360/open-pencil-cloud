-- Roles table
CREATE TABLE public.roles (
  id CHAR(36) NOT NULL PRIMARY KEY,
  -- 业务字段
  name VARCHAR(255) NOT NULL,
  label VARCHAR(255) NOT NULL,
  description VARCHAR(255),
  -- 时间字段
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  CONSTRAINT uk_roles_name UNIQUE (name)
);

COMMENT ON TABLE public.roles IS '角色表';
COMMENT ON COLUMN public.roles.id IS '主键，UUID 字符串，CHAR(36)';
COMMENT ON COLUMN public.roles.name IS '内部角色名（唯一）';
COMMENT ON COLUMN public.roles.label IS '展示用角色标签';
COMMENT ON COLUMN public.roles.description IS '角色描述';
COMMENT ON COLUMN public.roles.created_at IS '创建时间，毫秒时间戳';
COMMENT ON COLUMN public.roles.updated_at IS '更新时间，毫秒时间戳';