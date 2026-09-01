CREATE TABLE pencil_document_comment_threads
(
    id            CHAR(36) PRIMARY KEY NOT NULL,
    document_id   CHAR(36)             NOT NULL,
    document_key  VARCHAR(255)         NOT NULL,
    page_id       VARCHAR(255)         NOT NULL,
    node_id       VARCHAR(255),
    x             DOUBLE PRECISION     NOT NULL,
    y             DOUBLE PRECISION     NOT NULL,
    resolved      INT                  NOT NULL DEFAULT 0,
    resolved_by   CHAR(36),
    resolved_at   BIGINT,
    created_by    CHAR(36)             NOT NULL,
    created_at    BIGINT               NOT NULL,
    updated_at    BIGINT               NOT NULL,
    is_deleted    INT                  NOT NULL DEFAULT 0,
    CONSTRAINT fk_comment_threads_document
        FOREIGN KEY (document_id) REFERENCES pencil_documents (id),
    CONSTRAINT fk_comment_threads_created_by
        FOREIGN KEY (created_by) REFERENCES users (id),
    CONSTRAINT fk_comment_threads_resolved_by
        FOREIGN KEY (resolved_by) REFERENCES users (id)
);

CREATE TABLE pencil_document_comments
(
    id           CHAR(36) PRIMARY KEY NOT NULL,
    thread_id    CHAR(36)             NOT NULL,
    document_id  CHAR(36)             NOT NULL,
    document_key VARCHAR(255)         NOT NULL,
    body         TEXT                 NOT NULL,
    created_by   CHAR(36)             NOT NULL,
    created_at   BIGINT               NOT NULL,
    updated_at   BIGINT               NOT NULL,
    is_deleted   INT                  NOT NULL DEFAULT 0,
    CONSTRAINT fk_comments_thread
        FOREIGN KEY (thread_id) REFERENCES pencil_document_comment_threads (id),
    CONSTRAINT fk_comments_document
        FOREIGN KEY (document_id) REFERENCES pencil_documents (id),
    CONSTRAINT fk_comments_created_by
        FOREIGN KEY (created_by) REFERENCES users (id)
);

CREATE INDEX idx_comment_threads_document_updated
    ON pencil_document_comment_threads (document_id, is_deleted, resolved, updated_at DESC);

CREATE INDEX idx_comment_threads_document_key_updated
    ON pencil_document_comment_threads (document_key, is_deleted, resolved, updated_at DESC);

CREATE INDEX idx_comment_threads_document_page
    ON pencil_document_comment_threads (document_id, page_id, is_deleted, resolved);

CREATE INDEX idx_comments_thread_created
    ON pencil_document_comments (thread_id, is_deleted, created_at ASC);

COMMENT ON TABLE pencil_document_comment_threads IS 'Canvas comment pins for a design file';
COMMENT ON COLUMN pencil_document_comment_threads.document_id IS 'Owning pencil_documents.id';
COMMENT ON COLUMN pencil_document_comment_threads.document_key IS 'Owning pencil_documents.key';
COMMENT ON COLUMN pencil_document_comment_threads.page_id IS 'Scene graph page id the pin belongs to';
COMMENT ON COLUMN pencil_document_comment_threads.x IS 'Page-space X of the pin';
COMMENT ON COLUMN pencil_document_comment_threads.y IS 'Page-space Y of the pin';
COMMENT ON COLUMN pencil_document_comment_threads.created_by IS 'users.id of the thread author';
COMMENT ON TABLE pencil_document_comments IS 'Messages in a comment thread';
COMMENT ON COLUMN pencil_document_comments.document_id IS 'Owning pencil_documents.id';
COMMENT ON COLUMN pencil_document_comments.document_key IS 'Owning pencil_documents.key';
COMMENT ON COLUMN pencil_document_comments.created_by IS 'users.id of the author';
