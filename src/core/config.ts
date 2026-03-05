import type { SupabaseClient } from '@supabase/supabase-js';
import type { BrandingConfig, Setting } from './types';

// ─── Default Branding ───────────────────────────────────────────────────────

export const DEFAULT_BRANDING: BrandingConfig = {
  businessName: 'CMS',
  primaryColor: '#2563eb',
  accentColor: '#7c3aed',
};

// ─── Settings Helpers ───────────────────────────────────────────────────────

export async function loadSettings(supabase: SupabaseClient): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .order('key');

  if (error) throw error;

  const settings: Record<string, string> = {};
  for (const s of (data as Setting[]) || []) {
    settings[s.key] = s.value;
  }
  return settings;
}

export async function saveSetting(
  supabase: SupabaseClient,
  key: string,
  value: string
): Promise<void> {
  const { error } = await supabase
    .from('settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

  if (error) throw error;
}

export async function saveSettings(
  supabase: SupabaseClient,
  settings: Record<string, string>
): Promise<void> {
  const rows = Object.entries(settings).map(([key, value]) => ({
    key,
    value,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('settings')
    .upsert(rows, { onConflict: 'key' });

  if (error) throw error;
}
