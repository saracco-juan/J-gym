-- ===========================================================
-- J-GYM - Initial schema (idempotent)
--
-- Tables:
--   1. routine_templates: weekly plan template per user and day
--   2. workout_logs:      history of performed workouts
--
-- Exercises are stored as JSONB to avoid extra tables.
-- RLS is enabled: each user can only access their own rows.
-- Policies use auth.uid(), so they also apply to Supabase
-- anonymous users (role `authenticated` with their own uid).
-- Safe to run multiple times.
-- ===========================================================

-- --- Shared trigger function ---------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- --- routine_templates ---------------------------------------

CREATE TABLE IF NOT EXISTS routine_templates (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_name    TEXT NOT NULL,  -- "lunes", "martes", etc.
  exercises   JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),

  -- One template per user per day
  UNIQUE(user_id, day_name)
);

CREATE INDEX IF NOT EXISTS idx_routine_templates_user_day
  ON routine_templates(user_id, day_name);

DROP TRIGGER IF EXISTS update_routine_templates_updated_at ON routine_templates;
CREATE TRIGGER update_routine_templates_updated_at
  BEFORE UPDATE ON routine_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE routine_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own templates" ON routine_templates;
DROP POLICY IF EXISTS "Users can insert own templates" ON routine_templates;
DROP POLICY IF EXISTS "Users can update own templates" ON routine_templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON routine_templates;

CREATE POLICY "Users can view own templates"
  ON routine_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own templates"
  ON routine_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON routine_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON routine_templates FOR DELETE
  USING (auth.uid() = user_id);

-- --- workout_logs --------------------------------------------

CREATE TABLE IF NOT EXISTS workout_logs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id   UUID REFERENCES routine_templates(id) ON DELETE SET NULL,
  date          DATE NOT NULL,
  exercises     JSONB NOT NULL DEFAULT '[]'::JSONB,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workout_logs_user_date
  ON workout_logs(user_id, date);

ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own logs" ON workout_logs;
DROP POLICY IF EXISTS "Users can insert own logs" ON workout_logs;
DROP POLICY IF EXISTS "Users can delete own logs" ON workout_logs;

CREATE POLICY "Users can view own logs"
  ON workout_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logs"
  ON workout_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Needed by the app's reset-data action (dev only). Logs are never updated.
CREATE POLICY "Users can delete own logs"
  ON workout_logs FOR DELETE
  USING (auth.uid() = user_id);

-- --- Table privileges ----------------------------------------
-- Explicit grants, so the schema works even when the project does not
-- expose new tables to the API roles automatically. RLS still filters rows.
-- `anon` only needs SELECT on routine_templates for the keep-alive ping
-- (it returns no rows).

GRANT SELECT, INSERT, UPDATE, DELETE ON routine_templates TO authenticated;
GRANT SELECT, INSERT, DELETE ON workout_logs TO authenticated;
GRANT SELECT ON routine_templates TO anon;

-- ===========================================================
-- JSONB structure reference
-- ===========================================================
--
-- routine_templates.exercises:
-- [
--   {
--     "exercise_id":   "uuid",
--     "exercise_name": "Dominadas",
--     "sets": [
--       { "set_number": 1, "target_reps": 12, "target_weight": 0 }
--     ]
--   }
-- ]
--
-- workout_logs.exercises:
-- [
--   {
--     "exercise_id":   "uuid",
--     "exercise_name": "Dominadas",
--     "sets": [
--       { "set_number": 1, "actual_reps": 10, "actual_weight": 0 }
--     ]
--   }
-- ]
