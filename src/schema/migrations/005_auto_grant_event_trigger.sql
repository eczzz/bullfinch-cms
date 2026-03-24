-- ============================================================================
-- 005: Auto-grant event trigger
-- ============================================================================
-- Creates an event trigger that automatically grants permissions to
-- anon, authenticated, and service_role on any new table created in SCHEMA_NAME.
-- Event triggers are database-wide, so the trigger name is unique per schema.

-- Create the trigger function in the schema
CREATE OR REPLACE FUNCTION SCHEMA_NAME.auto_grant_on_new_table()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF obj.command_tag = 'CREATE TABLE' AND obj.schema_name = 'SCHEMA_NAME' THEN
      EXECUTE format('GRANT ALL ON TABLE %I.%I TO anon, authenticated, service_role',
        obj.schema_name, split_part(obj.object_identity, '.', 2));
    END IF;
  END LOOP;
END;
$$;

-- Drop existing trigger if present (idempotent)
DROP EVENT TRIGGER IF EXISTS trg_auto_grant_SCHEMA_NAME;

-- Create the event trigger
CREATE EVENT TRIGGER trg_auto_grant_SCHEMA_NAME
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE')
  EXECUTE FUNCTION SCHEMA_NAME.auto_grant_on_new_table();

INSERT INTO SCHEMA_NAME._migrations (name) VALUES ('005_auto_grant_event_trigger') ON CONFLICT DO NOTHING;
