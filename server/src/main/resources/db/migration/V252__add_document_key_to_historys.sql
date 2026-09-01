ALTER TABLE pencil_document_historys
    ADD COLUMN IF NOT EXISTS document_key VARCHAR(255);

UPDATE pencil_document_historys h
SET document_key = d.key
FROM pencil_documents d
WHERE h.document_id = d.id
  AND (h.document_key IS NULL OR h.document_key = '');

UPDATE pencil_document_historys
SET document_key = ''
WHERE document_key IS NULL;

ALTER TABLE pencil_document_historys
    ALTER COLUMN document_key SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_document_historys_document_key_created
    ON pencil_document_historys (document_key, created_at DESC);

COMMENT ON COLUMN pencil_document_historys.document_key IS 'Owning pencil_documents.key';
