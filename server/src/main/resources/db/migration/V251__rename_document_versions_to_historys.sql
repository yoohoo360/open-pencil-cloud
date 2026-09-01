DROP TABLE IF EXISTS pencil_document_versions;

CREATE TABLE IF NOT EXISTS pencil_document_historys
(
    id           CHAR(36) PRIMARY KEY NOT NULL,
    document_id  CHAR(36)             NOT NULL,
    document_key VARCHAR(255)         NOT NULL,
    kind         VARCHAR(20)          NOT NULL,
    title        VARCHAR(500),
    description  TEXT,
    url          VARCHAR(500)         NOT NULL,
    created_by   CHAR(36),
    created_at   BIGINT               NOT NULL,
    is_deleted   INT                  NOT NULL DEFAULT 0,
    CONSTRAINT fk_document_historys_document
        FOREIGN KEY (document_id) REFERENCES pencil_documents (id),
    CONSTRAINT fk_document_historys_created_by
        FOREIGN KEY (created_by) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS idx_document_historys_document_created
    ON pencil_document_historys (document_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_historys_document_kind_created
    ON pencil_document_historys (document_id, kind, created_at DESC);
