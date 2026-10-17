ALTER TABLE players
  ADD COLUMN IF NOT EXISTS clerk_user_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS players_clerk_user_id_idx
  ON players (clerk_user_id)
  WHERE clerk_user_id IS NOT NULL;

ALTER TABLE players
  ALTER COLUMN token_hash DROP NOT NULL;
