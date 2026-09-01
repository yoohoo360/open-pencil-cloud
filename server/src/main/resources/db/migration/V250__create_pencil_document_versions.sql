DROP TABLE IF EXISTS pencil_document_versions;

CREATE TABLE pencil_document_historys
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

CREATE INDEX idx_document_historys_document_created
    ON pencil_document_historys (document_id, created_at DESC);

CREATE INDEX idx_document_historys_document_kind_created
    ON pencil_document_historys (document_id, kind, created_at DESC);

COMMENT ON TABLE pencil_document_historys IS 'Named checkpoints and autosave snapshots for a design file';
COMMENT ON COLUMN pencil_document_historys.document_id IS 'Owning pencil_documents.id';
COMMENT ON COLUMN pencil_document_historys.document_key IS 'Owning pencil_documents.key';
COMMENT ON COLUMN pencil_document_historys.url IS 'OSS path of the snapshot .fig file';
COMMENT ON COLUMN pencil_document_historys.created_by IS 'users.id of the author';
COMMENT ON COLUMN pencil_document_historys.kind IS 'named or autosave';
