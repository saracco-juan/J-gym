-- ===========================================================
-- J-GYM — RLS Policies
--
-- Script para configurar las políticas de seguridad (RLS)
-- de las tablas routine_templates y workout_logs.
--
-- Asume que RLS ya está habilitado en ambas tablas.
-- Usa DROP POLICY IF EXISTS para evitar conflictos si ya existen.
--
-- Copiar y pegar directamente en Supabase SQL Editor.
-- ===========================================================

-- ─── routine_templates ─────────────────────────────────────

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

-- ─── workout_logs ──────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view own logs" ON workout_logs;
DROP POLICY IF EXISTS "Users can insert own logs" ON workout_logs;

CREATE POLICY "Users can view own logs"
  ON workout_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logs"
  ON workout_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);
