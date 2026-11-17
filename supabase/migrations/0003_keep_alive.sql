-- ===========================================================
-- J-GYM - Keep-alive heartbeat (idempotent)
--
-- Supabase pauses Free projects without enough database activity in a
-- week. A read that returns zero rows was not enough, so a scheduled
-- GitHub Action calls keep_alive() daily, which writes one row.
--
-- The heartbeat table has RLS on and no policies: nobody can read or
-- write it directly. keep_alive() is SECURITY DEFINER and only updates
-- that single row, so exposing it to anon is harmless.
-- Safe to run multiple times.
-- ===========================================================

CREATE TABLE IF NOT EXISTS heartbeat (
  id       INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  beat_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE heartbeat ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.keep_alive()
RETURNS TIMESTAMPTZ
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO heartbeat (id, beat_at)
  VALUES (1, now())
  ON CONFLICT (id) DO UPDATE SET beat_at = EXCLUDED.beat_at
  RETURNING beat_at;
$$;

REVOKE ALL ON FUNCTION public.keep_alive() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.keep_alive() TO anon, authenticated;
