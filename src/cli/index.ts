#!/usr/bin/env node

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname, extname, basename } from 'path';
import { fileURLToPath } from 'url';
import { AwsClient } from 'aws4fetch';

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
  return loadMigrationFile('001_initial');
}

function loadMigrationFile(name: string): string {
  const filename = `${name}.sql`;
  const paths = [
    resolve(__dirname, '../schema/migrations', filename),
    resolve(__dirname, '../../src/schema/migrations', filename),
  ];
  for (const p of paths) {
    try {
      return readFileSync(p, 'utf-8');
    } catch { /* try next */ }
  }
  die(`Could not find migration file: ${filename}`);
}

// Valid field types from DynamicField.tsx
const VALID_FIELD_TYPES = new Set([
  'short_text', 'long_text', 'rich_text', 'number', 'boolean',
  'date', 'datetime', 'color', 'select', 'media', 'reference',
  'button', 'array', 'url', 'email', 'slug',
]);

// ─── Levenshtein Distance ───────────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function fuzzyMatch(unknown: string, candidates: string[]): string | null {
  let best: string | null = null;
  let bestDist = Infinity;
  for (const c of candidates) {
    // Substring match
    if (c.includes(unknown) || unknown.includes(c)) return c;
    const dist = levenshtein(unknown, c);
    if (dist < bestDist) { bestDist = dist; best = c; }
  }
  return bestDist <= 2 ? best : null;
}

// ─── Entry Field Validation ─────────────────────────────────────────────────

function validateEntryFields(
  entryFields: Record<string, unknown>,
  modelFields: Array<Record<string, unknown>>,
  prefix = '',
): string[] {
  const errors: string[] = [];
  const fieldMap = new Map<string, Record<string, unknown>>();
  for (const mf of modelFields) {
    fieldMap.set(mf.api_identifier as string, mf);
  }
  const validKeys = [...fieldMap.keys()];

  for (const [key, value] of Object.entries(entryFields)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const modelField = fieldMap.get(key);
    if (!modelField) {
      const suggestion = fuzzyMatch(key, validKeys);
      const hint = suggestion ? ` Did you mean "${suggestion}"?` : '';
      errors.push(`Field "${fullKey}" not found in model.${hint}`);
      continue;
    }
    const ft = modelField.field_type as string;
    const typeErrors = validateFieldValue(fullKey, value, ft, modelField);
    errors.push(...typeErrors);
  }
  return errors;
}

function validateFieldValue(
  fullKey: string,
  value: unknown,
  fieldType: string,
  modelField: Record<string, unknown>,
): string[] {
  const errors: string[] = [];
  const tv = typeof value;

  switch (fieldType) {
    case 'short_text':
    case 'long_text':
    case 'rich_text':
    case 'slug':
    case 'color':
    case 'select':
    case 'date':
    case 'datetime':
    case 'media':
    case 'reference':
      if (tv !== 'string') {
        errors.push(`Field "${fullKey}": expected string for ${fieldType}, got ${tv}`);
      }
      break;
    case 'url':
      if (tv !== 'string') {
        errors.push(`Field "${fullKey}": expected string for url, got ${tv}`);
      } else {
        const s = value as string;
        if (!s.startsWith('http://') && !s.startsWith('https://') && !s.startsWith('/')) {
          errors.push(`Field "${fullKey}": url must start with http://, https://, or /`);
        }
      }
      break;
    case 'email':
      if (tv !== 'string') {
        errors.push(`Field "${fullKey}": expected string for email, got ${tv}`);
      } else if (!(value as string).includes('@')) {
        errors.push(`Field "${fullKey}": email must contain @`);
      }
      break;
    case 'number':
      if (tv !== 'number') {
        errors.push(`Field "${fullKey}": expected number for number, got ${tv}`);
      }
      break;
    case 'boolean':
      if (tv !== 'boolean') {
        errors.push(`Field "${fullKey}": expected boolean for boolean, got ${tv}`);
      }
      break;
    case 'button':
      if (tv !== 'object' || value === null || Array.isArray(value)) {
        errors.push(`Field "${fullKey}": expected object with text and url for button, got ${Array.isArray(value) ? 'array' : tv}`);
      } else {
        const obj = value as Record<string, unknown>;
        if (typeof obj.text !== 'string') errors.push(`Field "${fullKey}.text": expected string for button text, got ${typeof obj.text}`);
        if (typeof obj.url !== 'string') errors.push(`Field "${fullKey}.url": expected string for button url, got ${typeof obj.url}`);
      }
      break;
    case 'array':
      if (!Array.isArray(value)) {
        errors.push(`Field "${fullKey}": expected array for array, got ${tv}`);
      } else {
        const opts = modelField.options as Record<string, unknown> | undefined;
        if (opts && Array.isArray(opts.item_fields) && opts.item_fields.length > 0) {
          const itemFields = opts.item_fields as Array<Record<string, unknown>>;
          for (let i = 0; i < (value as unknown[]).length; i++) {
            const item = (value as unknown[])[i];
            if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
              errors.push(...validateEntryFields(item as Record<string, unknown>, itemFields, `${fullKey}[${i}]`));
            } else {
              errors.push(`Field "${fullKey}[${i}]": expected object for array item, got ${typeof item}`);
            }
          }
        }
      }
      break;
  }
  return errors;
}

