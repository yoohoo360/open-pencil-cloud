-- Seed initial data with timestamps converted to BIGINT (milliseconds since epoch)

-- Users
INSERT INTO public.users (id, avatar, bio, created_at, email, last_login_at, name, password, phone, status, updated_at, username)
VALUES (
           'f8a3cb5b01ef44a28411c67f4',
           'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
           '系统管理员账号',
           (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:29.144155+00')::bigint * 1000),
           'admin@jongwong.cn',
           (extract(epoch FROM timestamp with time zone '2026-08-07 14:24:50.809996+00')::bigint * 1000),
           '系统管理员',
           '$2a$10$EbFtaP7t2cDG6D.ekNbOIOOgNhbHOlv44DDGbsUCZ3OclqgLMj5Xq',
           NULL,
           'ACTIVE',
           (extract(epoch FROM timestamp with time zone '2026-08-07 14:24:50.906984+00')::bigint * 1000),
           'admin'
       )
ON CONFLICT (id) DO NOTHING;

-- Teams
INSERT INTO public.teams (created_at, updated_at, id, owner_id, avatar, description, name)
VALUES (
           (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:30.990765+00')::bigint * 1000),
           (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:30.990791+00')::bigint * 1000),
           'bd5e40e48957448d80735f99f',
           'f8a3cb5b01ef44a28411c67f4',
           'https://api.dicebear.com/7.x/identicon/svg?seed=team0',
           '研发一组 - 负责相关业务',
           '研发一组'
       )
ON CONFLICT (id) DO NOTHING;

-- Roles
INSERT INTO public.roles (created_at, updated_at, id, description, label, name)
VALUES
    (
        (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:28.790434+00')::bigint * 1000),
        (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:28.790438+00')::bigint * 1000),
        'da7ccdecf3c343f9a8c757929',
        '系统管理员，拥有所有权限',
        '管理员',
        'admin'
    ),
    (
        (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:28.911925+00')::bigint * 1000),
        (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:28.911943+00')::bigint * 1000),
        'acdc618a5ac3490393ce22662',
        '普通用户，拥有基本操作权限',
        '普通用户',
        'user'
    ),
    (
        (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:29.050091+00')::bigint * 1000),
        (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:29.050114+00')::bigint * 1000),
        'd434554f5e09493e9404da883',
        '可以编辑内容',
        '编辑者',
        'editor'
    )
ON CONFLICT (id) DO NOTHING;



-- Permissions
INSERT INTO public.permissions (created_at, updated_at, id, action, description, resource)
VALUES
    (
        (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:28.726267+00')::bigint * 1000),
        (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:28.726285+00')::bigint * 1000),
        '7fd988039cc847d0831518267',
        'create',
        '可以创建 用户',
        'users'
    ),
    (
        (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:28.732769+00')::bigint * 1000),
        (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:28.732772+00')::bigint * 1000),
        '3564e4df5b8348d2ad0e44ee6',
        'read',
        '可以查看 用户',
        'users'
    ),
    (
        (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:28.732923+00')::bigint * 1000),
        (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:28.732925+00')::bigint * 1000),
        '124c9d76c2b64651acd932f74',
        'update',
        '可以更新 用户',
        'users'
    ),
    (
        (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:28.733039+00')::bigint * 1000),
        (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:28.733040+00')::bigint * 1000),
        'd6835340a65144e082baff52b',
        'delete',
        '可以删除 用户',
        'users'
    ),
    (
        (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:28.733153+00')::bigint * 1000),
        (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:28.733155+00')::bigint * 1000),
        'a1c7d5aa6be0411b8908e9f23',
        'manage',
        '可以管理 用户',
        'users'
    ),
    (
        (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:28.733264+00')::bigint * 1000),
        (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:28.733266+00')::bigint * 1000),
        'e6cbdc8e654f4c2f9825a50b7',
        'create',
        '可以创建 角色',
        'roles'
    ),
    (
        (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:28.733363+00')::bigint * 1000),
        (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:28.733364+00')::bigint * 1000),
        '5e912b8f8eee460d8e1b036f0',
        'read',
        '可以查看 角色',
        'roles'
    ),
    (
        (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:28.733473+00')::bigint * 1000),
        (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:28.733474+00')::bigint * 1000),
        'b6be0b4386834e19b923fa594',
        'update',
        '可以更新 角色',
        'roles'
    ),
    (
        (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:28.733585+00')::bigint * 1000),
        (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:28.733586+00')::bigint * 1000),
        '409b3b3e12d34d039b12f262f',
        'delete',
        '可以删除 角色',
        'roles'
    ),
    (
        (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:28.733689+00')::bigint * 1000),
        (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:28.733690+00')::bigint * 1000),
        '9b9df419b95147f8b63d2057a',
        'manage',
        '可以管理 角色',
        'roles'
    ),
    (
        (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:28.733788+00')::bigint * 1000),
        (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:28.733789+00')::bigint * 1000),
        '411bd6b3895b4a3db4f8a873c',
        'create',
        '可以创建 团队',
        'teams'
    ),
    (
        (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:28.733900+00')::bigint * 1000),
        (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:28.733901+00')::bigint * 1000),
        '503323ae31264dae888b3246f',
        'read',
        '可以查看 团队',
        'teams'
    ),
    (
        (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:28.733996+00')::bigint * 1000),
        (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:28.733998+00')::bigint * 1000),
        '67f6aaab61e04bfca232f287f',
        'update',
        '可以更新 团队',
        'teams'
    ),
    (
        (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:28.734127+00')::bigint * 1000),
        (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:28.734129+00')::bigint * 1000),
        '3b9c1ada95d04224b641db7e8',
        'delete',
        '可以删除 团队',
        'teams'
    ),
    (
        (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:28.734221+00')::bigint * 1000),
        (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:28.734223+00')::bigint * 1000),
        '758485606b6442f996f51a473',
        'manage',
        '可以管理 团队',
        'teams'
    ),
    (
        (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:28.790312+00')::bigint * 1000),
        (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:28.790313+00')::bigint * 1000),
        'd5a060cadcbf413fa6c2f8293',
        '*',
        '超级管理员权限',
        '*'
    )
ON CONFLICT (id) DO NOTHING;

-- User roles (add assigned_at and updated_at using now)
INSERT INTO public.user_roles (role_id, user_id, assigned_at, updated_at)
VALUES (
           'da7ccdecf3c343f9a8c757929',
           'f8a3cb5b01ef44a28411c67f4',
           (extract(epoch FROM now())::bigint * 1000),
           (extract(epoch FROM now())::bigint * 1000)
       )
ON CONFLICT (role_id, user_id) DO NOTHING;

-- Team members (convert joined_at)
INSERT INTO public.team_members (joined_at, role_id, team_id, user_id, updated_at)
VALUES (
           (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:31.043414+00')::bigint * 1000),
           'owner',
           'bd5e40e48957448d80735f99f',
           'f8a3cb5b01ef44a28411c67f4',
           (extract(epoch FROM now())::bigint * 1000)
       )
ON CONFLICT (team_id, user_id) DO NOTHING;

-- Role permissions: use permission created_at as assigned/updated time
INSERT INTO public.role_permissions (permission_id, role_id, assigned_at, updated_at)
VALUES (
           'd5a060cadcbf413fa6c2f8293',
           'da7ccdecf3c343f9a8c757929',
           (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:28.790312+00')::bigint * 1000),
           (extract(epoch FROM timestamp with time zone '2026-08-07 14:06:28.790312+00')::bigint * 1000)
       )
ON CONFLICT (permission_id, role_id) DO NOTHING;