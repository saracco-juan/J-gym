-- ===========================================================
-- J-GYM - Profiles (idempotent)
--
-- A profile is the public identity of a registered user: a display name
-- and an avatar color. The leaderboard shows every profile, so any
-- registered user can read all of them, but each user can only create and
-- edit their own.
--
-- Anonymous users (the old demo accounts) cannot have a profile: they link
-- an email first (same user id, so their data stays), then create one.
-- The JWT of an anonymous user carries is_anonymous = true.
--
-- The avatar palette is fixed. It mirrors AVATAR_COLORS in
-- src/core/profile/avatar.ts: change both together.
--
-- The leaderboard stats table is NOT part of this migration.
-- Safe to run multiple times.
-- ===========================================================

-- --- profiles --------------------------------------------------

CREATE TABLE IF NOT EXISTS profiles (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL
                CHECK (char_length(display_name) BETWEEN 2 AND 24)
                CHECK (display_name = btrim(display_name)),
  avatar_color  TEXT NOT NULL
                CHECK (avatar_color IN (
                  '#059669', '#0d9488', '#0284c7', '#2563eb',
                  '#7c3aed', '#c026d3', '#db2777', '#ea580c'
                )),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Two people cannot share a name, ignoring case ("Juan" and "juan").
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_display_name_lower
  ON profiles (lower(display_name));

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- --- Row Level Security ----------------------------------------

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Registered users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Registered users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'is_anonymous')::boolean IS NOT TRUE);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (auth.jwt() ->> 'is_anonymous')::boolean IS NOT TRUE
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND (auth.jwt() ->> 'is_anonymous')::boolean IS NOT TRUE
  )
  WITH CHECK (
    auth.uid() = user_id
    AND (auth.jwt() ->> 'is_anonymous')::boolean IS NOT TRUE
  );

-- --- Table privileges ------------------------------------------

-- No DELETE: a profile goes away with its user (ON DELETE CASCADE).
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
