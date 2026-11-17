-- ===========================================================
-- J-GYM - Delete own account (idempotent)
--
-- delete_own_account() removes the calling user's row from auth.users.
-- Every user table already references auth.users ON DELETE CASCADE, so
-- one delete removes all of the user's data:
--   0001 routine_templates, workout_logs
--   0002 custom_exercises
--   0004 profiles
--   0005 public_stats
-- (workout_logs.template_id is SET NULL, but the logs go with the user
-- through user_id anyway.) Supabase also cascades auth.sessions and
-- invalidates the refresh tokens, so the account cannot mint new access
-- tokens. Caveats from the Supabase docs:
--   - An access token already issued stays valid until it expires (JWTs
--     are stateless). RLS finds no rows for a deleted user, so it is
--     harmless, but the client must also drop its local session.
--   - A user that owns Storage objects cannot be deleted. This app has
--     no Storage usage; if that changes, delete the objects first.
--
-- The function is SECURITY DEFINER (owned by postgres through the
-- migration) because authenticated users cannot delete from auth.users.
-- It only ever touches the row of auth.uid(). The search path is empty
-- and every relation is schema qualified, as the Supabase docs advise
-- for SECURITY DEFINER. EXECUTE is revoked from PUBLIC and from anon
-- (Supabase grants it to anon by default) and given to authenticated.
--
-- The client reset ("Reiniciar datos") needs no change here: DELETE
-- policies already exist on routine_templates and workout_logs (0001)
-- and custom_exercises (0002), and the client only soft-deletes custom
-- exercises through the UPDATE policy.
-- Safe to run multiple times.
-- ===========================================================

CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
