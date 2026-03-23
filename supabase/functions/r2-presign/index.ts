// supabase/functions/r2-presign/index.ts
// Edge function that generates presigned PUT URLs for Cloudflare R2 uploads.
// Reads R2 credentials from the settings table, verifies auth via Supabase JWT.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify the user's JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const { filename, contentType, schema = 'public' } = await req.json();

    if (!filename || !contentType) {
      return new Response(JSON.stringify({ error: 'Missing filename or contentType' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Read R2 credentials from settings using service role (bypasses RLS)
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
      return new Response(JSON.stringify({ error: 'Failed to read R2 settings' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
      return new Response(JSON.stringify({ error: 'R2 credentials not configured. Check Settings → Integrations.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate presigned URL using aws4fetch
    const client = new AwsClient({
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey,
      region: 'auto',
      service: 's3',
    });

    const ext = filename.split('.').pop() || 'bin';
    const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const r2Endpoint = `https://${r2AccountId}.r2.cloudflarestorage.com`;
    const objectUrl = `${r2Endpoint}/${r2BucketName}/${key}`;

    const signed = await client.sign(
      new Request(objectUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
      }),
      { aws: { signQuery: true, allHeaders: true } }
    );

    // Normalize the public URL (strip trailing slash if present)
    const normalizedPublicUrl = r2PublicUrl.replace(/\/+$/, '');

    return new Response(
      JSON.stringify({
        presignedUrl: signed.url,
        publicUrl: `${normalizedPublicUrl}/${key}`,
        filename: key,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('r2-presign error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
