-- ============================================================================
-- 004: Grant schema access to Supabase roles
-- ============================================================================
-- Without these grants, RLS policies targeting anon/authenticated are useless
-- because the roles can't even access the schema.

GRANT USAGE ON SCHEMA SCHEMA_NAME TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA SCHEMA_NAME TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA SCHEMA_NAME TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA SCHEMA_NAME GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA SCHEMA_NAME GRANT ALL ON SEQUENCES TO anon, authenticated;

INSERT INTO SCHEMA_NAME._migrations (name) VALUES ('004_grant_roles') ON CONFLICT DO NOTHING;
