CREATE TABLE IF NOT EXISTS runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  difficulty_id TEXT NOT NULL,
  seed BIGINT NOT NULL CHECK (seed >= 0 AND seed <= 4294967295),
  duration_ms INTEGER NOT NULL CHECK (duration_ms >= 0),
  events JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS runs_difficulty_duration_idx
  ON runs (difficulty_id, duration_ms ASC, created_at ASC);
