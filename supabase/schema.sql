-- ═══════════════════════════════════════════════════════════════
-- VE-ONESTOPSHOP — Supabase Schema Setup
-- ═══════════════════════════════════════════════════════════════
-- Run this ONCE in your Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════════

-- 1. PROFILES TABLE — extends Supabase auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('super_admin', 'admin', 've', 'ae', 'se', 'viewer')),
  tool_access TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'invited'
    CHECK (status IN ('active', 'invited', 'disabled')),
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Admins can read ALL profiles
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- Admins can update ANY profile
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- Admins can insert profiles (for pre-provisioning)
CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- Admins can delete profiles
CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- 3. AUTO-CREATE PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, tool_access, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      INITCAP(REPLACE(SPLIT_PART(NEW.email, '@', 1), '.', ' '))
    ),
    COALESCE(NEW.raw_user_meta_data->>'role', 'viewer'),
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(
        COALESCE(NEW.raw_user_meta_data->'tool_access', '[]'::jsonb)
      )),
      '{}'
    ),
    'active'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if re-running
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. ACCESS LOG — audit trail for all tool launches and denials
CREATE TABLE IF NOT EXISTS public.tool_access_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_email TEXT,
  tool_id TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'launch'
    CHECK (action IN ('launch', 'denied', 'proxy_error')),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tool_access_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read access logs
CREATE POLICY "Admins can read access logs"
  ON public.tool_access_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- Any authenticated user can insert logs (the proxy does this)
CREATE POLICY "Authenticated users can insert logs"
  ON public.tool_access_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 5. UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 6. INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_access_log_user ON public.tool_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_access_log_tool ON public.tool_access_log(tool_id);
CREATE INDEX IF NOT EXISTS idx_access_log_created ON public.tool_access_log(created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- SEED: Create the first super_admin user
-- ═══════════════════════════════════════════════════════════════
-- IMPORTANT: After your first magic link login, run this to promote yourself:
--
-- UPDATE public.profiles
-- SET role = 'super_admin',
--     tool_access = ARRAY['tco-calc-prod','tco-calc-test','reverse-timeline','business-case-builder','competitive-intel','deal-accelerator','roi-analyzer']
-- WHERE email = 'mohammed.irfan@nerdio.net';
--
-- Then promote Richard:
-- UPDATE public.profiles
-- SET role = 'admin',
--     tool_access = ARRAY['tco-calc-prod','tco-calc-test','reverse-timeline','business-case-builder','competitive-intel','deal-accelerator','roi-analyzer']
-- WHERE email = 'richard.edwards@nerdio.net';
--
-- Grant production TCO Calculator to the VE team:
-- UPDATE public.profiles
-- SET tool_access = array_append(tool_access, 'tco-calc-prod')
-- WHERE role IN ('ve', 'ae', 'se') AND status = 'active'
--   AND NOT ('tco-calc-prod' = ANY(tool_access));
-- ═══════════════════════════════════════════════════════════════
