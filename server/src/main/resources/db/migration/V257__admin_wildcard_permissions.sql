-- Ensure admin role has universal *:* and document:* style wildcards

INSERT INTO public.permissions (id, resource, action, description, created_at, updated_at)
VALUES
  (
    'd5a060ca-dcbf-413f-a6c2-f82930000000',
    '*',
    '*',
    '超级管理员：所有资源、所有操作',
    (extract(epoch FROM now())::bigint * 1000),
    (extract(epoch FROM now())::bigint * 1000)
  ),
  (
    'a0b1c2d3-e4f5-4657-8901-234560000000',
    'document',
    '*',
    '文档资源全部操作',
    (extract(epoch FROM now())::bigint * 1000),
    (extract(epoch FROM now())::bigint * 1000)
  )
ON CONFLICT (id) DO UPDATE
SET resource = EXCLUDED.resource,
    action = EXCLUDED.action,
    description = EXCLUDED.description,
    updated_at = EXCLUDED.updated_at;

INSERT INTO public.role_permissions (permission_id, role_id, assigned_at, updated_at)
VALUES
  (
    'd5a060ca-dcbf-413f-a6c2-f82930000000',
    'da7ccdec-f3c3-43f9-a8c7-579290000000',
    (extract(epoch FROM now())::bigint * 1000),
    (extract(epoch FROM now())::bigint * 1000)
  ),
  (
    'a0b1c2d3-e4f5-4657-8901-234560000000',
    'da7ccdec-f3c3-43f9-a8c7-579290000000',
    (extract(epoch FROM now())::bigint * 1000),
    (extract(epoch FROM now())::bigint * 1000)
  )
ON CONFLICT (permission_id, role_id) DO NOTHING;

-- Ensure seeded admin user keeps the admin role
INSERT INTO public.user_roles (role_id, user_id, assigned_at, updated_at)
VALUES (
  'da7ccdec-f3c3-43f9-a8c7-579290000000',
  'f8a3cb5b-01ef-44a2-8411-c67f40000000',
  (extract(epoch FROM now())::bigint * 1000),
  (extract(epoch FROM now())::bigint * 1000)
)
ON CONFLICT (role_id, user_id) DO NOTHING;
