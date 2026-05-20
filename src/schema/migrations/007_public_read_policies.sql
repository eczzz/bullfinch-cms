-- ============================================================================
-- 007: Public-read RLS policies for frontend consumption
-- ============================================================================
-- The default policies from migration 001 only target `authenticated`, so a
-- frontend using the anon key sees an empty result set for every query (RLS
-- defaults to deny). These policies expose the rows that a public-facing
-- site needs: models (to resolve api_identifier → id), published entries,
-- and media (since entry fields reference media URLs).
--
-- DROP IF EXISTS makes this safe to re-run.

DROP POLICY IF EXISTS content_models_public_select ON SCHEMA_NAME.content_models;
CREATE POLICY content_models_public_select ON SCHEMA_NAME.content_models
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS content_entries_public_select ON SCHEMA_NAME.content_entries;
CREATE POLICY content_entries_public_select ON SCHEMA_NAME.content_entries
  FOR SELECT TO anon USING (status = 'published');

DROP POLICY IF EXISTS media_public_select ON SCHEMA_NAME.media;
CREATE POLICY media_public_select ON SCHEMA_NAME.media
  FOR SELECT TO anon USING (true);

INSERT INTO SCHEMA_NAME._migrations (name) VALUES ('007_public_read_policies') ON CONFLICT DO NOTHING;
