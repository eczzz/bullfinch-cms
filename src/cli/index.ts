#!/usr/bin/env node

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VERSION = '0.1.0';

// ─── Arg Parser ─────────────────────────────────────────────────────────────

interface ParsedArgs {
  positional: string[];
  flags: Record<string, string | true>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const positional: string[] = [];
  const flags: Record<string, string | true> = {};
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        flags[key] = true;
        i++;
      } else {
        flags[key] = next;
        i += 2;
      }
    } else {
      positional.push(arg);
      i++;
    }
  }
  return { positional, flags };
}

// ─── Output Helpers ─────────────────────────────────────────────────────────

function isJson(flags: Record<string, string | true>): boolean {
  return flags.json === true;
}

function output(data: unknown, flags: Record<string, string | true>): void {
  if (isJson(flags)) {
    console.log(JSON.stringify(data, null, 2));
  } else if (Array.isArray(data)) {
    if (data.length === 0) {
      console.log('No results.');
      return;
    }
    printTable(data);
  } else if (typeof data === 'object' && data !== null) {
    printRecord(data as Record<string, unknown>);
  } else {
    console.log(data);
  }
}

function printTable(rows: Record<string, unknown>[]): void {
  if (rows.length === 0) return;
  const keys = Object.keys(rows[0]);
  const widths: Record<string, number> = {};
  for (const k of keys) widths[k] = k.length;
  for (const row of rows) {
    for (const k of keys) {
      const val = formatCell(row[k]);
      widths[k] = Math.max(widths[k], val.length);
    }
  }
  const header = keys.map((k) => k.toUpperCase().padEnd(widths[k])).join('  ');
  const sep = keys.map((k) => '─'.repeat(widths[k])).join('──');
  console.log(header);
  console.log(sep);
  for (const row of rows) {
    const line = keys.map((k) => formatCell(row[k]).padEnd(widths[k])).join('  ');
    console.log(line);
  }
}

function printRecord(obj: Record<string, unknown>): void {
  const maxKey = Math.max(...Object.keys(obj).map((k) => k.length));
  for (const [k, v] of Object.entries(obj)) {
    const val = typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v ?? '');
    console.log(`${k.padEnd(maxKey)}  ${val}`);
  }
}

function formatCell(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function die(msg: string): never {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

function requireFlag(flags: Record<string, string | true>, name: string): string {
  const val = flags[name];
  if (!val || val === true) die(`Missing required flag: --${name}`);
  return val as string;
}

function optionalFlag(flags: Record<string, string | true>, name: string): string | undefined {
  const val = flags[name];
  if (val === true || val === undefined) return undefined;
  return val;
}

// ─── Supabase Client ────────────────────────────────────────────────────────

function env(key: string): string {
  const val = process.env[key];
  if (!val) die(`Missing environment variable: ${key}`);
  return val;
}

function getSupabase(schema?: string): SupabaseClient {
  const opts: Record<string, unknown> = {
    auth: { autoRefreshToken: false, persistSession: false },
  };
  if (schema) {
    opts.db = { schema };
  }
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), opts);
}

function loadMigration(): string {
  const paths = [
    resolve(__dirname, '../schema/migrations/001_initial.sql'),
    resolve(__dirname, '../../src/schema/migrations/001_initial.sql'),
  ];
  for (const p of paths) {
    try {
      return readFileSync(p, 'utf-8');
    } catch { /* try next */ }
  }
  die('Could not find migration SQL file');
}

/** Parse --fields value: inline JSON or file path */
function parseFieldsArg(val: string): unknown {
  const trimmed = val.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed);
    } catch (e) {
      die(`Invalid inline JSON for --fields: ${(e as Error).message}`);
    }
  }
  // Treat as file path
  const fullPath = resolve(process.cwd(), trimmed);
  if (!existsSync(fullPath)) die(`Fields file not found: ${fullPath}`);
  try {
    return JSON.parse(readFileSync(fullPath, 'utf-8'));
  } catch (e) {
    die(`Invalid JSON in fields file ${fullPath}: ${(e as Error).message}`);
  }
}

