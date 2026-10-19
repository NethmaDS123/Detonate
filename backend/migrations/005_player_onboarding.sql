ALTER TABLE players
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Existing players (token or Clerk) skip the first-run tutorial.
UPDATE players
SET onboarding_completed_at = COALESCE(onboarding_completed_at, NOW())
WHERE onboarding_completed_at IS NULL;
