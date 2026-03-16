-- ============================================================================
-- 002: Fix cascade deletes — prevent user deletion from nuking content
-- ============================================================================
-- Problem: created_by/uploaded_by columns had ON DELETE CASCADE, meaning
-- deleting a user would destroy all their content models, entries, and media.
-- Fix: Change to ON DELETE SET NULL — content survives, creator ref goes null.
-- ============================================================================

SET search_path TO SCHEMA_NAME, public;

-- content_models.created_by: CASCADE → SET NULL
ALTER TABLE SCHEMA_NAME.content_models
  DROP CONSTRAINT IF EXISTS content_models_created_by_fkey,
  ADD CONSTRAINT content_models_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- content_entries.created_by: CASCADE → SET NULL
ALTER TABLE SCHEMA_NAME.content_entries
  DROP CONSTRAINT IF EXISTS content_entries_created_by_fkey,
  ADD CONSTRAINT content_entries_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- media.uploaded_by: CASCADE → SET NULL
ALTER TABLE SCHEMA_NAME.media
  DROP CONSTRAINT IF EXISTS media_uploaded_by_fkey,
  ADD CONSTRAINT media_uploaded_by_fkey
    FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Track migration
INSERT INTO SCHEMA_NAME._migrations (name) VALUES ('002_fix_cascade_deletes')
ON CONFLICT (name) DO NOTHING;
