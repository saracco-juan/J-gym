-- ===========================================================
-- J-GYM — Supabase Schema
--
-- Dos tablas principales:
--   1. routine_templates:  "El Plan" (plantilla semanal)
--   2. workout_logs:       "El Pasado" (registro inmutable)
--
-- Ambas usan JSONB para los ejercicios, evitando tablas extra.
-- RLS habilitado: cada usuario solo ve/modifica sus datos.
-- ===========================================================

-- ─── routine_templates ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS routine_templates (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_name    TEXT NOT NULL,  -- "lunes", "martes", etc.
  exercises   JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),

  -- Un usuario solo puede tener un template por día
  UNIQUE(user_id, day_name)
);

-- Índice para búsquedas frecuentes por user + día
CREATE INDEX IF NOT EXISTS idx_routine_templates_user_day
  ON routine_templates(user_id, day_name);

-- RLS
ALTER TABLE routine_templates ENABLE ROW LEVEL SECURITY;

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

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_routine_templates_updated_at
  BEFORE UPDATE ON routine_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ─── workout_logs ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workout_logs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id   UUID REFERENCES routine_templates(id) ON DELETE SET NULL,
  date          DATE NOT NULL,
  exercises     JSONB NOT NULL DEFAULT '[]'::JSONB,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Índice para búsquedas por user + fecha
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_date
  ON workout_logs(user_id, date);

-- RLS
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logs"
  ON workout_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logs"
  ON workout_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Los logs son inmutables, no se permiten updates ni deletes
-- (si se necesitara, se puede agregar después)


-- ===========================================================
-- JSONB Structure Reference
-- ===========================================================
--
-- routine_templates.exercises:
-- [
--   {
--     "exercise_id":   "uuid",
--     "exercise_name": "Dominadas",
--     "sets": [
--       { "set_number": 1, "target_reps": 12, "target_weight": 0 },
--       { "set_number": 2, "target_reps": 12, "target_weight": 0 },
--       { "set_number": 3, "target_reps": 12, "target_weight": 0 }
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
--       { "set_number": 1, "actual_reps": 10, "actual_weight": 0 },
--       { "set_number": 2, "actual_reps": 8,  "actual_weight": 0 }
--     ]
--   }
-- ]
