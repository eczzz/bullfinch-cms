import type { SupabaseClient } from '@supabase/supabase-js';
import type { StorageAdapter } from './types';

/**
 * Default Supabase Storage adapter.
 * Uses Supabase's built-in storage buckets.
 */
export function createSupabaseStorageAdapter(
  supabase: any,
  bucket: string = 'media'
): StorageAdapter {
  return {
    async upload(file: File) {
      const ext = file.name.split('.').pop() || 'bin';
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const path = `uploads/${filename}`;

      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { contentType: file.type });

      if (error) throw error;

      const { data } = supabase.storage.from(bucket).getPublicUrl(path);

      return { url: data.publicUrl, filename };
    },
    async delete(url: string) {
      const path = url.split(`/storage/v1/object/public/${bucket}/`).pop();
      if (path) {
        await supabase.storage.from(bucket).remove([path]);
      }
    },
  };
}

/**
 * R2/S3-compatible presigned URL storage adapter.
 * For use with Cloudflare R2, AWS S3, etc.
 */
export function createPresignedUrlStorageAdapter(config: {
  getPresignedUrl: (filename: string, contentType: string) => Promise<{
    presignedUrl: string;
    publicUrl: string;
    filename: string;
  }>;
}): StorageAdapter {
  return {
    async upload(file: File) {
      const { presignedUrl, publicUrl, filename } = await config.getPresignedUrl(
        file.name,
        file.type
      );

      await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      return { url: publicUrl, filename };
    },
    getPresignedUrl: config.getPresignedUrl,
  };
}

/**
 * Creates an R2 storage adapter that uses a Supabase Edge Function for presigning.
 * Automatically used when R2 settings are detected in the settings table.
 *
 * @param supabase - Supabase client (used to get the current session token)
 * @param supabaseUrl - The Supabase project URL (e.g. https://xyz.supabase.co)
 * @param schema - The DB schema the CMS instance uses (default: 'public')
 */
export function createR2StorageAdapter(
  supabase: SupabaseClient,
  schema?: string
): StorageAdapter {
  return {
    async upload(file: File) {
      // Use the Supabase client's functions.invoke() which handles
      // auth headers (Authorization + apikey) automatically
      const { data, error } = await supabase.functions.invoke('r2-presign', {
        body: {
          filename: file.name,
          contentType: file.type,
          schema: schema || 'public',
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to get presigned URL');
      }

      const { presignedUrl, publicUrl, filename } = data;

      // Upload directly to R2 via the presigned URL
      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!uploadRes.ok) {
        throw new Error(`R2 upload failed: ${uploadRes.status}`);
      }

      return { url: publicUrl, filename };
    },

    async importFromUrl(url: string) {
      const { data, error } = await supabase.functions.invoke('r2-import', {
        body: { url, schema: schema || 'public' },
      });

      if (error) {
        throw new Error(error.message || 'Failed to import from URL');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return {
        url: data.publicUrl,
        filename: data.filename,
        mimeType: data.mimeType,
        size: data.size,
      };
    },
  };
}

/**
 * Checks if R2 integration settings are present in a settings map.
 */
export function hasR2Settings(settings: Record<string, string>): boolean {
  return !!(
    settings['integration_r2_account_id'] &&
    settings['integration_r2_access_key_id'] &&
    settings['integration_r2_secret_access_key'] &&
    settings['integration_r2_bucket_name'] &&
    settings['integration_r2_public_url']
  );
}
