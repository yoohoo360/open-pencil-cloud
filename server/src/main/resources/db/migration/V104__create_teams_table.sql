-- Teams table
CREATE TABLE public.teams (
  id CHAR(36) NOT NULL PRIMARY KEY,
  -- 业务字段
  owner_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar VARCHAR(255),
  description VARCHAR(255),
  -- 时间字段
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

COMMENT ON TABLE public.teams IS '团队表（owner_id 不使用 FK）';
COMMENT ON COLUMN public.teams.id IS '主键，UUID 字符串，CHAR(36)';
COMMENT ON COLUMN public.teams.owner_id IS '团队拥有者用户 id（CHAR(36)，不设 FK）';
COMMENT ON COLUMN public.teams.name IS '团队名称';
COMMENT ON COLUMN public.teams.avatar IS '团队头像 URL';
COMMENT ON COLUMN public.teams.description IS '团队描述';
COMMENT ON COLUMN public.teams.created_at IS '创建时间，毫秒时间戳';
COMMENT ON COLUMN public.teams.updated_at IS '更新时间，毫秒时间戳';