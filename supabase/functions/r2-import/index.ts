// supabase/functions/r2-import/index.ts
// Edge function that fetches an image from a URL and uploads it to R2.
// Reads R2 credentials from the settings table, verifies auth via Supabase JWT.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
  'image/tiff': 'tiff',
  'image/bmp': 'bmp',
  'image/x-icon': 'ico',
};

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function extractFilename(url: string, contentType: string): string {
  try {
    const pathname = new URL(url).pathname;
    const basename = pathname.split('/').pop() || '';
    // If the URL path has a reasonable filename with extension, use it
    if (basename && /\.\w{2,5}$/.test(basename)) {
      return basename;
    }
  } catch {
    // ignore URL parse errors
  }
  // Fall back to generating a name from the content type
  const ext = MIME_TO_EXT[contentType] || 'bin';
  return `imported-${Date.now()}.${ext}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify the user's JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization header' }, 401);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    // Parse request body
    const { url, schema = 'public' } = await req.json();

    if (!url || typeof url !== 'string') {
      return jsonResponse({ error: 'Missing or invalid URL' }, 400);
    }

    // Fetch the image
    let fetchRes: Response;
    try {
      fetchRes = await fetch(url);
    } catch {
      return jsonResponse({ error: 'Failed to fetch URL. Check that the URL is accessible.' }, 400);
    }

    if (!fetchRes.ok) {
      return jsonResponse({ error: `URL returned HTTP ${fetchRes.status}` }, 400);
    }

    const contentType = fetchRes.headers.get('content-type')?.split(';')[0]?.trim() || '';
    if (!contentType.startsWith('image/')) {
      return jsonResponse({ error: `URL is not an image (content-type: ${contentType || 'unknown'})` }, 400);
    }

    const contentLength = fetchRes.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_SIZE) {
      return jsonResponse({ error: 'Image exceeds 50MB size limit' }, 400);
    }

    const body = await fetchRes.arrayBuffer();
    if (body.byteLength > MAX_SIZE) {
      return jsonResponse({ error: 'Image exceeds 50MB size limit' }, 400);
    }

    // Read R2 credentials from settings
    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      db: { schema },
    });

    const { data: settings, error: settingsError } = await serviceClient
      .from('settings')
      .select('key, value')
      .in('key', [
        'integration_r2_account_id',
        'integration_r2_access_key_id',
        'integration_r2_secret_access_key',
        'integration_r2_bucket_name',
        'integration_r2_public_url',
      ]);

    if (settingsError) {
      console.error('Failed to read settings:', settingsError);
      return jsonResponse({ error: 'Failed to read R2 settings' }, 500);
    }

    const settingsMap: Record<string, string> = {};
    for (const s of settings || []) {
      settingsMap[s.key] = s.value;
    }

    const r2AccountId = settingsMap['integration_r2_account_id'];
    const r2AccessKeyId = settingsMap['integration_r2_access_key_id'];
    const r2SecretAccessKey = settingsMap['integration_r2_secret_access_key'];
    const r2BucketName = settingsMap['integration_r2_bucket_name'];
    const r2PublicUrl = settingsMap['integration_r2_public_url'];

    if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey || !r2BucketName || !r2PublicUrl) {
      return jsonResponse({ error: 'R2 credentials not configured. Check Settings → Integrations.' }, 400);
    }

    // Upload to R2
    const client = new AwsClient({
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey,
      region: 'auto',
      service: 's3',
    });

    const filename = extractFilename(url, contentType);
    const ext = filename.split('.').pop() || 'bin';
    const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const r2Endpoint = `https://${r2AccountId}.r2.cloudflarestorage.com`;
    const objectUrl = `${r2Endpoint}/${r2BucketName}/${key}`;

    const uploadRes = await client.fetch(objectUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: new Uint8Array(body),
    });

    if (!uploadRes.ok) {
      console.error('R2 upload failed:', uploadRes.status, await uploadRes.text());
      return jsonResponse({ error: 'Failed to upload to R2' }, 500);
    }

    const normalizedPublicUrl = r2PublicUrl.replace(/\/+$/, '');

    return jsonResponse({
      publicUrl: `${normalizedPublicUrl}/${key}`,
      filename,
      mimeType: contentType,
      size: body.byteLength,
    }, 200);
  } catch (err) {
    console.error('r2-import error:', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
