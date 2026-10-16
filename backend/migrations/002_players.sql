CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT players_display_name_len CHECK (
    char_length(display_name) >= 2 AND char_length(display_name) <= 24
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS players_display_name_lower_idx ON players (lower(display_name));

ALTER TABLE runs
  ADD COLUMN IF NOT EXISTS player_id UUID REFERENCES players (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS runs_player_idx ON runs (player_id) WHERE player_id IS NOT NULL;
