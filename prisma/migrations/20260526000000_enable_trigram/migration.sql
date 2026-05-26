CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS problem_title_trgm_idx ON "Problem" USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS problem_notes_trgm_idx ON "Problem" USING GIN (notes gin_trgm_ops);
