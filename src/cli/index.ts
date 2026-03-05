#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Helpers ────────────────────────────────────────────────────────────────

function env(key: string): string {
  const val = process.env[key];
  if (!val) {
    console.error(`❌ Missing environment variable: ${key}`);
    process.exit(1);
  }
  return val;
}

function getSupabase() {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function loadMigration(): string {
  // Look for migration SQL relative to package
  const paths = [
    resolve(__dirname, '../schema/migrations/001_initial.sql'),
    resolve(__dirname, '../../src/schema/migrations/001_initial.sql'),
  ];
  for (const p of paths) {
    try {
      return readFileSync(p, 'utf-8');
    } catch { /* try next */ }
  }
  console.error('❌ Could not find migration SQL file');
  process.exit(1);
}

// ─── Commands ───────────────────────────────────────────────────────────────

async function init(schema: string, name: string) {
  console.log(`🚀 Initializing schema "${schema}" for "${name}"...`);
  const supabase = getSupabase();

  // Load and prepare migration SQL
  let sql = loadMigration();
  sql = sql.replace(/SCHEMA_NAME/g, schema);

  // Execute via rpc (requires a helper function or direct pg access)
  // Using supabase.rpc won't work for DDL — we need the Management API or pg directly
  // For now, output the SQL for manual execution
  const { error } = await supabase.rpc('exec_sql', { query: sql });

  if (error) {
    // If exec_sql doesn't exist, fall back to printing instructions
    if (error.message.includes('exec_sql') || error.code === '42883') {
      console.log('\n⚠️  No exec_sql function found. Run this SQL manually in your Supabase SQL Editor:\n');
      console.log('-- Create the exec_sql helper first:');
      console.log(`CREATE OR REPLACE FUNCTION exec_sql(query text) RETURNS void AS $$`);
      console.log(`BEGIN EXECUTE query; END; $$ LANGUAGE plpgsql SECURITY DEFINER;`);
      console.log('\n-- Then run the migration:');
      console.log(sql);
      console.log(`\n-- Seed business name:`);
      console.log(`INSERT INTO ${schema}.settings (key, value) VALUES ('branding_business_name', '${name.replace(/'/g, "''")}') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;`);
    } else {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    }
    return;
  }

  // Seed the business name
  const { error: seedError } = await supabase.rpc('exec_sql', {
    query: `INSERT INTO ${schema}.settings (key, value) VALUES ('branding_business_name', '${name.replace(/'/g, "''")}') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;`,
  });

  if (seedError) {
    console.warn('⚠️  Could not seed business name:', seedError.message);
  }

  console.log(`✅ Schema "${schema}" initialized successfully!`);
  console.log(`\n📋 Next steps:`);
  console.log(`   1. Create a Supabase client with: { db: { schema: '${schema}' } }`);
  console.log(`   2. Create an admin user in Supabase Auth`);
  console.log(`   3. Mount <CMSProvider> and <AdminPanel> in your app`);
}

async function migrate(schema: string) {
  console.log(`📦 Running migrations for schema "${schema}"...`);
  // For v1, migration = re-run init (idempotent with IF NOT EXISTS)
  await init(schema, '');
}

function exportSchema(schema: string, output: string) {
  console.log(`📤 Export command for schema "${schema}":\n`);
  const url = env('SUPABASE_URL');
  // Extract host from URL for pg_dump
  const host = new URL(url).hostname;
  const ref = host.split('.')[0];
  console.log(`pg_dump "postgresql://postgres:[SERVICE_ROLE_KEY]@db.${ref}.supabase.co:5432/postgres" \\`);
  console.log(`  --schema=${schema} \\`);
  console.log(`  --no-owner \\`);
  console.log(`  --no-privileges \\`);
  console.log(`  -f ${output}`);
  console.log(`\nReplace [SERVICE_ROLE_KEY] with your database password.`);
}

// ─── CLI Router ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const command = args[0];

function getFlag(name: string): string {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= args.length) {
    console.error(`❌ Missing required flag: --${name}`);
    process.exit(1);
  }
  return args[idx + 1];
}

function getFlagOptional(name: string, defaultVal: string): string {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= args.length) return defaultVal;
  return args[idx + 1];
}

switch (command) {
  case 'init':
    init(getFlag('schema'), getFlag('name'));
    break;
  case 'migrate':
    migrate(getFlag('schema'));
    break;
  case 'export':
    exportSchema(getFlag('schema'), getFlagOptional('output', './backup.sql'));
    break;
  default:
    console.log(`
@bullfinch/cms CLI

Commands:
  init     --schema <name> --name <display_name>   Initialize a new client schema
  migrate  --schema <name>                          Run migrations on existing schema
  export   --schema <name> [--output <file>]        Export client data for offboarding

Environment variables:
  SUPABASE_URL              Your Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY Your Supabase service role key
`);
}