/** Normalize and validate a field definition to match FieldDefinition interface */
function normalizeField(field: Record<string, unknown>, index: number, force = false): Record<string, unknown> {
  const normalized: Record<string, unknown> = { ...field };

  // Normalize api_id/key → api_identifier
  if (!normalized.api_identifier && normalized.api_id) {
    normalized.api_identifier = normalized.api_id;
    delete normalized.api_id;
  }
  if (!normalized.api_identifier && normalized.key) {
    normalized.api_identifier = normalized.key;
    delete normalized.key;
  }
  if (!normalized.api_identifier) {
    die(`Field ${index + 1} ("${normalized.name || '?'}") missing api_identifier (or api_id/key)`);
  }

  // Normalize type → field_type
  if (!normalized.field_type && normalized.type) {
    normalized.field_type = normalized.type;
    delete normalized.type;
  }
  if (!normalized.field_type) {
    die(`Field "${normalized.api_identifier}" missing field_type`);
  }
  if (!VALID_FIELD_TYPES.has(normalized.field_type as string)) {
    die(`Field "${normalized.api_identifier}" has invalid field_type "${normalized.field_type}". Valid types: ${[...VALID_FIELD_TYPES].join(', ')}`);
  }

  const apiId = normalized.api_identifier as string;
  const ft = normalized.field_type as string;

  // ── Hard errors (always block) ──
  if (ft === 'array') {
    const opts = normalized.options as Record<string, unknown> | undefined;
    if (!opts || !Array.isArray(opts.item_fields) || opts.item_fields.length === 0) {
      die(`Array fields must define item_fields in options (field "${apiId}")`);
    }
  }

  // ── Soft errors (block unless --force) ──
  if (ft === 'long_text') {
    const msg = `"${apiId}" uses long_text — use rich_text for body copy or short_text for single-line text. Pass --force to override.`;
    if (force) {
      console.warn(`Warning: ${msg}`);
    } else {
      die(msg);
    }
  }
  if (ft === 'short_text' && (/url/i.test(apiId) || /href/i.test(apiId))) {
    const msg = `"${apiId}" looks like a URL field — use the url type. Pass --force to override.`;
    if (force) {
      console.warn(`Warning: ${msg}`);
    } else {
      die(msg);
    }
  }

  // Recursively normalize item_fields in arrays
  if (ft === 'array' && normalized.options) {
    const opts = normalized.options as Record<string, unknown>;
    if (Array.isArray(opts.item_fields)) {
      opts.item_fields = (opts.item_fields as Record<string, unknown>[]).map((sf, si) => normalizeField(sf, si, force));
    }
  }

  return normalized;
}

/** Normalize an array of field definitions, with convention checks */
function normalizeFields(fields: unknown, force = false): unknown {
  if (!Array.isArray(fields)) return fields;
  const normalized = fields.map((f, i) => normalizeField(f as Record<string, unknown>, i, force));

  // ── Button-pair warnings (never block, just warn) ──
  const apiIds = new Set(normalized.map((f) => f.api_identifier as string));
  for (const id of apiIds) {
    if (id.endsWith('_text')) {
      const base = id.slice(0, -5);
      const urlPair = `${base}_url`;
      if (apiIds.has(urlPair)) {
        console.warn(`Warning: Fields "${id}" + "${urlPair}" look like a button — consider using the button type instead.`);
      }
    }
  }

  return normalized;
}

