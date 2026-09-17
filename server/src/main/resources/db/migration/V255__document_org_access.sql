-- Document organization hierarchy + Figma-like document ACL

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS parent_id CHAR(36);

CREATE INDEX IF NOT EXISTS idx_teams_parent ON public.teams (parent_id);

COMMENT ON COLUMN public.teams.parent_id IS '上级组织/团队 ID；为空表示根组织';

ALTER TABLE public.pencil_documents
  ADD COLUMN IF NOT EXISTS owner_id CHAR(36);

ALTER TABLE public.pencil_documents
  ADD COLUMN IF NOT EXISTS allow_copy BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_documents_owner ON public.pencil_documents (owner_id);

COMMENT ON COLUMN public.pencil_documents.owner_id IS '文档所有者用户 ID；个人文档组织不可见';
COMMENT ON COLUMN public.pencil_documents.allow_copy IS '是否允许复制/导出/另存（类 Figma Disable copy）';

-- Explicit per-user document grants (share)
CREATE TABLE IF NOT EXISTS public.document_access (
  id CHAR(36) PRIMARY KEY NOT NULL,
  document_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  role VARCHAR(20) NOT NULL,
  granted_by CHAR(36),
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  CONSTRAINT uk_document_access_doc_user UNIQUE (document_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_document_access_document ON public.document_access (document_id);
CREATE INDEX IF NOT EXISTS idx_document_access_user ON public.document_access (user_id);

COMMENT ON TABLE public.document_access IS '文档显式分享权限（用户级）';
COMMENT ON COLUMN public.document_access.role IS 'view | edit | manage';

-- Permission requests (apply for view/edit)
CREATE TABLE IF NOT EXISTS public.document_permission_requests (
  id CHAR(36) PRIMARY KEY NOT NULL,
  document_id CHAR(36) NOT NULL,
  requester_id CHAR(36) NOT NULL,
  requested_role VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  message TEXT,
  reviewed_by CHAR(36),
  reviewed_at BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_doc_perm_req_document ON public.document_permission_requests (document_id);
CREATE INDEX IF NOT EXISTS idx_doc_perm_req_requester ON public.document_permission_requests (requester_id);
CREATE INDEX IF NOT EXISTS idx_doc_perm_req_status ON public.document_permission_requests (document_id, status);

COMMENT ON TABLE public.document_permission_requests IS '文档权限申请';
COMMENT ON COLUMN public.document_permission_requests.requested_role IS 'view | edit';
COMMENT ON COLUMN public.document_permission_requests.status IS 'pending | approved | rejected';
