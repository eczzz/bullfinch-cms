-- Add test mode columns to content_entries
ALTER TABLE SCHEMA_NAME.content_entries ADD COLUMN IF NOT EXISTS test_mode boolean DEFAULT false;
ALTER TABLE SCHEMA_NAME.content_entries ADD COLUMN IF NOT EXISTS _snapshot jsonb DEFAULT NULL;

-- Track migration
INSERT INTO SCHEMA_NAME._migrations (name) VALUES ('003_test_mode') ON CONFLICT (name) DO NOTHING;
