-- GitHub-style resource authorization (decoupled from documents)

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS base_permission VARCHAR(20) NOT NULL DEFAULT 'write';

COMMENT ON COLUMN public.teams.base_permission IS
  '组织资源默认权限：none | read | write | admin（类 GitHub org base repository permission）';

-- Generic grants: subject (user/team) → resource (any type)
CREATE TABLE IF NOT EXISTS public.resource_grants (
  id CHAR(36) PRIMARY KEY NOT NULL,
  resource_type VARCHAR(64) NOT NULL,
  resource_id CHAR(36) NOT NULL,
  principal_type VARCHAR(16) NOT NULL,
  principal_id CHAR(36) NOT NULL,
  role VARCHAR(20) NOT NULL,
  granted_by CHAR(36),
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  CONSTRAINT uk_resource_grants UNIQUE (resource_type, resource_id, principal_type, principal_id)
);

CREATE INDEX IF NOT EXISTS idx_resource_grants_resource
  ON public.resource_grants (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_grants_principal
  ON public.resource_grants (principal_type, principal_id);

COMMENT ON TABLE public.resource_grants IS '通用资源授权（用户/团队 → 任意资源类型）';
COMMENT ON COLUMN public.resource_grants.resource_type IS 'document | library | …';
COMMENT ON COLUMN public.resource_grants.principal_type IS 'user | team';
COMMENT ON COLUMN public.resource_grants.role IS 'read | write | admin';

-- Generic access requests
CREATE TABLE IF NOT EXISTS public.resource_access_requests (
  id CHAR(36) PRIMARY KEY NOT NULL,
  resource_type VARCHAR(64) NOT NULL,
  resource_id CHAR(36) NOT NULL,
  requester_id CHAR(36) NOT NULL,
  requested_role VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  message TEXT,
  reviewed_by CHAR(36),
  reviewed_at BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_resource_access_req_resource
  ON public.resource_access_requests (resource_type, resource_id, status);
CREATE INDEX IF NOT EXISTS idx_resource_access_req_requester
  ON public.resource_access_requests (requester_id);

-- Migrate legacy document_* tables if present
INSERT INTO public.resource_grants (
  id, resource_type, resource_id, principal_type, principal_id, role, granted_by, created_at, updated_at
)
SELECT
  id,
  'document',
  document_id,
  'user',
  user_id,
  CASE lower(role)
    WHEN 'view' THEN 'read'
    WHEN 'edit' THEN 'write'
    WHEN 'manage' THEN 'admin'
    ELSE lower(role)
  END,
  granted_by,
  created_at,
  updated_at
FROM public.document_access
ON CONFLICT DO NOTHING;

INSERT INTO public.resource_access_requests (
  id, resource_type, resource_id, requester_id, requested_role, status, message,
  reviewed_by, reviewed_at, created_at, updated_at
)
SELECT
  id,
  'document',
  document_id,
  requester_id,
  CASE lower(requested_role)
    WHEN 'view' THEN 'read'
    WHEN 'edit' THEN 'write'
    WHEN 'manage' THEN 'admin'
    ELSE lower(requested_role)
  END,
  status,
  message,
  reviewed_by,
  reviewed_at,
  created_at,
  updated_at
FROM public.document_permission_requests
ON CONFLICT DO NOTHING;

DROP TABLE IF EXISTS public.document_access;
DROP TABLE IF EXISTS public.document_permission_requests;
