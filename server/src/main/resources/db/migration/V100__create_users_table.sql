-- Create users table (id CHAR(36), timestamps are BIGINT in ms)
CREATE TABLE public.users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  -- 业务字段
  name VARCHAR(255) NOT NULL,
  username VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  avatar VARCHAR(255),
  bio TEXT,
  phone VARCHAR(255),
  -- 状态字段
  status VARCHAR(20) NOT NULL,
  -- 时间字段（毫秒时间戳）
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  last_login_at BIGINT,
  -- 唯一约束（保留）
  CONSTRAINT uk_users_email UNIQUE (email),
  CONSTRAINT uk_users_username UNIQUE (username),
  CONSTRAINT uk_users_phone UNIQUE (phone)
);

COMMENT ON TABLE public.users IS '用户表';
COMMENT ON COLUMN public.users.id IS '主键，UUID 字符串，CHAR(36)';
COMMENT ON COLUMN public.users.name IS '用户真实姓名';
COMMENT ON COLUMN public.users.username IS '登录用户名';
COMMENT ON COLUMN public.users.email IS '用户邮箱';
COMMENT ON COLUMN public.users.password IS '密码哈希';
COMMENT ON COLUMN public.users.avatar IS '头像 URL';
COMMENT ON COLUMN public.users.bio IS '用户简介';
COMMENT ON COLUMN public.users.phone IS '手机号';
COMMENT ON COLUMN public.users.status IS '用户状态: ACTIVE/INACTIVE/SUSPENDED';
COMMENT ON COLUMN public.users.created_at IS '创建时间，毫秒时间戳';
COMMENT ON COLUMN public.users.updated_at IS '更新时间，毫秒时间戳';
COMMENT ON COLUMN public.users.last_login_at IS '最后登录时间，毫秒时间戳';