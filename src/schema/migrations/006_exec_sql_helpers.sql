-- ============================================================================
-- 006: exec_sql helper functions
-- ============================================================================
-- Creates exec_sql(query text) and exec_sql_read(query text) in the public
-- schema. These are used by the CLI to run arbitrary SQL via PostgREST RPCs.
-- Both are SECURITY DEFINER so they execute with the function owner's privileges.

CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query;
END;
$$;

CREATE OR REPLACE FUNCTION public.exec_sql_read(query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  EXECUTE 'SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (' || query || ') t'
    INTO result;
  RETURN result;
END;
$$;

INSERT INTO SCHEMA_NAME._migrations (name) VALUES ('006_exec_sql_helpers') ON CONFLICT DO NOTHING;
