ALTER TABLE runs
  ADD COLUMN IF NOT EXISTS board_kind TEXT NOT NULL DEFAULT 'random',
  ADD COLUMN IF NOT EXISTS daily_id TEXT,
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'classic';

ALTER TABLE runs DROP CONSTRAINT IF EXISTS runs_board_kind_check;
ALTER TABLE runs
  ADD CONSTRAINT runs_board_kind_check CHECK (board_kind IN ('random', 'daily'));

ALTER TABLE runs DROP CONSTRAINT IF EXISTS runs_mode_check;
ALTER TABLE runs
  ADD CONSTRAINT runs_mode_check CHECK (mode IN ('classic'));

CREATE INDEX IF NOT EXISTS runs_daily_leaderboard_idx
  ON runs (daily_id, duration_ms ASC, created_at ASC)
  WHERE board_kind = 'daily' AND daily_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS runs_board_kind_idx ON runs (board_kind);