/** Parse --fields value: inline JSON or file path */
function parseFieldsArg(val: string, force = false): unknown {
  const trimmed = val.trim();
  let parsed: unknown;
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      parsed = JSON.parse(trimmed);
    } catch (e) {
      die(`Invalid inline JSON for --fields: ${(e as Error).message}`);
    }
  } else {
    // Treat as file path
    const fullPath = resolve(process.cwd(), trimmed);
    if (!existsSync(fullPath)) die(`Fields file not found: ${fullPath}`);
    try {
      parsed = JSON.parse(readFileSync(fullPath, 'utf-8'));
    } catch (e) {
      die(`Invalid JSON in fields file ${fullPath}: ${(e as Error).message}`);
    }
  }
  // Normalize field definitions if this looks like a fields array (for models)
  if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0] !== null) {
    const first = parsed[0] as Record<string, unknown>;
    // If it has field-definition-like keys, normalize
    if (first.field_type || first.type || first.api_identifier || first.api_id || first.key) {
      return normalizeFields(parsed, force);
    }
  }
  return parsed;
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
      console.log(`INSERT INTO ${schema}.settings (key, value) VALUES ('site_name', '${name.replace(/'/g, "''")}') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;`);
    } else {
      die(`Migration failed: ${error.message}`);
    }
    return;
  }

  const { error: seedError } = await supabase.rpc('exec_sql', {
    query: `INSERT INTO ${schema}.settings (key, value) VALUES ('site_name', '${name.replace(/'/g, "''")}') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;`,
  });

  if (seedError) {
    console.warn(`Warning: Could not seed business name: ${seedError.message}`);
  }

  // Run all subsequent migrations so new schemas are fully configured
  console.log('Running subsequent migrations...');
  await cmdMigrate({ ...flags, schema });

  // Expose schema via PostgREST (Management API)
  const mgmtToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (mgmtToken) {
    const url = env('SUPABASE_URL');
    const ref = new URL(url).hostname.split('.')[0];
    try {
      const configRes = await fetch(`https://api.supabase.com/v1/projects/${ref}/postgrest`, {
        headers: { 'Authorization': `Bearer ${mgmtToken}` },
      });
      if (configRes.ok) {
        const config = await configRes.json() as Record<string, unknown>;
        const currentSchemas = (config.db_schema as string) || 'public,graphql_public';
        if (!currentSchemas.split(',').map((s: string) => s.trim()).includes(schema)) {
          const newSchemas = `${currentSchemas},${schema}`;
          const updateRes = await fetch(`https://api.supabase.com/v1/projects/${ref}/postgrest`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${mgmtToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ db_schema: newSchemas }),
          });
          if (updateRes.ok) {
            console.log(`PostgREST: exposed schema "${schema}" via API.`);
          } else {
            console.warn(`Warning: Could not update PostgREST config (${updateRes.status}). Add "${schema}" to exposed schemas manually in Supabase Dashboard → Settings → API.`);
          }
        } else {
          console.log(`PostgREST: schema "${schema}" already exposed.`);
        }
      }
    } catch {
      console.warn('Warning: Could not reach Supabase Management API to expose schema. Add it manually in Dashboard → Settings → API.');
    }
  } else {
    console.log(`\nNote: Set SUPABASE_ACCESS_TOKEN env var to auto-expose the schema via PostgREST.`);
    console.log(`Otherwise, add "${schema}" to the exposed schemas in Supabase Dashboard → Settings → API.`);
  }

  // Run verification
  console.log('\nRunning verification...');
  const checks = await cmdVerify({ ...flags, schema });
  const allPass = checks.every((c) => c.pass);

  if (isJson(flags)) {
    output({ status: allPass ? 'ok' : 'warning', schema, name, checks }, flags);
  } else {
    console.log(`\nSchema "${schema}" initialized successfully (all migrations applied).`);
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

  const migrationFiles = ['001_initial', '002_fix_cascade_deletes', '003_test_mode', '004_grant_roles', '005_auto_grant_event_trigger', '006_exec_sql_helpers'];

  // Check which migrations have already been applied
  const { data: applied } = await supabase.rpc('exec_sql_read', {
    query: `SELECT name FROM ${schema}._migrations`,
  });
  const appliedSet = new Set<string>();
  if (Array.isArray(applied)) {
    for (const row of applied) {
      appliedSet.add(typeof row === 'string' ? row : (row as Record<string, unknown>).name as string);
    }
  }

  let ranCount = 0;
  for (const name of migrationFiles) {
    if (appliedSet.has(name)) {
      console.log(`  ⊘ ${name} (already applied)`);
      continue;
    }

    let sql = loadMigrationFile(name);
    sql = sql.replace(/SCHEMA_NAME/g, schema);

    const { error } = await supabase.rpc('exec_sql', { query: sql });
    if (error) die(`Migration ${name} failed: ${error.message}`);
    console.log(`  ✓ ${name}`);
    ranCount++;
  }

  if (isJson(flags)) {
    output({ status: 'ok', schema, migrations_run: ranCount }, flags);
  } else {
    if (ranCount === 0) {
      console.log(`All migrations already applied for "${schema}".`);
    } else {
      console.log(`${ranCount} migration(s) complete for "${schema}".`);
    }
  }
}

// ─── Verify Command ──────────────────────────────────────────────────────────

interface VerifyCheck {
  name: string;
  pass: boolean;
  detail?: string;
}

