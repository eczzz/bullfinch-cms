-- ============================================================================
-- 007: Tenant isolation — stop auto-creating users in every tenant schema
-- ============================================================================
-- The 001 migration installed a trigger on auth.users in each tenant schema.
-- Because auth.users is global, creating one auth user fired EVERY tenant's
-- trigger, inserting a Viewer row into every tenant's users table. Result:
-- one invite granted access to all workspaces. Fix:
--
--   1. Drop the per-tenant auth.users trigger. The admin-create-user edge
--      function now inserts the tenant users row explicitly.
--   2. Drop users_insert_self — any authenticated user could previously
--      self-insert a tenant users row via RLS, bypassing the tenant silo.
--   3. Add public.find_auth_user_id(email) so the edge function can look up
--      an existing auth user when an admin invites someone who already has
--      an account from another tenant.

DROP TRIGGER IF EXISTS on_auth_user_created_SCHEMA_NAME ON auth.users;
DROP FUNCTION IF EXISTS SCHEMA_NAME.handle_new_auth_user();

DROP POLICY IF EXISTS "users_insert_self" ON SCHEMA_NAME.users;

CREATE OR REPLACE FUNCTION public.find_auth_user_id(p_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.find_auth_user_id(text) FROM public;
GRANT EXECUTE ON FUNCTION public.find_auth_user_id(text) TO service_role;

INSERT INTO SCHEMA_NAME._migrations (name) VALUES ('007_tenant_isolation') ON CONFLICT DO NOTHING;
