-- ============================================================================
-- @bullfinch/cms — Initial Schema Migration
-- ============================================================================
-- Multi-tenant: uses SCHEMA_NAME placeholder (replaced by CLI at runtime).
-- Run with: bullfinch-cms init --schema cms_xxx --name "Client Name"
-- ============================================================================

-- Create schema
CREATE SCHEMA IF NOT EXISTS SCHEMA_NAME;

SET search_path TO SCHEMA_NAME, public;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION SCHEMA_NAME.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = SCHEMA_NAME, public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM SCHEMA_NAME.users
    WHERE id = auth.uid()
    AND role = 'Admin'
  );
END;
$$;

-- ============================================================================
-- USERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS SCHEMA_NAME.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  first_name text DEFAULT '',
  last_name text DEFAULT '',
  phone_number text DEFAULT '',
  role text DEFAULT 'Viewer' CHECK (role IN ('Admin', 'Editor', 'Viewer')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE SCHEMA_NAME.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select" ON SCHEMA_NAME.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_update_self" ON SCHEMA_NAME.users FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_admin" ON SCHEMA_NAME.users FOR UPDATE TO authenticated USING (SCHEMA_NAME.is_admin()) WITH CHECK (SCHEMA_NAME.is_admin());
CREATE POLICY "users_insert_self" ON SCHEMA_NAME.users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "users_insert_admin" ON SCHEMA_NAME.users FOR INSERT TO authenticated WITH CHECK (SCHEMA_NAME.is_admin());
CREATE POLICY "users_delete_admin" ON SCHEMA_NAME.users FOR DELETE TO authenticated USING (SCHEMA_NAME.is_admin());

CREATE INDEX IF NOT EXISTS idx_users_email ON SCHEMA_NAME.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON SCHEMA_NAME.users(role);

-- Auto-create user record on auth signup
CREATE OR REPLACE FUNCTION SCHEMA_NAME.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = SCHEMA_NAME, public
AS $$
BEGIN
  INSERT INTO SCHEMA_NAME.users (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Viewer')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Note: trigger on auth.users must be set up per-project;
-- we create it only if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_SCHEMA_NAME'
  ) THEN
    CREATE TRIGGER on_auth_user_created_SCHEMA_NAME
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION SCHEMA_NAME.handle_new_auth_user();
  END IF;
END;
$$;

-- ============================================================================
-- CONTENT MODELS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS SCHEMA_NAME.content_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  api_identifier text UNIQUE NOT NULL,
  description text DEFAULT '',
  icon text DEFAULT '📄',
  fields jsonb NOT NULL DEFAULT '[]',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE SCHEMA_NAME.content_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_models_select" ON SCHEMA_NAME.content_models FOR SELECT TO authenticated USING (true);
CREATE POLICY "content_models_insert" ON SCHEMA_NAME.content_models FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "content_models_update" ON SCHEMA_NAME.content_models FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "content_models_delete" ON SCHEMA_NAME.content_models FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_content_models_api ON SCHEMA_NAME.content_models(api_identifier);

-- ============================================================================
-- CONTENT ENTRIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS SCHEMA_NAME.content_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_model_id uuid NOT NULL REFERENCES SCHEMA_NAME.content_models(id) ON DELETE CASCADE,
  title text NOT NULL,
  fields jsonb NOT NULL DEFAULT '{}',
  seo jsonb DEFAULT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE SCHEMA_NAME.content_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_entries_select" ON SCHEMA_NAME.content_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "content_entries_insert" ON SCHEMA_NAME.content_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "content_entries_update" ON SCHEMA_NAME.content_entries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "content_entries_delete" ON SCHEMA_NAME.content_entries FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_content_entries_model ON SCHEMA_NAME.content_entries(content_model_id);
CREATE INDEX IF NOT EXISTS idx_content_entries_status ON SCHEMA_NAME.content_entries(status);

-- ============================================================================
-- MEDIA TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS SCHEMA_NAME.media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  url text NOT NULL,
  mime_type text NOT NULL,
  size integer DEFAULT 0,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE SCHEMA_NAME.media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "media_select" ON SCHEMA_NAME.media FOR SELECT TO authenticated USING (true);
CREATE POLICY "media_insert" ON SCHEMA_NAME.media FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "media_delete" ON SCHEMA_NAME.media FOR DELETE TO authenticated USING (auth.uid() = uploaded_by);

-- ============================================================================
-- SETTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS SCHEMA_NAME.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE SCHEMA_NAME.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_select" ON SCHEMA_NAME.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings_select_branding" ON SCHEMA_NAME.settings FOR SELECT TO anon USING (key LIKE 'branding_%');
CREATE POLICY "settings_update" ON SCHEMA_NAME.settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "settings_insert" ON SCHEMA_NAME.settings FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_settings_key ON SCHEMA_NAME.settings(key);

-- ============================================================================
-- SEED DEFAULT SETTINGS
-- ============================================================================

INSERT INTO SCHEMA_NAME.settings (key, value) VALUES
  ('site_name', ''),
  ('site_description', ''),
  ('contact_email', ''),
  ('contact_phone', ''),
  ('address', ''),
  ('contact_address', ''),
  ('footer_body', ''),
  ('footer_tagline', ''),
  ('branding_primary_color', ''),
  ('branding_accent_color', ''),
  ('branding_logo', ''),
  ('branding_icon', ''),
  ('branding_favicon', ''),
  ('branding_sidebar_bg', ''),
  ('branding_sidebar_text', ''),
  ('integration_netlify_build_hook', ''),
  ('integration_r2_account_id', ''),
  ('integration_r2_access_key_id', ''),
  ('integration_r2_secret_access_key', ''),
  ('integration_r2_bucket_name', ''),
  ('integration_r2_public_url', '')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- SCHEMA MIGRATION TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS SCHEMA_NAME._migrations (
  id serial PRIMARY KEY,
  name text UNIQUE NOT NULL,
  applied_at timestamptz DEFAULT now()
);

INSERT INTO SCHEMA_NAME._migrations (name) VALUES ('001_initial')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- DONE
-- ============================================================================