async function cmdVerify(flags: Record<string, string | true>): Promise<VerifyCheck[]> {
  const schema = requireFlag(flags, 'schema');
  const supabase = getSupabase();
  const checks: VerifyCheck[] = [];

  // 1. Schema exists
  const { data: schemaExists } = await supabase.rpc('exec_sql_read', {
    query: `SELECT 1 AS ok FROM information_schema.schemata WHERE schema_name = '${schema}'`,
  });
  const schemaOk = Array.isArray(schemaExists) && schemaExists.length > 0;
  checks.push({ name: 'Schema exists', pass: schemaOk });

  if (!schemaOk) {
    // Can't check anything else
    printVerifyResults(checks, schema, flags);
    return checks;
  }

  // 2. Required tables exist
  const requiredTables = ['users', 'content_models', 'content_entries', 'media', 'settings', '_migrations'];
  const { data: tables } = await supabase.rpc('exec_sql_read', {
    query: `SELECT table_name FROM information_schema.tables WHERE table_schema = '${schema}'`,
  });
  const tableSet = new Set<string>();
  if (Array.isArray(tables)) {
    for (const row of tables) {
      tableSet.add(typeof row === 'string' ? row : (row as Record<string, unknown>).table_name as string);
    }
  }
  for (const t of requiredTables) {
    checks.push({ name: `Table ${t}`, pass: tableSet.has(t) });
  }

  // 3. service_role has SELECT on schema tables
  const { data: grants } = await supabase.rpc('exec_sql_read', {
    query: `SELECT COUNT(*)::int AS cnt FROM information_schema.role_table_grants WHERE table_schema = '${schema}' AND grantee = 'service_role' AND privilege_type = 'SELECT'`,
  });
  const grantCount = Array.isArray(grants) && grants.length > 0
    ? (grants[0] as Record<string, unknown>).cnt as number
    : 0;
  checks.push({
    name: 'service_role has SELECT grants',
    pass: grantCount >= requiredTables.length,
    detail: `${grantCount} table(s) granted`,
  });

  // 4. PostgREST schema exposure
  const mgmtToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (mgmtToken) {
    const url = env('SUPABASE_URL');
    const ref = new URL(url).hostname.split('.')[0];
    try {
      const configRes = await fetch(`https://api.supabase.com/v1/projects/${ref}/postgrest`, {
        headers: { 'Authorization': `Bearer ${mgmtToken}` },
      });
      if (configRes.ok) {
        const config = await configRes.json() as Record<string, unknown>;
        const schemas = ((config.db_schema as string) || '').split(',').map((s: string) => s.trim());
        checks.push({ name: 'PostgREST schema exposed', pass: schemas.includes(schema) });
      } else {
        checks.push({ name: 'PostgREST schema exposed', pass: false, detail: `API returned ${configRes.status}` });
      }
    } catch {
      checks.push({ name: 'PostgREST schema exposed', pass: false, detail: 'Could not reach Management API' });
    }
  } else {
    checks.push({ name: 'PostgREST schema exposed', pass: false, detail: 'SUPABASE_ACCESS_TOKEN not set (skipped)' });
  }

  // 5. exec_sql and exec_sql_read functions exist
  const { data: funcs } = await supabase.rpc('exec_sql_read', {
    query: `SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name IN ('exec_sql', 'exec_sql_read')`,
  });
  const funcSet = new Set<string>();
  if (Array.isArray(funcs)) {
    for (const row of funcs) {
      funcSet.add(typeof row === 'string' ? row : (row as Record<string, unknown>).routine_name as string);
    }
  }
  checks.push({ name: 'Function exec_sql exists', pass: funcSet.has('exec_sql') });
  checks.push({ name: 'Function exec_sql_read exists', pass: funcSet.has('exec_sql_read') });

  // 6. Event trigger exists for schema
  const { data: triggers } = await supabase.rpc('exec_sql_read', {
    query: `SELECT evtname FROM pg_event_trigger WHERE evtname = 'trg_auto_grant_${schema}'`,
  });
  const triggerOk = Array.isArray(triggers) && triggers.length > 0;
  checks.push({ name: 'Event trigger exists', pass: triggerOk });

  // 7. All migrations applied
  const allMigrations = ['001_initial', '002_fix_cascade_deletes', '003_test_mode', '004_grant_roles', '005_auto_grant_event_trigger', '006_exec_sql_helpers'];
  const { data: applied } = await supabase.rpc('exec_sql_read', {
    query: `SELECT name FROM ${schema}._migrations`,
  });
  const appliedSet = new Set<string>();
  if (Array.isArray(applied)) {
    for (const row of applied) {
      appliedSet.add(typeof row === 'string' ? row : (row as Record<string, unknown>).name as string);
    }
  }
  const missingMigrations = allMigrations.filter((m) => !appliedSet.has(m));
  checks.push({
    name: 'All migrations applied',
    pass: missingMigrations.length === 0,
    detail: missingMigrations.length > 0 ? `missing: ${missingMigrations.join(', ')}` : undefined,
  });

  printVerifyResults(checks, schema, flags);
  return checks;
}

