-- Per-user recently opened documents

CREATE TABLE IF NOT EXISTS public.pencil_document_recents (
    id              CHAR(36) PRIMARY KEY,
    user_id         CHAR(36) NOT NULL,
    document_id     CHAR(36) NOT NULL,
    document_key    VARCHAR(64) NOT NULL,
    opened_at       BIGINT NOT NULL,
    created_at      BIGINT NOT NULL,
    updated_at      BIGINT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_pencil_document_recents_user_doc
    ON public.pencil_document_recents (user_id, document_id);

CREATE INDEX IF NOT EXISTS idx_pencil_document_recents_user_opened
    ON public.pencil_document_recents (user_id, opened_at DESC);

COMMENT ON TABLE public.pencil_document_recents IS '用户最近打开的文档（按 opened_at 排序）';