// ─── Existing Commands (init / migrate / export) ────────────────────────────

async function cmdInit(flags: Record<string, string | true>): Promise<void> {
  const schema = requireFlag(flags, 'schema');
  const name = requireFlag(flags, 'name');
  console.log(`Initializing schema "${schema}" for "${name}"...`);
  const supabase = getSupabase();

  let sql = loadMigration();
  sql = sql.replace(/SCHEMA_NAME/g, schema);

  const { error } = await supabase.rpc('exec_sql', { query: sql });

  if (error) {
    if (error.message.includes('exec_sql') || error.code === '42883') {
      console.log('\nNo exec_sql function found. Run this SQL manually in your Supabase SQL Editor:\n');
      console.log('-- Create the exec_sql helper first:');
      console.log(`CREATE OR REPLACE FUNCTION exec_sql(query text) RETURNS void AS $$`);
      console.log(`BEGIN EXECUTE query; END; $$ LANGUAGE plpgsql SECURITY DEFINER;`);
      console.log('\n-- Then run the migration:');
      console.log(sql);
      console.log(`\n-- Seed business name:`);
      console.log(`INSERT INTO ${schema}.settings (key, value) VALUES ('branding_business_name', '${name.replace(/'/g, "''")}') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;`);
    } else {
      die(`Migration failed: ${error.message}`);
    }
    return;
  }

  const { error: seedError } = await supabase.rpc('exec_sql', {
    query: `INSERT INTO ${schema}.settings (key, value) VALUES ('branding_business_name', '${name.replace(/'/g, "''")}') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;`,
  });

  if (seedError) {
    console.warn(`Warning: Could not seed business name: ${seedError.message}`);
  }

  if (isJson(flags)) {
    output({ status: 'ok', schema, name }, flags);
  } else {
    console.log(`Schema "${schema}" initialized successfully.`);
    console.log(`\nNext steps:`);
    console.log(`  1. Create a Supabase client with: { db: { schema: '${schema}' } }`);
    console.log(`  2. Create an admin user in Supabase Auth`);
    console.log(`  3. Mount <CMSProvider> and <AdminPanel> in your app`);
  }
}

async function cmdMigrate(flags: Record<string, string | true>): Promise<void> {
  const schema = requireFlag(flags, 'schema');
  console.log(`Running migrations for schema "${schema}"...`);
  const supabase = getSupabase();

  let sql = loadMigration();
  sql = sql.replace(/SCHEMA_NAME/g, schema);

  const { error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) die(`Migration failed: ${error.message}`);

  if (isJson(flags)) {
    output({ status: 'ok', schema }, flags);
  } else {
    console.log(`Migrations complete for "${schema}".`);
  }
}

function cmdExport(flags: Record<string, string | true>): void {
  const schema = requireFlag(flags, 'schema');
  const outputFile = optionalFlag(flags, 'output') ?? './backup.sql';

  if (isJson(flags)) {
    const url = env('SUPABASE_URL');
    const host = new URL(url).hostname;
    const ref = host.split('.')[0];
    output({
      command: `pg_dump "postgresql://postgres:[SERVICE_ROLE_KEY]@db.${ref}.supabase.co:5432/postgres" --schema=${schema} --no-owner --no-privileges -f ${outputFile}`,
      note: 'Replace [SERVICE_ROLE_KEY] with your database password.',
    }, flags);
    return;
  }

  console.log(`Export command for schema "${schema}":\n`);
  const url = env('SUPABASE_URL');
  const host = new URL(url).hostname;
  const ref = host.split('.')[0];
  console.log(`pg_dump "postgresql://postgres:[SERVICE_ROLE_KEY]@db.${ref}.supabase.co:5432/postgres" \\`);
  console.log(`  --schema=${schema} \\`);
  console.log(`  --no-owner \\`);
  console.log(`  --no-privileges \\`);
  console.log(`  -f ${outputFile}`);
  console.log(`\nReplace [SERVICE_ROLE_KEY] with your database password.`);
}

