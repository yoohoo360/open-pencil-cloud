-- Align skill timestamps with other pencil_* tables (epoch millis BIGINT).
-- Safe when V262 already created TIMESTAMP columns, or a fresh V262 already uses BIGINT.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'pencil_skills'
          AND column_name = 'created_at'
          AND data_type LIKE 'timestamp%'
    ) THEN
        ALTER TABLE pencil_skills
            ALTER COLUMN created_at DROP DEFAULT;
        ALTER TABLE pencil_skills
            ALTER COLUMN updated_at DROP DEFAULT;
        ALTER TABLE pencil_skills
            ALTER COLUMN created_at TYPE BIGINT
                USING (EXTRACT(EPOCH FROM created_at) * 1000)::BIGINT;
        ALTER TABLE pencil_skills
            ALTER COLUMN updated_at TYPE BIGINT
                USING (EXTRACT(EPOCH FROM updated_at) * 1000)::BIGINT;
    END IF;
END $$;
