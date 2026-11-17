-- ===========================================================
-- J-GYM - Offline sync support (idempotent)
--
-- The phone is the source of truth (IndexedDB). A sync engine flushes
-- local writes to these tables with idempotent upserts keyed by
-- client-generated UUIDs. Single device, last write wins.
--
-- Changes:
--   1. custom_exercises: user-created exercises (soft delete for sync)
--   2. workout_logs:     updated_at, schema_version, UPDATE policy/grant
--   3. routine_templates: schema_version
--
-- Note on 0001: its comment "Logs are never updated" is outdated. Retrying a
-- sync re-sends the same log, so logs are now upserted and need UPDATE.
-- 0001 is left untouched because it may already be applied.
-- Safe to run multiple times.
-- ===========================================================

-- --- custom_exercises ----------------------------------------

CREATE TABLE IF NOT EXISTS custom_exercises (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,  -- client-generated
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  muscle_group  TEXT NOT NULL,
  is_bodyweight BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  deleted_at    TIMESTAMPTZ NULL  -- soft delete so the deletion can sync
);

CREATE INDEX IF NOT EXISTS idx_custom_exercises_user
  ON custom_exercises(user_id);

DROP TRIGGER IF EXISTS update_custom_exercises_updated_at ON custom_exercises;
CREATE TRIGGER update_custom_exercises_updated_at
  BEFORE UPDATE ON custom_exercises
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE custom_exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own custom exercises" ON custom_exercises;
DROP POLICY IF EXISTS "Users can insert own custom exercises" ON custom_exercises;
DROP POLICY IF EXISTS "Users can update own custom exercises" ON custom_exercises;
DROP POLICY IF EXISTS "Users can delete own custom exercises" ON custom_exercises;

CREATE POLICY "Users can view own custom exercises"
  ON custom_exercises FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own custom exercises"
  ON custom_exercises FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom exercises"
  ON custom_exercises FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom exercises"
  ON custom_exercises FOR DELETE
  USING (auth.uid() = user_id);

-- --- workout_logs --------------------------------------------

ALTER TABLE workout_logs
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS schema_version INT NOT NULL DEFAULT 1;

DROP TRIGGER IF EXISTS update_workout_logs_updated_at ON workout_logs;
CREATE TRIGGER update_workout_logs_updated_at
  BEFORE UPDATE ON workout_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP POLICY IF EXISTS "Users can update own logs" ON workout_logs;
CREATE POLICY "Users can update own logs"
  ON workout_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- --- routine_templates ---------------------------------------

ALTER TABLE routine_templates
  ADD COLUMN IF NOT EXISTS schema_version INT NOT NULL DEFAULT 1;

-- --- Table privileges ----------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON custom_exercises TO authenticated;
GRANT UPDATE ON workout_logs TO authenticated;

-- ===========================================================
-- JSONB structure reference (schema_version 2)
-- ===========================================================
--
-- Version 1 rows have no ref/status/planned_exercise_id; readers must
-- tolerate their absence.
--
-- routine_templates.exercises:
-- [
--   {
--     "exercise_id":   "uuid-or-catalog-slug",
--     "exercise_name": "Dominadas",
--     "ref": { "source": "catalog" | "custom", "id": "pull-up" },  -- optional
--     "sets": [
--       { "set_number": 1, "target_reps": 12, "target_weight": 0 }
--     ]
--   }
-- ]
--
-- workout_logs.exercises:
-- [
--   {
--     "exercise_id":   "uuid-or-catalog-slug",
--     "exercise_name": "Dominadas",
--     "ref": { "source": "catalog" | "custom", "id": "pull-up" },  -- optional
--     "status": "completed" | "failed" | "skipped" | "replaced" | "added",  -- optional
--     "planned_exercise_id": "id-of-the-planned-exercise",  -- optional
--     "sets": [
--       { "set_number": 1, "actual_reps": 10, "actual_weight": 0 }
--     ]
--   }
-- ]