// ─── Schemas ────────────────────────────────────────────────────────────────

async function cmdSchemasList(flags: Record<string, string | true>): Promise<void> {
  // exec_sql returns void, so we need a read-capable variant
  // Try exec_sql_read first, then fall back to Supabase Management API
  const supabase = getSupabase();

  const { data: result, error } = await supabase.rpc('exec_sql_read', {
    query: `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'cms_%' ORDER BY schema_name`,
  });

  if (!error && result) {
    output(result, flags);
    return;
  }

  // Fallback: use the Management API
  const url = env('SUPABASE_URL');
  const host = new URL(url).hostname;
  const ref = host.split('.')[0];
  const mgmtToken = process.env.SUPABASE_ACCESS_TOKEN;

  if (mgmtToken) {
    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mgmtToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'cms_%' ORDER BY schema_name`,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      output(data, flags);
      return;
    }
  }

  // Last resort: create exec_sql_read if it doesn't exist, then retry
  console.error('Could not list schemas. Create this helper function in your SQL Editor:\n');
  console.error(`CREATE OR REPLACE FUNCTION exec_sql_read(query text)`);
  console.error(`RETURNS jsonb AS $$`);
  console.error(`DECLARE result jsonb;`);
  console.error(`BEGIN EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || query || ') t' INTO result; RETURN COALESCE(result, '[]'::jsonb); END;`);
  console.error(`$$ LANGUAGE plpgsql SECURITY DEFINER;`);
  console.error('\nOr set SUPABASE_ACCESS_TOKEN env var for Management API access.');
  process.exit(1);
}

async function cmdSchemasInfo(flags: Record<string, string | true>): Promise<void> {
  const schema = requireFlag(flags, 'schema');
  const supabase = getSupabase(schema);

  const [models, entries, media, users] = await Promise.all([
    supabase.from('content_models').select('id', { count: 'exact', head: true }),
    supabase.from('content_entries').select('id', { count: 'exact', head: true }),
    supabase.from('media').select('id', { count: 'exact', head: true }),
    supabase.from('users').select('id', { count: 'exact', head: true }),
  ]);

  // Get latest updated_at across tables
  const { data: latestEntry } = await supabase
    .from('content_entries')
    .select('updated_at')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  const { data: latestModel } = await supabase
    .from('content_models')
    .select('updated_at')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  const timestamps = [latestEntry?.updated_at, latestModel?.updated_at].filter(Boolean) as string[];
  const lastUpdated = timestamps.length > 0 ? timestamps.sort().reverse()[0] : null;

  const info = {
    schema,
    model_count: models.count ?? 0,
    entry_count: entries.count ?? 0,
    media_count: media.count ?? 0,
    user_count: users.count ?? 0,
    last_updated: lastUpdated ?? 'never',
  };

  output(info, flags);
}

// ─── Models ─────────────────────────────────────────────────────────────────

async function cmdModelsList(flags: Record<string, string | true>): Promise<void> {
  const schema = requireFlag(flags, 'schema');
  const supabase = getSupabase(schema);

  const { data, error } = await supabase
    .from('content_models')
    .select('id, name, api_identifier, icon, description, created_at, updated_at')
    .order('name');
  if (error) die(error.message);

  const rows = (data || []).map((m) => ({
    id: m.id,
    name: m.name,
    api_id: m.api_identifier,
    icon: m.icon,
    description: m.description || '',
    updated_at: m.updated_at,
  }));

  output(rows, flags);
}

async function cmdModelsGet(flags: Record<string, string | true>): Promise<void> {
  const schema = requireFlag(flags, 'schema');
  const apiId = requireFlag(flags, 'model');
  const supabase = getSupabase(schema);

  const { data, error } = await supabase
    .from('content_models')
    .select('*')
    .eq('api_identifier', apiId)
    .single();
  if (error) die(error.message);

  output(data, flags);
}

async function cmdModelsCreate(flags: Record<string, string | true>): Promise<void> {
  const schema = requireFlag(flags, 'schema');
  const name = requireFlag(flags, 'name');
  const apiId = requireFlag(flags, 'api-id');
  const supabase = getSupabase(schema);

  const model: Record<string, unknown> = {
    name,
    api_identifier: apiId,
    description: optionalFlag(flags, 'description') ?? '',
    icon: optionalFlag(flags, 'icon') ?? '',
    fields: [],
  };

  const fieldsRaw = optionalFlag(flags, 'fields');
  if (fieldsRaw) {
    model.fields = parseFieldsArg(fieldsRaw);
  }

  const { data, error } = await supabase
    .from('content_models')
    .insert(model)
    .select()
    .single();
  if (error) die(error.message);

  output(data, flags);
}

async function cmdModelsUpdate(flags: Record<string, string | true>): Promise<void> {
  const schema = requireFlag(flags, 'schema');
  const apiId = requireFlag(flags, 'model');
  const supabase = getSupabase(schema);

  // Look up model by api_identifier
  const { data: existing, error: lookupErr } = await supabase
    .from('content_models')
    .select('id')
    .eq('api_identifier', apiId)
    .single();
  if (lookupErr) die(lookupErr.message);

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (optionalFlag(flags, 'name')) updates.name = optionalFlag(flags, 'name');
  if (optionalFlag(flags, 'description')) updates.description = optionalFlag(flags, 'description');
  if (optionalFlag(flags, 'icon')) updates.icon = optionalFlag(flags, 'icon');
  if (optionalFlag(flags, 'fields')) updates.fields = parseFieldsArg(optionalFlag(flags, 'fields')!);

  const { data, error } = await supabase
    .from('content_models')
    .update(updates)
    .eq('id', existing.id)
    .select()
    .single();
  if (error) die(error.message);

  output(data, flags);
}

async function cmdModelsDelete(flags: Record<string, string | true>): Promise<void> {
  const schema = requireFlag(flags, 'schema');
  const apiId = requireFlag(flags, 'model');
  const supabase = getSupabase(schema);

  const { data: existing, error: lookupErr } = await supabase
    .from('content_models')
    .select('id')
    .eq('api_identifier', apiId)
    .single();
  if (lookupErr) die(lookupErr.message);

  const { error } = await supabase
    .from('content_models')
    .delete()
    .eq('id', existing.id);
  if (error) die(error.message);

  if (isJson(flags)) {
    output({ status: 'deleted', api_identifier: apiId }, flags);
  } else {
    console.log(`Deleted model "${apiId}".`);
  }
}

// ─── Entries ────────────────────────────────────────────────────────────────

async function resolveModelId(supabase: SupabaseClient, apiId: string): Promise<string> {
  const { data, error } = await supabase
    .from('content_models')
    .select('id')
    .eq('api_identifier', apiId)
    .single();
  if (error) die(`Model "${apiId}" not found: ${error.message}`);
  return data.id;
}

async function cmdEntriesList(flags: Record<string, string | true>): Promise<void> {
  const schema = requireFlag(flags, 'schema');
  const apiId = requireFlag(flags, 'model');
  const supabase = getSupabase(schema);
  const modelId = await resolveModelId(supabase, apiId);

  let query = supabase
    .from('content_entries')
    .select('id, title, status, published_at, created_at, updated_at')
    .eq('content_model_id', modelId)
    .order('updated_at', { ascending: false });

  const status = optionalFlag(flags, 'status');
  if (status) query = query.eq('status', status);

  const limit = optionalFlag(flags, 'limit');
  if (limit) query = query.limit(parseInt(limit, 10));

  const { data, error } = await query;
  if (error) die(error.message);

  output(data || [], flags);
}

async function cmdEntriesGet(flags: Record<string, string | true>): Promise<void> {
  const schema = requireFlag(flags, 'schema');
  const id = requireFlag(flags, 'id');
  const supabase = getSupabase(schema);

  const { data, error } = await supabase
    .from('content_entries')
    .select('*')
    .eq('id', id)
    .single();
  if (error) die(error.message);

  output(data, flags);
}

async function cmdEntriesCreate(flags: Record<string, string | true>): Promise<void> {
  const schema = requireFlag(flags, 'schema');
  const apiId = requireFlag(flags, 'model');
  const title = requireFlag(flags, 'title');
  const supabase = getSupabase(schema);
  const modelId = await resolveModelId(supabase, apiId);

  const entry: Record<string, unknown> = {
    content_model_id: modelId,
    title,
    status: optionalFlag(flags, 'status') ?? 'draft',
    fields: {},
  };

  const fieldsRaw = optionalFlag(flags, 'fields');
  if (fieldsRaw) {
    entry.fields = parseFieldsArg(fieldsRaw);
  }

  const seoRaw = optionalFlag(flags, 'seo');
  if (seoRaw) {
    entry.seo = parseFieldsArg(seoRaw);
  }

  if (entry.status === 'published') {
    entry.published_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('content_entries')
    .insert(entry)
    .select()
    .single();
  if (error) die(error.message);

  output(data, flags);
}

async function cmdEntriesUpdate(flags: Record<string, string | true>): Promise<void> {
  const schema = requireFlag(flags, 'schema');
  const id = requireFlag(flags, 'id');
  const supabase = getSupabase(schema);

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (optionalFlag(flags, 'title')) updates.title = optionalFlag(flags, 'title');
  if (optionalFlag(flags, 'status')) updates.status = optionalFlag(flags, 'status');
  if (optionalFlag(flags, 'fields')) updates.fields = parseFieldsArg(optionalFlag(flags, 'fields')!);
  if (optionalFlag(flags, 'seo')) updates.seo = parseFieldsArg(optionalFlag(flags, 'seo')!);

  if (updates.status === 'published') {
    updates.published_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('content_entries')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) die(error.message);

  output(data, flags);
}

async function cmdEntriesDelete(flags: Record<string, string | true>): Promise<void> {
  const schema = requireFlag(flags, 'schema');
  const id = requireFlag(flags, 'id');
  const supabase = getSupabase(schema);

  const { error } = await supabase
    .from('content_entries')
    .delete()
    .eq('id', id);
  if (error) die(error.message);

  if (isJson(flags)) {
    output({ status: 'deleted', id }, flags);
  } else {
    console.log(`Deleted entry "${id}".`);
  }
}

async function cmdEntriesPublish(flags: Record<string, string | true>): Promise<void> {
  const schema = requireFlag(flags, 'schema');
  const id = requireFlag(flags, 'id');
  const supabase = getSupabase(schema);

  const { data, error } = await supabase
    .from('content_entries')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  if (error) die(error.message);

  output(data, flags);
}

async function cmdEntriesUnpublish(flags: Record<string, string | true>): Promise<void> {
  const schema = requireFlag(flags, 'schema');
  const id = requireFlag(flags, 'id');
  const supabase = getSupabase(schema);

  const { data, error } = await supabase
    .from('content_entries')
    .update({
      status: 'draft',
      published_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  if (error) die(error.message);

  output(data, flags);
}

// ─── Media ──────────────────────────────────────────────────────────────────

async function cmdMediaList(flags: Record<string, string | true>): Promise<void> {
  const schema = requireFlag(flags, 'schema');
  const supabase = getSupabase(schema);

  let query = supabase
    .from('media')
    .select('id, filename, url, mime_type, size, uploaded_by, created_at')
    .order('created_at', { ascending: false });

  const limit = optionalFlag(flags, 'limit');
  if (limit) query = query.limit(parseInt(limit, 10));

  const { data, error } = await query;
  if (error) die(error.message);

  output(data || [], flags);
}

async function cmdMediaDelete(flags: Record<string, string | true>): Promise<void> {
  const schema = requireFlag(flags, 'schema');
  const id = requireFlag(flags, 'id');
  const supabase = getSupabase(schema);

  const { error } = await supabase.from('media').delete().eq('id', id);
  if (error) die(error.message);

  if (isJson(flags)) {
    output({ status: 'deleted', id }, flags);
  } else {
    console.log(`Deleted media "${id}".`);
  }
}

// ─── Settings ───────────────────────────────────────────────────────────────

async function cmdSettingsList(flags: Record<string, string | true>): Promise<void> {
  const schema = requireFlag(flags, 'schema');
  const supabase = getSupabase(schema);

  const { data, error } = await supabase
    .from('settings')
    .select('id, key, value, updated_at')
    .order('key');
  if (error) die(error.message);

  output(data || [], flags);
}

async function cmdSettingsGet(flags: Record<string, string | true>): Promise<void> {
  const schema = requireFlag(flags, 'schema');
  const key = requireFlag(flags, 'key');
  const supabase = getSupabase(schema);

  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('key', key)
    .single();
  if (error) die(error.message);

  output(data, flags);
}

async function cmdSettingsSet(flags: Record<string, string | true>): Promise<void> {
  const schema = requireFlag(flags, 'schema');
  const key = requireFlag(flags, 'key');
  const value = requireFlag(flags, 'value');
  const supabase = getSupabase(schema);

  // Upsert: try update first, then insert
  const { data: existing } = await supabase
    .from('settings')
    .select('id')
    .eq('key', key)
    .single();

  let result;
  if (existing) {
    const { data, error } = await supabase
      .from('settings')
      .update({ value, updated_at: new Date().toISOString() })
      .eq('key', key)
      .select()
      .single();
    if (error) die(error.message);
    result = data;
  } else {
    const { data, error } = await supabase
      .from('settings')
      .insert({ key, value })
      .select()
      .single();
    if (error) die(error.message);
    result = data;
  }

  output(result, flags);
}

// ─── Users ──────────────────────────────────────────────────────────────────

async function cmdUsersList(flags: Record<string, string | true>): Promise<void> {
  const schema = requireFlag(flags, 'schema');
  const supabase = getSupabase(schema);

  const { data, error } = await supabase
    .from('users')
    .select('id, email, first_name, last_name, role, created_at, updated_at')
    .order('created_at', { ascending: false });
  if (error) die(error.message);

  output(data || [], flags);
}

async function cmdUsersGet(flags: Record<string, string | true>): Promise<void> {
  const schema = requireFlag(flags, 'schema');
  const id = requireFlag(flags, 'id');
  const supabase = getSupabase(schema);

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();
  if (error) die(error.message);

  output(data, flags);
}

async function cmdUsersUpdate(flags: Record<string, string | true>): Promise<void> {
  const schema = requireFlag(flags, 'schema');
  const id = requireFlag(flags, 'id');
  const supabase = getSupabase(schema);

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (optionalFlag(flags, 'role')) updates.role = optionalFlag(flags, 'role');
  if (optionalFlag(flags, 'first-name')) updates.first_name = optionalFlag(flags, 'first-name');
  if (optionalFlag(flags, 'last-name')) updates.last_name = optionalFlag(flags, 'last-name');

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) die(error.message);

  output(data, flags);
}

// ─── Help Text ──────────────────────────────────────────────────────────────

const HELP_MAIN = `
@bullfinch/cms CLI v${VERSION}

Usage: bullfinch-cms <command> [subcommand] [flags]

Commands:
  schemas    List and inspect CMS schemas
  models     CRUD operations on content models
  entries    CRUD operations on content entries
  media      Manage media records
  settings   Manage CMS settings
  users      Manage CMS users
  init       Initialize a new schema
  migrate    Run migrations on a schema
  export     Export schema data (pg_dump helper)

Global flags:
  --json       Output in JSON format (default: human-readable)
  --version    Show version
  --help       Show help

Environment variables:
  SUPABASE_URL              Your Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY Service role key (bypasses RLS)
`.trim();

const HELP_SCHEMAS = `
Usage: bullfinch-cms schemas <subcommand> [flags]

Subcommands:
  list                          List all cms_* schemas
  info   --schema <name>        Show schema stats (counts, last updated)

Flags:
  --json    Output in JSON format
`.trim();

const HELP_MODELS = `
Usage: bullfinch-cms models <subcommand> [flags]

Subcommands:
  list     --schema <name>
  get      --schema <name> --model <api_id>
  create   --schema <name> --name <name> --api-id <id> [--description <desc>] [--icon <emoji>] [--fields <json>]
  update   --schema <name> --model <api_id> [--name <name>] [--description <desc>] [--icon <emoji>] [--fields <json>]
  delete   --schema <name> --model <api_id>

Notes:
  --fields accepts inline JSON or a path to a .json file

Flags:
  --json    Output in JSON format
`.trim();

const HELP_ENTRIES = `
Usage: bullfinch-cms entries <subcommand> [flags]

Subcommands:
  list       --schema <name> --model <api_id> [--status draft|published|archived] [--limit N]
  get        --schema <name> --id <uuid>
  create     --schema <name> --model <api_id> --title <title> [--fields <json>] [--seo <json>] [--status draft|published]
  update     --schema <name> --id <uuid> [--title <title>] [--fields <json>] [--seo <json>] [--status <status>]
  delete     --schema <name> --id <uuid>
  publish    --schema <name> --id <uuid>
  unpublish  --schema <name> --id <uuid>

Notes:
  --fields accepts inline JSON or a path to a .json file
  --seo accepts inline JSON or a path to a .json file
    Keys: metaTitle, metaDescription, ogImage, ogTitle, ogDescription, canonicalUrl, noIndex, structuredData

Flags:
  --json    Output in JSON format
`.trim();

const HELP_MEDIA = `
Usage: bullfinch-cms media <subcommand> [flags]

Subcommands:
  list     --schema <name> [--limit N]
  delete   --schema <name> --id <uuid>

Flags:
  --json    Output in JSON format
`.trim();

const HELP_SETTINGS = `
Usage: bullfinch-cms settings <subcommand> [flags]

Subcommands:
  list   --schema <name>
  get    --schema <name> --key <key>
  set    --schema <name> --key <key> --value <value>

Flags:
  --json    Output in JSON format
`.trim();

const HELP_USERS = `
Usage: bullfinch-cms users <subcommand> [flags]

Subcommands:
  list     --schema <name>
  get      --schema <name> --id <uuid>
  update   --schema <name> --id <uuid> [--role Admin|Editor|Viewer] [--first-name <name>] [--last-name <name>]

Flags:
  --json    Output in JSON format
`.trim();

const HELP_INIT = `
Usage: bullfinch-cms init --schema <name> --name <display_name>

Initialize a new CMS schema with all required tables.

Flags:
  --schema <name>    Schema name (e.g., cms_acme)
  --name <name>      Display name for the business
  --json             Output in JSON format
`.trim();

const HELP_MIGRATE = `
Usage: bullfinch-cms migrate --schema <name>

Run migrations on an existing schema.

Flags:
  --schema <name>    Schema name
  --json             Output in JSON format
`.trim();

const HELP_EXPORT = `
Usage: bullfinch-cms export --schema <name> [--output <file>]

Print a pg_dump command for exporting schema data.

Flags:
  --schema <name>      Schema name
  --output <file>      Output file (default: ./backup.sql)
  --json               Output in JSON format
`.trim();

// ─── Router ─────────────────────────────────────────────────────────────────

const HELP_MAP: Record<string, string> = {
  schemas: HELP_SCHEMAS,
  models: HELP_MODELS,
  entries: HELP_ENTRIES,
  media: HELP_MEDIA,
  settings: HELP_SETTINGS,
  users: HELP_USERS,
  init: HELP_INIT,
  migrate: HELP_MIGRATE,
  export: HELP_EXPORT,
};

async function main(): Promise<void> {
  const { positional, flags } = parseArgs(process.argv.slice(2));

  if (flags.version) {
    console.log(VERSION);
    return;
  }

  const command = positional[0];
  const subcommand = positional[1];

  if (!command) {
    console.log(HELP_MAIN);
    return;
  }

  // Show command-level help for --help flag or "help" subcommand
  if (flags.help || subcommand === 'help') {
    console.log(HELP_MAP[command] ?? HELP_MAIN);
    return;
  }

  // For commands that have subcommands, show help if no subcommand given
  const commandsWithSubs = ['schemas', 'models', 'entries', 'media', 'settings', 'users'];
  if (commandsWithSubs.includes(command) && !subcommand) {
    console.log(HELP_MAP[command]);
    return;
  }

  try {
    switch (command) {
      // ── Schemas ──
      case 'schemas':
        if (subcommand === 'list') return await cmdSchemasList(flags);
        if (subcommand === 'info') return await cmdSchemasInfo(flags);
        die(`Unknown subcommand: schemas ${subcommand}. Run "bullfinch-cms schemas --help"`);
        break;

      // ── Models ──
      case 'models':
        if (subcommand === 'list') return await cmdModelsList(flags);
        if (subcommand === 'get') return await cmdModelsGet(flags);
        if (subcommand === 'create') return await cmdModelsCreate(flags);
        if (subcommand === 'update') return await cmdModelsUpdate(flags);
        if (subcommand === 'delete') return await cmdModelsDelete(flags);
        die(`Unknown subcommand: models ${subcommand}. Run "bullfinch-cms models --help"`);
        break;

      // ── Entries ──
      case 'entries':
        if (subcommand === 'list') return await cmdEntriesList(flags);
        if (subcommand === 'get') return await cmdEntriesGet(flags);
        if (subcommand === 'create') return await cmdEntriesCreate(flags);
        if (subcommand === 'update') return await cmdEntriesUpdate(flags);
        if (subcommand === 'delete') return await cmdEntriesDelete(flags);
        if (subcommand === 'publish') return await cmdEntriesPublish(flags);
        if (subcommand === 'unpublish') return await cmdEntriesUnpublish(flags);
        die(`Unknown subcommand: entries ${subcommand}. Run "bullfinch-cms entries --help"`);
        break;

      // ── Media ──
      case 'media':
        if (subcommand === 'list') return await cmdMediaList(flags);
        if (subcommand === 'delete') return await cmdMediaDelete(flags);
        die(`Unknown subcommand: media ${subcommand}. Run "bullfinch-cms media --help"`);
        break;

      // ── Settings ──
      case 'settings':
        if (subcommand === 'list') return await cmdSettingsList(flags);
        if (subcommand === 'get') return await cmdSettingsGet(flags);
        if (subcommand === 'set') return await cmdSettingsSet(flags);
        die(`Unknown subcommand: settings ${subcommand}. Run "bullfinch-cms settings --help"`);
        break;

      // ── Users ──
      case 'users':
        if (subcommand === 'list') return await cmdUsersList(flags);
        if (subcommand === 'get') return await cmdUsersGet(flags);
        if (subcommand === 'update') return await cmdUsersUpdate(flags);
        die(`Unknown subcommand: users ${subcommand}. Run "bullfinch-cms users --help"`);
        break;

      // ── Legacy Commands ──
      case 'init':
        return await cmdInit(flags);

      case 'migrate':
        return await cmdMigrate(flags);

      case 'export':
        return cmdExport(flags);

      default:
        console.error(`Unknown command: ${command}`);
        console.log(HELP_MAIN);
        process.exit(1);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    die(msg);
  }
}

main();
