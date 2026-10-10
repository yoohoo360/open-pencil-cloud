CREATE TABLE pencil_document_ai_reviews
(
    id             CHAR(36) PRIMARY KEY NOT NULL,
    document_id    CHAR(36)             NOT NULL,
    document_key   VARCHAR(255)         NOT NULL,
    title          VARCHAR(500),
    status         VARCHAR(20)          NOT NULL DEFAULT 'completed',
    history_id     CHAR(36)             NOT NULL,
    payload        TEXT                 NOT NULL,
    marker_count   INT                  NOT NULL DEFAULT 0,
    comment_count  INT                  NOT NULL DEFAULT 0,
    created_by     CHAR(36)             NOT NULL,
    created_at     BIGINT               NOT NULL,
    updated_by     CHAR(36),
    updated_at     BIGINT               NOT NULL,
    is_deleted     INT                  NOT NULL DEFAULT 0,
    CONSTRAINT fk_ai_reviews_document
        FOREIGN KEY (document_id) REFERENCES pencil_documents (id),
    CONSTRAINT fk_ai_reviews_history
        FOREIGN KEY (history_id) REFERENCES pencil_document_historys (id),
    CONSTRAINT fk_ai_reviews_created_by
        FOREIGN KEY (created_by) REFERENCES users (id),
    CONSTRAINT fk_ai_reviews_updated_by
        FOREIGN KEY (updated_by) REFERENCES users (id)
);

CREATE INDEX idx_ai_reviews_document_created
    ON pencil_document_ai_reviews (document_id, is_deleted, created_at DESC);

CREATE INDEX idx_ai_reviews_document_key_created
    ON pencil_document_ai_reviews (document_key, is_deleted, created_at DESC);

COMMENT ON TABLE pencil_document_ai_reviews IS 'AI review records for a design file';
COMMENT ON COLUMN pencil_document_ai_reviews.document_id IS 'Owning pencil_documents.id';
COMMENT ON COLUMN pencil_document_ai_reviews.document_key IS 'Owning pencil_documents.key';
COMMENT ON COLUMN pencil_document_ai_reviews.history_id IS 'Version-history snapshot taken when the review was saved';
COMMENT ON COLUMN pencil_document_ai_reviews.payload IS 'Full review JSON: requirement, markers, comments';
COMMENT ON COLUMN pencil_document_ai_reviews.created_by IS 'users.id of the operator';
