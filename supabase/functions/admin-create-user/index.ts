// supabase/functions/admin-create-user/index.ts
// Admin-gated user creation. Verifies the caller is an Admin in the given
// tenant schema, then uses the service role to create an auth user with
// auto-confirmed email. The tenant's `users` row is populated by the
// `handle_new_auth_user` trigger via user_metadata.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Role = 'Admin' | 'Editor' | 'Viewer';

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

    // 1. Verify caller is authenticated
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authError } = await userClient.auth.getUser();
    if (authError || !caller) return json({ error: 'Unauthorized' }, 401);

    // 2. Verify caller is an Admin in the requested tenant schema
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      db: { schema },
    });
    const { data: callerRow, error: roleError } = await adminClient
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

    // 3. Create the auth user (auto-confirmed, no email sent)
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name, last_name, role: role as Role },
    });

    if (createError || !created.user) {
      const msg = createError?.message || 'Failed to create user';
      const status = /already|registered|exists/i.test(msg) ? 409 : 400;
      return json({ error: msg }, status);
    }

    // 4. phone_number isn't part of user_metadata / trigger, so patch the row.
    //    The trigger already inserted the users row with first_name/last_name/role.
    if (phone_number) {
      const { error: updateError } = await adminClient
        .from('users')
        .update({ phone_number })
        .eq('id', created.user.id);
      if (updateError) console.error('phone_number patch failed:', updateError);
    }

    return json({ user: { id: created.user.id, email: created.user.email } }, 201);
  } catch (err) {
    console.error('admin-create-user error:', err);
    return json({ error: 'Internal server error' }, 500);
  }
});
