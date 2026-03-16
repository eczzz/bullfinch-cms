import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ContentModel,
  ContentEntry,
  MediaItem,
  User,
  EntryStatus,
  SEOData,
} from './types';

// ─── Content Models ─────────────────────────────────────────────────────────

export async function fetchContentModels(supabase: SupabaseClient): Promise<ContentModel[]> {
  const { data, error } = await supabase
    .from('content_models')
    .select('*')
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function fetchContentModel(
  supabase: SupabaseClient,
  id: string
): Promise<ContentModel | null> {
  const { data, error } = await supabase
    .from('content_models')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createContentModel(
  supabase: SupabaseClient,
  model: Partial<ContentModel>
): Promise<ContentModel> {
  const { data, error } = await supabase
    .from('content_models')
    .insert(model)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateContentModel(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<ContentModel>
): Promise<ContentModel> {
  const { data, error } = await supabase
    .from('content_models')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteContentModel(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from('content_models')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ─── Content Entries ────────────────────────────────────────────────────────

export async function fetchContentEntries(
  supabase: SupabaseClient,
  modelId: string
): Promise<ContentEntry[]> {
  const { data, error } = await supabase
    .from('content_entries')
    .select('*')
    .eq('content_model_id', modelId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchAllContentEntries(
  supabase: SupabaseClient
): Promise<ContentEntry[]> {
  const { data, error } = await supabase
    .from('content_entries')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchContentEntry(
  supabase: SupabaseClient,
  id: string
): Promise<ContentEntry | null> {
  const { data, error } = await supabase
    .from('content_entries')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createContentEntry(
  supabase: SupabaseClient,
  entry: Partial<ContentEntry>
): Promise<ContentEntry> {
  const { data, error } = await supabase
    .from('content_entries')
    .insert(entry)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateContentEntry(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<ContentEntry>
): Promise<ContentEntry> {
  const { data, error } = await supabase
    .from('content_entries')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteContentEntry(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from('content_entries')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function updateEntryStatus(
  supabase: SupabaseClient,
  id: string,
  status: EntryStatus
): Promise<void> {
  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === 'published') {
    updates.published_at = new Date().toISOString();
  }
  const { error } = await supabase
    .from('content_entries')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
}

export async function updateEntrySEO(
  supabase: SupabaseClient,
  id: string,
  seo: SEOData
): Promise<void> {
  const { error } = await supabase
    .from('content_entries')
    .update({ seo, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ─── Media ──────────────────────────────────────────────────────────────────

export async function fetchMedia(supabase: SupabaseClient): Promise<MediaItem[]> {
  const { data, error } = await supabase
    .from('media')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createMediaRecord(
  supabase: SupabaseClient,
  media: Partial<MediaItem>
): Promise<MediaItem> {
  const { data, error } = await supabase
    .from('media')
    .insert(media)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMediaRecord(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from('media')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ─── Users ──────────────────────────────────────────────────────────────────

export async function fetchUsers(supabase: SupabaseClient): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchCurrentUser(supabase: SupabaseClient): Promise<User | null> {
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return null;

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();
  if (error) return null;
  return data;
}

export async function updateUser(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<User>
): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
