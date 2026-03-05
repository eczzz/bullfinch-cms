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
