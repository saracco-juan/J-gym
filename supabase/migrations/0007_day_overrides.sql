-- ===========================================================
-- J-GYM - Week day overrides (idempotent)
--
-- A user can swap the routines of two days of the current week, including a
-- training day with a rest day (Tuesday's routine done on Friday). Each row
-- says that `date` shows the routine of the weekday `day_name` (lower case
-- Spanish weekday name, as in routine_templates.day_name).
--
-- The rows are kept after their week ends: the streak and the "full week"
-- achievements read the schedule per date, so every device of the user must
-- see the same overrides to compute the same stats (src/core/stats).
--
-- The client writes through the outbox: an upsert on (user_id, date) for a
-- new or changed day and a delete by (user_id, date) for an undone one. There
-- is no client id. schema_version lets readers tell old shapes apart
-- (src/core/mappers/day-override-mapper.ts).
--
-- Requires 0001 (update_updated_at_column).
-- Safe to run multiple times.
-- ===========================================================

-- --- day_overrides ---------------------------------------------

CREATE TABLE IF NOT EXISTS public.day_overrides (
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date           DATE NOT NULL,
  day_name       TEXT NOT NULL,
  schema_version INT NOT NULL DEFAULT 1,
  updated_at     TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, date)
);

DROP TRIGGER IF EXISTS update_day_overrides_updated_at ON public.day_overrides;
CREATE TRIGGER update_day_overrides_updated_at
  BEFORE UPDATE ON public.day_overrides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.day_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own day overrides" ON public.day_overrides;
DROP POLICY IF EXISTS "Users can insert own day overrides" ON public.day_overrides;
DROP POLICY IF EXISTS "Users can update own day overrides" ON public.day_overrides;
DROP POLICY IF EXISTS "Users can delete own day overrides" ON public.day_overrides;

CREATE POLICY "Users can view own day overrides"
  ON public.day_overrides FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own day overrides"
  ON public.day_overrides FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own day overrides"
  ON public.day_overrides FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own day overrides"
  ON public.day_overrides FOR DELETE
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.day_overrides TO authenticated;
