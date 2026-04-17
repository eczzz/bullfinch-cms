/**
 * supabase/functions/admin-create-user/index.ts
 *
 * Admin-gated user creation with per-tenant isolation.
 *
 * Flow:
 *   1. Verify the caller's JWT.
 *   2. Verify the caller has role = 'Admin' in the requested tenant schema.
 *   3. Look up whether an auth user with this email already exists.
 *      - If yes (user belongs to another tenant), reuse the id and skip
 *        auth.admin.createUser. The supplied password is ignored.
 *      - If no, create the auth user with email_confirm: true.
 *   4. Insert a row in {schema}.users with the chosen role. This is the
 *      only path by which a tenant users row comes into existence — no
 *      trigger, no client-side insert.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization header' }, 401);

    const {
      email,
      password,
      first_name = '',
      last_name = '',
      phone_number = '',
      role = 'Viewer',
      schema = 'public',
    } = await req.json();

    if (!email || !password) return json({ error: 'email and password are required' }, 400);
    if (password.length < 8) return json({ error: 'Password must be at least 8 characters' }, 400);
    if (!['Admin', 'Editor', 'Viewer'].includes(role)) return json({ error: 'Invalid role' }, 400);

    // 1. Verify caller
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authError } = await userClient.auth.getUser();
    if (authError || !caller) return json({ error: 'Unauthorized' }, 401);

    // 2. Verify caller is Admin in this tenant
    const tenantClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      db: { schema },
    });
    const { data: callerRow, error: roleError } = await tenantClient
      .from('users')
      .select('role')
      .eq('id', caller.id)
      .maybeSingle();

    if (roleError) {
      console.error('role lookup failed:', roleError);
      return json({ error: 'Failed to verify caller role' }, 500);
    }
    if (!callerRow || callerRow.role !== 'Admin') {
      return json({ error: 'Forbidden — admin role required' }, 403);
    }

    // 3. Look up or create the auth user
    const publicClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: existingId, error: lookupError } = await publicClient
      .rpc('find_auth_user_id', { p_email: email });

    if (lookupError) {
      console.error('find_auth_user_id failed:', lookupError);
      return json({ error: 'Failed to look up existing user' }, 500);
    }

    let userId: string;
    if (existingId) {
      userId = existingId as string;
    } else {
      const { data: created, error: createError } = await publicClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (createError || !created.user) {
        const msg = createError?.message || 'Failed to create auth user';
        const status = /already|registered|exists/i.test(msg) ? 409 : 400;
        return json({ error: msg }, status);
      }
      userId = created.user.id;
    }

    // 4. Ensure the tenant users row exists with the chosen role.
    //    If they were already a member of this tenant, block the invite —
    //    the admin should be editing, not re-inviting.
    const { data: alreadyMember } = await tenantClient
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (alreadyMember) {
      return json({ error: 'User is already a member of this workspace' }, 409);
    }

    const { error: insertError } = await tenantClient.from('users').insert({
      id: userId,
      email,
      first_name,
      last_name,
      phone_number,
      role,
    });

    if (insertError) {
      console.error('tenant users insert failed:', insertError);
      return json({ error: insertError.message || 'Failed to add user to workspace' }, 500);
    }

    return json({ user: { id: userId, email } }, 201);
  } catch (err) {
    console.error('admin-create-user error:', err);
    return json({ error: 'Internal server error' }, 500);
  }
});