function printVerifyResults(checks: VerifyCheck[], schema: string, flags: Record<string, string | true>): void {
  if (isJson(flags)) {
    const allPass = checks.every((c) => c.pass);
    output({ status: allPass ? 'ok' : 'fail', schema, checks }, flags);
    return;
  }

  console.log(`\nVerification for "${schema}":\n`);
  for (const c of checks) {
    const icon = c.pass ? '\u2705' : '\u274C';
    const detail = c.detail ? ` (${c.detail})` : '';
    console.log(`  ${icon} ${c.name}${detail}`);
  }
  const allPass = checks.every((c) => c.pass);
  console.log(allPass ? '\nAll checks passed.' : '\nSome checks failed.');
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
  const force = flags.force === true;
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
    model.fields = parseFieldsArg(fieldsRaw, force);
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
  const force = flags.force === true;
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
  if (optionalFlag(flags, 'fields')) updates.fields = parseFieldsArg(optionalFlag(flags, 'fields')!, force);

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

  // Fetch full model (need fields for validation)
  const { data: model, error: modelErr } = await supabase
    .from('content_models')
    .select('*')
    .eq('api_identifier', apiId)
    .single();
  if (modelErr) die(`Model "${apiId}" not found: ${modelErr.message}`);

  const entry: Record<string, unknown> = {
    content_model_id: model.id,
    title,
    status: optionalFlag(flags, 'status') ?? 'draft',
    fields: {},
  };

  const fieldsRaw = optionalFlag(flags, 'fields');
  if (fieldsRaw) {
    entry.fields = parseFieldsArg(fieldsRaw);

    // Validate entry fields against model schema
    const modelFields = (model.fields || []) as Array<Record<string, unknown>>;
    if (modelFields.length > 0) {
      const errors = validateEntryFields(entry.fields as Record<string, unknown>, modelFields);
      if (errors.length > 0) {
        console.error('Entry validation failed:');
        for (const e of errors) console.error(`  • ${e}`);
        process.exit(1);
      }
    }
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

  const fieldsRaw = optionalFlag(flags, 'fields');
  if (fieldsRaw) {
    const incomingFields = parseFieldsArg(fieldsRaw);

    // Fetch the entry to get its content_model_id and existing fields for merge
    const { data: entry, error: entryErr } = await supabase
      .from('content_entries')
      .select('content_model_id, fields')
      .eq('id', id)
      .single();
    if (entryErr) die(`Entry "${id}" not found: ${entryErr.message}`);

    // Merge: existing fields as base, incoming fields override
    const existingFields = (entry.fields || {}) as Record<string, unknown>;
    updates.fields = { ...existingFields, ...incomingFields };

    const { data: model, error: modelErr } = await supabase
      .from('content_models')
      .select('*')
      .eq('id', entry.content_model_id)
      .single();
    if (modelErr) die(`Could not fetch model for entry: ${modelErr.message}`);

    const modelFields = (model.fields || []) as Array<Record<string, unknown>>;
    if (modelFields.length > 0) {
      const errors = validateEntryFields(updates.fields as Record<string, unknown>, modelFields);
      if (errors.length > 0) {
        console.error('Entry validation failed:');
        for (const e of errors) console.error(`  • ${e}`);
        process.exit(1);
      }
    }
  }

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

async function cmdEntriesTestOn(flags: Record<string, string | true>): Promise<void> {
  const schema = requireFlag(flags, 'schema');
  const id = requireFlag(flags, 'id');
  const supabase = getSupabase(schema);

  // Fetch entry
  const { data: entry, error: entryErr } = await supabase
    .from('content_entries')
    .select('*')
    .eq('id', id)
    .single();
  if (entryErr) die(`Entry not found: ${entryErr.message}`);
  if (entry.test_mode) die('Entry is already in test mode');

  // Fetch model for field definitions
  const { data: model, error: modelErr } = await supabase
    .from('content_models')
    .select('*')
    .eq('id', entry.content_model_id)
    .single();
  if (modelErr) die(`Could not fetch model: ${modelErr.message}`);

  const modelFields = (model.fields || []) as Array<Record<string, unknown>>;
  const currentFields = (entry.fields || {}) as Record<string, unknown>;

  // Import generateTestFields logic
  const { generateTestFields } = await import('../core/helpers.js');
  const testFields = generateTestFields(currentFields, modelFields as any);

  // Count modified fields
  const modifiedCount = Object.keys(testFields).filter(
    (k) => JSON.stringify(testFields[k]) !== JSON.stringify(currentFields[k])
  ).length;

  // Update entry
  const { error: updateErr } = await supabase
    .from('content_entries')
    .update({
      _snapshot: currentFields,
      fields: testFields,
      test_mode: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (updateErr) die(`Failed to enable test mode: ${updateErr.message}`);

  if (isJson(flags)) {
    output({ status: 'ok', id, test_mode: true, modified_fields: modifiedCount }, flags);
  } else {
    console.log(`✓ Test mode enabled for entry "${entry.title}" (${modifiedCount} fields modified)`);
  }
}

async function cmdEntriesTestOff(flags: Record<string, string | true>): Promise<void> {
  const schema = requireFlag(flags, 'schema');
  const id = requireFlag(flags, 'id');
  const supabase = getSupabase(schema);

  // Fetch entry
  const { data: entry, error: entryErr } = await supabase
    .from('content_entries')
    .select('*')
    .eq('id', id)
    .single();
  if (entryErr) die(`Entry not found: ${entryErr.message}`);
  if (!entry.test_mode) die('Entry is not in test mode');
  if (!entry._snapshot) die('No snapshot found — cannot restore (data loss protection)');

  // Restore
  const { error: updateErr } = await supabase
    .from('content_entries')
    .update({
      fields: entry._snapshot,
      _snapshot: null,
      test_mode: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (updateErr) die(`Failed to disable test mode: ${updateErr.message}`);

  if (isJson(flags)) {
    output({ status: 'ok', id, test_mode: false }, flags);
  } else {
    console.log(`✓ Test mode disabled for entry "${entry.title}" — original content restored`);
  }
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

// ─── Media Upload / Import Helpers ──────────────────────────────────────────

const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  avif: 'image/avif', ico: 'image/x-icon', bmp: 'image/bmp',
  tiff: 'image/tiff', tif: 'image/tiff',
  pdf: 'application/pdf', mp4: 'video/mp4', webm: 'video/webm',
};

interface R2Config {
  client: AwsClient;
  bucketName: string;
  publicUrl: string;
  accountId: string;
}

async function getR2Config(supabase: SupabaseClient, schema: string): Promise<R2Config> {
  const keys = [
    'integration_r2_account_id',
    'integration_r2_access_key_id',
    'integration_r2_secret_access_key',
    'integration_r2_bucket_name',
    'integration_r2_public_url',
  ] as const;

  const { data, error } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', [...keys]);
  if (error) die(error.message);

  const settings: Record<string, string> = {};
  for (const row of data || []) settings[row.key] = row.value;

  for (const k of keys) {
    if (!settings[k]) die(`R2 not configured: missing ${k} in ${schema}.settings`);
  }

  return {
    client: new AwsClient({
      accessKeyId: settings.integration_r2_access_key_id,
      secretAccessKey: settings.integration_r2_secret_access_key,
    }),
    bucketName: settings.integration_r2_bucket_name,
    publicUrl: settings.integration_r2_public_url,
    accountId: settings.integration_r2_account_id,
  };
}

function generateR2Key(ext: string): string {
  return `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
}

async function uploadToR2(
  r2: R2Config,
  key: string,
  body: Buffer | Uint8Array,
  mimeType: string,
): Promise<string> {
  const objectUrl = `https://${r2.accountId}.r2.cloudflarestorage.com/${r2.bucketName}/${key}`;
  const res = await r2.client.fetch(objectUrl, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    die(`R2 upload failed (${res.status}): ${text}`);
  }
  const publicUrl = r2.publicUrl.replace(/\/$/, '');
  return `${publicUrl}/${key}`;
}

async function insertMediaRecord(
  supabase: SupabaseClient,
  filename: string,
  url: string,
  mimeType: string,
  size: number,
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from('media')
    .insert({ filename, url, mime_type: mimeType, size })
    .select()
    .single();
  if (error) die(error.message);
  return data;
}

async function cmdMediaUpload(flags: Record<string, string | true>): Promise<void> {
  const schema = requireFlag(flags, 'schema');
  const filePath = requireFlag(flags, 'file');

  const resolved = resolve(filePath);
  if (!existsSync(resolved)) die(`File not found: ${resolved}`);

  const fileBuffer = readFileSync(resolved);
  const filename = basename(resolved);
  const ext = extname(filename).slice(1).toLowerCase();
  const mimeType = EXT_TO_MIME[ext];
  if (!mimeType) die(`Unknown file extension: .${ext}`);

  const supabase = getSupabase(schema);
  const r2 = await getR2Config(supabase, schema);
  const key = generateR2Key(ext);
  const url = await uploadToR2(r2, key, fileBuffer, mimeType);

  const record = await insertMediaRecord(supabase, filename, url, mimeType, fileBuffer.length);

  if (isJson(flags)) {
    output(record, flags);
  } else {
    console.log(`Uploaded "${filename}" (${fileBuffer.length} bytes, ${mimeType})`);
    console.log(`URL: ${url}`);
  }
}

async function cmdMediaImport(flags: Record<string, string | true>): Promise<void> {
  const schema = requireFlag(flags, 'schema');
  const url = requireFlag(flags, 'url');

  const res = await fetch(url);
  if (!res.ok) die(`Failed to fetch URL (${res.status}): ${url}`);

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.startsWith('image/')) {
    die(`URL content-type is "${contentType}", expected image/*`);
  }

  const arrayBuf = await res.arrayBuffer();
  const fileBuffer = new Uint8Array(arrayBuf);
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (fileBuffer.length > maxSize) {
    die(`File too large: ${fileBuffer.length} bytes (max 50MB)`);
  }

  // Extract filename from URL path, fallback to generated name
  let filename: string;
  try {
    const pathname = new URL(url).pathname;
    filename = basename(pathname);
    if (!filename || filename === '/' || !filename.includes('.')) {
      throw new Error('no usable filename');
    }
  } catch {
    const subtype = contentType.split('/')[1]?.split(';')[0] || 'bin';
    const extMap: Record<string, string> = { jpeg: 'jpg', 'svg+xml': 'svg' };
    filename = `import-${Date.now()}.${extMap[subtype] || subtype}`;
  }

  const ext = extname(filename).slice(1).toLowerCase();
  const mimeType = EXT_TO_MIME[ext] || contentType.split(';')[0].trim();

  const supabase = getSupabase(schema);
  const r2 = await getR2Config(supabase, schema);
  const key = generateR2Key(ext);
  const publicUrl = await uploadToR2(r2, key, fileBuffer, mimeType);

  const record = await insertMediaRecord(supabase, filename, publicUrl, mimeType, fileBuffer.length);

  if (isJson(flags)) {
    output(record, flags);
  } else {
    console.log(`Imported "${filename}" (${fileBuffer.length} bytes, ${mimeType})`);
    console.log(`URL: ${publicUrl}`);
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
  media      Manage media (list, delete, upload, import)
  settings   Manage CMS settings
  users      Manage CMS users
  init       Initialize a new schema
  verify     Verify schema setup is correct
  scaffold   Scaffold a new CMS client app
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
  create   --schema <name> --name <name> --api-id <id> [--description <desc>] [--icon <emoji>] [--fields <json>] [--force]
  update   --schema <name> --model <api_id> [--name <name>] [--description <desc>] [--icon <emoji>] [--fields <json>] [--force]
  delete   --schema <name> --model <api_id>

Notes:
  --fields accepts inline JSON or a path to a .json file
  Field types are validated. The json type is not allowed.
  Convention checks block long_text (use rich_text/short_text) and short_text
  fields with url/href in the name (use the url type). Pass --force to override.
  Array fields must define item_fields in options.

Flags:
  --json    Output in JSON format
  --force   Bypass soft convention checks (long_text, url-named short_text)
`.trim();

const HELP_ENTRIES = `
Usage: bullfinch-cms entries <subcommand> [flags]

Subcommands:
  list       --schema <name> --model <api_id> [--status draft|published|archived] [--limit N]
  get        --schema <name> --id <uuid>
  create     --schema <name> --model <api_id> --title <title> [--fields <json>] [--status draft|published]
  update     --schema <name> --id <uuid> [--title <title>] [--fields <json>] [--status <status>]
  delete     --schema <name> --id <uuid>
  publish    --schema <name> --id <uuid>
  unpublish  --schema <name> --id <uuid>
  test-on    --schema <name> --id <uuid>    Enable test mode (replace fields with test markers)
  test-off   --schema <name> --id <uuid>    Disable test mode (restore original content)

Notes:
  --fields accepts inline JSON or a path to a .json file
  Entry fields are validated against the model schema:
    - Unknown keys are rejected (with fuzzy-match suggestions)
    - Values are type-checked against the model's field_type definitions
    - Validation errors prevent the entry from being written

  Test mode replaces field content with test markers (111 text, placeholder images)
  to verify CMS wiring on the frontend. Original content is saved and restored
  when test mode is turned off.

Flags:
  --json    Output in JSON format
`.trim();

const HELP_MEDIA = `
Usage: bullfinch-cms media <subcommand> [flags]

Subcommands:
  list     --schema <name> [--limit N]
  delete   --schema <name> --id <uuid>
  upload   --schema <name> --file <path>       Upload a local file to R2
  import   --schema <name> --url <url>         Fetch a URL and upload to R2

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

const HELP_SCAFFOLD = `
Usage: bullfinch-cms scaffold --name <display_name> --schema <schema> --dir <output_dir>

Scaffold a new CMS client app (Vite + React + TypeScript + Tailwind).

Flags:
  --name <name>       Business display name (e.g., "Base Camp Ouray")
  --schema <schema>   CMS schema name (e.g., cms_basecamp)
  --dir <path>        Output directory (e.g., ./basecamp-cms)
  --primary <color>   Primary brand color (default: #2563eb)
  --accent <color>    Accent brand color (optional)
`.trim();

const HELP_MIGRATE = `
Usage: bullfinch-cms migrate --schema <name>

Run migrations on an existing schema.

Flags:
  --schema <name>    Schema name
  --json             Output in JSON format
`.trim();

const HELP_VERIFY = `
Usage: bullfinch-cms verify --schema <name>

Verify that a schema is correctly configured. Checks:
  - Schema exists
  - All required tables exist
  - service_role has SELECT grants
  - PostgREST schema exposure (requires SUPABASE_ACCESS_TOKEN)
  - exec_sql / exec_sql_read functions exist
  - Event trigger exists
  - All migrations applied

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

// ─── Scaffold Command ───────────────────────────────────────────────────────

async function cmdScaffold(flags: Record<string, string | true>): Promise<void> {
  const { mkdirSync, writeFileSync } = await import('fs');
  const { join } = await import('path');

  const name = requireFlag(flags, 'name');
  const schema = requireFlag(flags, 'schema');
  const dir = requireFlag(flags, 'dir');
  const primaryColor = typeof flags.primary === 'string' ? flags.primary : '#2563eb';
  const accentColor = typeof flags.accent === 'string' ? flags.accent : '';

  const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // Create directory structure
  mkdirSync(join(dir, 'src'), { recursive: true });
  mkdirSync(join(dir, 'public'), { recursive: true });

  // package.json
  writeFileSync(join(dir, 'package.json'), JSON.stringify({
    name: `${safeName}-cms`,
    private: true,
    version: '1.0.0',
    type: 'module',
    scripts: {
      dev: 'vite',
      'dev-host': 'vite --host',
      prebuild: 'npm update @bullfinch/cms',
      build: 'tsc && vite build',
      preview: 'vite preview',
    },
    dependencies: {
      '@bullfinch/cms': 'github:eczzz/bullfinch-cms#main',
      '@supabase/supabase-js': '^2.99.2',
      '@tailwindcss/vite': '^4.2.1',
      '@types/react': '^19.2.14',
      '@types/react-dom': '^19.2.3',
      '@vitejs/plugin-react': '^4.7.0',
      react: '^19.2.4',
      'react-dom': '^19.2.4',
      tailwindcss: '^4.2.1',
      typescript: '^5.9.3',
      vite: '^6.4.1',
    },
  }, null, 2) + '\n');

  // vite.config.ts
  writeFileSync(join(dir, 'vite.config.ts'), `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
  },
});
`);

  // tsconfig.json
  writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      target: 'ES2020',
      useDefineForClassFields: true,
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      module: 'ESNext',
      skipLibCheck: true,
      moduleResolution: 'bundler',
      allowImportingTsExtensions: true,
      isolatedModules: true,
      moduleDetection: 'force',
      noEmit: true,
      jsx: 'react-jsx',
      strict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      noFallthroughCasesInSwitch: true,
    },
    include: ['src'],
  }, null, 2) + '\n');

  // index.html
  writeFileSync(join(dir, 'index.html'), `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${name} CMS</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`);

  // .env.example
  writeFileSync(join(dir, '.env.example'), `VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
`);

  // .gitignore
  writeFileSync(join(dir, '.gitignore'), `node_modules
dist
.env
.env.local
`);

  // public/_redirects (Netlify SPA)
  writeFileSync(join(dir, 'public', '_redirects'), `/*    /index.html   200
`);

  // src/index.css
  writeFileSync(join(dir, 'src', 'index.css'), `@source "../node_modules/@bullfinch/cms/dist/**/*.{js,ts,jsx,tsx}";
@import "tailwindcss";
`);

  // src/main.tsx
  writeFileSync(join(dir, 'src', 'main.tsx'), `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
`);

  // src/App.tsx
  const brandingLines = [`          businessName: '${name.replace(/'/g, "\\'")}',`];
  brandingLines.push(`          primaryColor: '${primaryColor}',`);
  if (accentColor) brandingLines.push(`          accentColor: '${accentColor}',`);

  writeFileSync(join(dir, 'src', 'App.tsx'), `import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { CMSProvider, AdminPanel } from '@bullfinch/cms';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { db: { schema: '${schema}' } }
) as unknown as SupabaseClient;

export default function App() {
  return (
    <CMSProvider
      supabase={supabase}
      config={{
        branding: {
${brandingLines.join('\n')}
        },
      }}
    >
      <AdminPanel />
    </CMSProvider>
  );
}
`);

  // src/vite-env.d.ts
  writeFileSync(join(dir, 'src', 'vite-env.d.ts'), `/// <reference types="vite/client" />
`);

  console.log(`\n✅ Scaffolded "${name}" CMS app in ${dir}/`);
  console.log(`\nNext steps:`);
  console.log(`  1. cd ${dir}`);
  console.log(`  2. cp .env.example .env  (fill in your Supabase credentials)`);
  console.log(`  3. npm install`);
  console.log(`  4. npm run dev`);
  console.log(`\nFor Netlify deployment:`);
  console.log(`  - Build command: npm run build`);
  console.log(`  - Publish directory: dist`);
  console.log(`  - SPA redirects are pre-configured in public/_redirects`);
}

// ─── Router ─────────────────────────────────────────────────────────────────

const HELP_MAP: Record<string, string> = {
  schemas: HELP_SCHEMAS,
  models: HELP_MODELS,
  entries: HELP_ENTRIES,
  media: HELP_MEDIA,
  settings: HELP_SETTINGS,
  users: HELP_USERS,
  init: HELP_INIT,
  verify: HELP_VERIFY,
  scaffold: HELP_SCAFFOLD,
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
        if (subcommand === 'test-on') return await cmdEntriesTestOn(flags);
        if (subcommand === 'test-off') return await cmdEntriesTestOff(flags);
        die(`Unknown subcommand: entries ${subcommand}. Run "bullfinch-cms entries --help"`);
        break;

      // ── Media ──
      case 'media':
        if (subcommand === 'list') return await cmdMediaList(flags);
        if (subcommand === 'delete') return await cmdMediaDelete(flags);
        if (subcommand === 'upload') return await cmdMediaUpload(flags);
        if (subcommand === 'import') return await cmdMediaImport(flags);
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

      case 'verify': {
        const checks = await cmdVerify(flags);
        const allPass = checks.every((c) => c.pass);
        if (!allPass) process.exit(1);
        return;
      }

      case 'scaffold':
        return await cmdScaffold(flags);

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
