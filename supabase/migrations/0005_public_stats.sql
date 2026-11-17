-- ===========================================================
-- J-GYM - Public stats for the leaderboard (idempotent)
--
-- Each client computes its own stats from local data (see
-- src/core/stats) and upserts one public snapshot row. Every registered
-- user can read every snapshot; each user can only write their own, and
-- only once they have a profile (the leaderboard joins both tables).
--
-- Anonymous users (the old demo accounts) can neither read nor write: they
-- link an email and create a profile first. The JWT of an anonymous user
-- carries is_anonymous = true.
--
-- The numbers are self reported (a friends group, no anti cheat).
-- weekly_volume_kg is only valid for the week that starts on week_start and
-- monthly_progress_pct for the month that starts on month: readers show 0
-- when those dates are in the past.
--
-- best_lifts and achievements are JSONB. Their shape is owned by the app
-- (src/core/mappers/stats-mapper.ts); schema_version lets readers tell old
-- shapes apart.
--
-- Requires 0004 (profiles) and 0001 (update_updated_at_column).
-- Safe to run multiple times.
-- ===========================================================

-- --- public_stats ----------------------------------------------

CREATE TABLE IF NOT EXISTS public_stats (
  user_id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  streak                INT NOT NULL DEFAULT 0 CHECK (streak >= 0),
  best_streak           INT NOT NULL DEFAULT 0 CHECK (best_streak >= 0),
  level                 INT NOT NULL DEFAULT 1 CHECK (level >= 1),
  xp                    INT NOT NULL DEFAULT 0 CHECK (xp >= 0),
  weekly_volume_kg      NUMERIC NOT NULL DEFAULT 0 CHECK (weekly_volume_kg >= 0),
  week_start            DATE NOT NULL,
  monthly_progress_pct  NUMERIC NOT NULL DEFAULT 0,
  month                 DATE NOT NULL,
  status                TEXT NOT NULL
                        CHECK (status IN ('progressing', 'stagnant', 'inactive', 'steady')),
  best_lifts            JSONB NOT NULL DEFAULT '{}'::jsonb,
  achievements          JSONB NOT NULL DEFAULT '[]'::jsonb,
  workouts_count        INT NOT NULL DEFAULT 0 CHECK (workouts_count >= 0),
  schema_version        INT NOT NULL DEFAULT 1,
  updated_at            TIMESTAMPTZ DEFAULT now()
);

DROP TRIGGER IF EXISTS update_public_stats_updated_at ON public_stats;
CREATE TRIGGER update_public_stats_updated_at
  BEFORE UPDATE ON public_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- --- Row Level Security ----------------------------------------

ALTER TABLE public_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Registered users can view all stats" ON public_stats;
DROP POLICY IF EXISTS "Users with a profile can insert own stats" ON public_stats;
DROP POLICY IF EXISTS "Users with a profile can update own stats" ON public_stats;

CREATE POLICY "Registered users can view all stats"
  ON public_stats FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'is_anonymous')::boolean IS NOT TRUE);

CREATE POLICY "Users with a profile can insert own stats"
  ON public_stats FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (auth.jwt() ->> 'is_anonymous')::boolean IS NOT TRUE
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid())
  );

CREATE POLICY "Users with a profile can update own stats"
  ON public_stats FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND (auth.jwt() ->> 'is_anonymous')::boolean IS NOT TRUE
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    AND (auth.jwt() ->> 'is_anonymous')::boolean IS NOT TRUE
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid())
  );

-- --- Table privileges ------------------------------------------

-- No DELETE: a snapshot goes away with its user (ON DELETE CASCADE).
GRANT SELECT, INSERT, UPDATE ON public_stats TO authenticated;
