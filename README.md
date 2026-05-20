# @bullfinch/cms

A multi-tenant CMS built on **React** + **Supabase** with schema-based isolation. One Supabase project hosts all your clients. Each client gets their own Postgres schema — fully isolated data, shared infrastructure, easy offboarding.

---

## Table of Contents

- [Why This Exists](#why-this-exists)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Setup Guide](#setup-guide)
  - [1. Create a Supabase Project](#1-create-a-supabase-project)
  - [2. Initialize a Client Schema](#2-initialize-a-client-schema)
  - [3. Create an Admin User](#3-create-an-admin-user)
  - [4. Create a Client App](#4-create-a-client-app)
  - [5. Configure Storage](#5-configure-storage)
- [Adding More Clients](#adding-more-clients)
- [Content Models](#content-models)
  - [Built-in Field Types](#built-in-field-types)
  - [Creating Models Programmatically](#creating-models-programmatically)
- [Configuration Reference](#configuration-reference)
  - [CMSProvider Props](#cmsprovider-props)
  - [Branding](#branding)
  - [Storage Adapters](#storage-adapters)
  - [Hooks](#hooks)
  - [Custom Field Types](#custom-field-types)
  - [Custom Sidebar Items](#custom-sidebar-items)
  - [Sidebar Sections (reorder, rename, roles)](#sidebar-sections-reorder-rename-roles)
- [Consuming Content (Frontend)](#consuming-content-frontend)
- [User Roles](#user-roles)
- [Offboarding a Client](#offboarding-a-client)
- [CLI Reference](#cli-reference)
- [Project Structure](#project-structure)
- [Development](#development)
- [Troubleshooting](#troubleshooting)

---

## Why This Exists

We were running a separate Supabase project ($10/month each) for every client CMS — even clients with 10 pages of content. This package consolidates all clients into one Supabase project using Postgres schemas for isolation, and provides a drop-in React admin panel.

**Before:** 10 clients = 10 Supabase projects = $100/month  
**After:** 10 clients = 1 Supabase project = $10/month

Each client still gets complete data isolation, and offboarding is a single `pg_dump` command.

---

## Architecture

```
your-supabase-project ($10/month)
├── cms_basecamp        ← Base Camp Ouray
├── cms_lighthouse      ← Lighthouse Therapeutics  
├── cms_badass          ← Badass Garage
├── cms_finney          ← Dr. Finney
└── ...                 ← Add as many as you need
```

Each schema contains identical tables:
- `content_models` — defines content types (like "Homepage", "Service Page", "Team Member")
- `content_entries` — actual content instances with JSON fields
- `media` — uploaded file metadata
- `users` — user profiles with role-based access
- `settings` — key/value config (branding, site name, etc.)
- `_migrations` — tracks which migrations have been applied

**Key design decisions:**
- **No hardcoded page types.** Everything is a content model. "Pages", "Posts", "Services" are all just models you define.
- **No setup wizard.** Schema initialization happens via CLI. Users see the dashboard on first login, not a wizard.
- **Supabase client is injectable.** The package never creates its own — you pass it in.
- **Tailwind for styling.** All components use Tailwind classes. Your app provides Tailwind.

---

## Prerequisites

- **Node.js** ≥ 18
- **A Supabase project** (Pro plan recommended for production, Free tier works for dev)
- **A React app** (Vite recommended, Next.js and Remix also work)
- **Tailwind CSS** configured in your app

---

## Installation

```bash
npm install @bullfinch/cms
```

Peer dependencies (install if you don't have them):

```bash
npm install react react-dom @supabase/supabase-js
```

---

## Setup Guide

### 1. Create a Supabase Project

If you don't already have a shared CMS project:

1. Go to [supabase.com](https://supabase.com) → New Project
2. Name it something like `bullfinch-cms` or `client-cms`
3. Save your **Project URL** and **Service Role Key** (Settings → API)
4. Save your **Anon Key** too (this is what client apps use)

> **Important:** The Service Role Key is only used by the CLI for schema setup. Client apps use the Anon Key.

### 2. Initialize a Client Schema

Set your environment variables:

```bash
export SUPABASE_URL="https://xxxxx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJI..."
```

Run the init command:

```bash
npx @bullfinch/cms init --schema cms_basecamp --name "Base Camp Ouray"
```

This creates the schema and all tables, then automatically runs `verify` to confirm everything is set up correctly. If the `exec_sql` database function doesn't exist yet, the CLI will output the SQL for you to paste into the **Supabase SQL Editor** (Dashboard → SQL Editor → New Query).

> **Schema naming convention:** We use `cms_` prefix + a short identifier. Examples: `cms_basecamp`, `cms_lighthouse`, `cms_badass`. Keep it lowercase, underscores only.

#### First-Time Setup: Create the exec_sql Helper

For the CLI to run migrations directly, create this function once in your Supabase SQL Editor:

```sql
CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS void AS $$
BEGIN EXECUTE query; END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

After this, `npx @bullfinch/cms init` will work automatically for all future clients.

### 3. Create an Admin User

The CMS uses Supabase Auth. Create the first admin user:

**Option A: Supabase Dashboard**
1. Go to Authentication → Users → Add User
2. Enter email and password
3. The trigger in the migration will auto-create a user record with `Viewer` role
4. Promote to Admin via SQL Editor:
   ```sql
   UPDATE cms_basecamp.users SET role = 'Admin' WHERE email = 'admin@example.com';
   ```

**Option B: Via Supabase client (in a script)**
```ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  db: { schema: 'cms_basecamp' },
  auth: { autoRefreshToken: false, persistSession: false },
});

// Create auth user
const { data, error } = await supabase.auth.admin.createUser({
  email: 'admin@basecampouray.com',
  password: 'secure-password-here',
  email_confirm: true,
  user_metadata: { first_name: 'Admin', last_name: 'User', role: 'Admin' },
});
```

### 4. Create a Client App

Each client gets their own small app (or you can use a single app with dynamic schema selection). Here's the minimal setup:

#### Create the app

```bash
npm create vite@latest basecamp-cms -- --template react-ts
cd basecamp-cms
npm install @bullfinch/cms @supabase/supabase-js
npm install -D tailwindcss @tailwindcss/vite
```

#### Configure Tailwind (`tailwind.config.js`)

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './node_modules/@bullfinch/cms/dist/**/*.{js,ts,jsx,tsx}', // Include CMS components
  ],
  theme: { extend: {} },
  plugins: [],
};
```

#### Environment variables (`.env`)

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJI...
VITE_CMS_SCHEMA=cms_basecamp
```

#### Main app (`src/App.tsx`)

```tsx
import { createClient } from '@supabase/supabase-js';
import { CMSProvider, AdminPanel } from '@bullfinch/cms';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { db: { schema: import.meta.env.VITE_CMS_SCHEMA } }
);

function App() {
  return (
    <CMSProvider
      supabase={supabase}
      config={{
        branding: {
          businessName: 'Base Camp Ouray',
          primaryColor: '#224059',
          accentColor: '#FFC844',
          logoUrl: '/logo.png',
        },
      }}
    >
      <AdminPanel />
    </CMSProvider>
  );
}

export default App;
```

#### Run it

```bash
npm run dev
```

Visit `http://localhost:5173`, log in with the admin user you created, and you're in. No wizard. Just the dashboard.

### 5. Configure Storage

Media uploads need a storage backend. Two options:

#### Option A: Supabase Storage (simplest)

1. In Supabase Dashboard → Storage → Create Bucket → Name it `media`, make it **public**
2. In your app:

```tsx
import { createSupabaseStorageAdapter } from '@bullfinch/cms';

<CMSProvider
  supabase={supabase}
  config={{
    storage: createSupabaseStorageAdapter(supabase, 'media'),
    branding: { businessName: 'Base Camp Ouray' },
  }}
>
```

#### Option B: Cloudflare R2 / AWS S3 (presigned URLs)

```tsx
import { createPresignedUrlStorageAdapter } from '@bullfinch/cms';

<CMSProvider
  supabase={supabase}
  config={{
    storage: createPresignedUrlStorageAdapter({
      getPresignedUrl: async (filename, contentType) => {
        // Call your backend endpoint that generates presigned URLs
        const res = await fetch('/api/presigned-url', {
          method: 'POST',
          body: JSON.stringify({ filename, contentType }),
        });
        return res.json();
        // Expected: { presignedUrl, publicUrl, filename }
      },
    }),
    branding: { businessName: 'Base Camp Ouray' },
  }}
>
```

### 6. Deploy the `admin-create-user` Edge Function

Inviting users from the CMS admin panel calls a Supabase Edge Function that creates auth users with the service role key. Supabase projects have public signups disabled by default, so this function is required.

```bash
# From a checkout of @bullfinch/cms
supabase link --project-ref <your-project-ref>
supabase functions deploy admin-create-user
```

No secrets to set — the function uses the automatically-injected `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. It verifies the caller's JWT and checks that they have the `Admin` role in the tenant schema before creating the user. New users are created with `email_confirm: true` (no verification email sent).

---

## Adding More Clients

It's the same steps every time:

```bash
# 1. Create their schema
npx @bullfinch/cms init --schema cms_newclient --name "New Client Inc"

# 2. Scaffold their CMS app
npx @bullfinch/cms scaffold --name "New Client Inc" --schema cms_newclient --dir ./newclient-cms

# 3. Configure and deploy
cd newclient-cms
cp .env.example .env   # Fill in Supabase credentials
npm install
npm run dev

# 4. Create their admin user (via Dashboard or script)
```

The `scaffold` command generates a complete, deploy-ready CMS app with all common issues pre-solved:
- Tailwind `@source` directive for CMS component classes
- `resolve.dedupe` in Vite config to prevent dual React
- Netlify `_redirects` for SPA routing
- Branding config with business name and colors

**Options:**
```bash
npx @bullfinch/cms scaffold \
  --name "New Client Inc" \
  --schema cms_newclient \
  --dir ./newclient-cms \
  --primary "#224059" \
  --accent "#FFC844"
```

Alternatively:
- **Single app, dynamic schema:** Use a subdomain or URL param to select the schema at runtime

### Dynamic Schema Example

```tsx
// Determine schema from subdomain: basecamp.cms.bullfinch.io → cms_basecamp
const subdomain = window.location.hostname.split('.')[0];
const schema = `cms_${subdomain}`;

const supabase = createClient(url, key, { db: { schema } });
```

---

## Content Models

Content models define the structure of your content. Instead of hardcoded "Pages" or "Posts" tables, everything is a model you define.

### Example Models

| Model | Use Case |
|-------|----------|
| `homepage` | Single homepage with hero, features, CTA sections |
| `service_page` | Service pages with title, description, pricing |
| `team_member` | Team bios with photo, name, role, bio |
| `blog_post` | Blog with title, content, featured image, excerpt |
| `testimonial` | Client quotes with name, company, text |
| `faq` | FAQ items with question and answer |

### Built-in Field Types

| Type | Description | Example Use |
|------|-------------|-------------|
| `short_text` | Single-line text input | Titles, names, labels |
| `long_text` | Multi-line textarea (⚠️ prefer `rich_text`) | Legacy — use `rich_text` for body copy |
| `rich_text` | TipTap WYSIWYG editor | Body content, bios |
| `number` | Numeric input | Prices, sort order |
| `boolean` | Toggle switch | Featured flag, visibility |
| `date` | Date picker | Publish date, event date |
| `datetime` | Date + time picker | Event start times |
| `media` | Image/file picker (opens media library) | Hero images, thumbnails |
| `reference` | Link to another content entry | Related posts, parent page |
| `array` | Repeatable group of sub-fields | Feature lists, gallery items |
| `button` | Link with text + URL | CTAs, navigation links |
| `select` | Dropdown with predefined choices | Categories, status |
| `color` | Color picker | Theme colors |
| `url` | URL input with validation | External links |
| `email` | Email input with validation | Contact emails |
| `slug` | URL-friendly identifier | Page slugs |
| ~~`json`~~ | **Removed** — use `array` with `item_fields` | N/A |

### Creating Models Programmatically

You can create models via the admin UI, the CLI (recommended), or directly via Supabase:

**Via CLI (recommended):**

```bash
# Write fields to a JSON file
cat > /tmp/blog-fields.json << 'EOF'
[
  {"name": "Excerpt", "api_identifier": "excerpt", "field_type": "rich_text", "required": true},
  {"name": "Body", "api_identifier": "body", "field_type": "rich_text", "required": true},
  {"name": "Featured Image", "api_identifier": "featured_image", "field_type": "media"},
  {"name": "Published", "api_identifier": "published", "field_type": "boolean"}
]
EOF

npx @bullfinch/cms models create --schema cms_acme \
  --name "Blog Post" --api-id blog_post --fields /tmp/blog-fields.json
```

The CLI validates field types, enforces conventions, and auto-generates UUIDs for field IDs.

**Via Supabase client (when needed):**

```ts
import { createContentModel } from '@bullfinch/cms';

await createContentModel(supabase, {
  name: 'Blog Post',
  api_identifier: 'blog_post',
  description: 'Blog articles',
  icon: '📝',
  fields: [
    {
      id: crypto.randomUUID(),
      name: 'Excerpt',
      api_identifier: 'excerpt',
      field_type: 'rich_text',
      required: true,
    },
    {
      id: crypto.randomUUID(),
      name: 'Body',
      api_identifier: 'body',
      field_type: 'rich_text',
      required: true,
    },
    {
      id: crypto.randomUUID(),
      name: 'Featured Image',
      api_identifier: 'featured_image',
      field_type: 'media',
    },
    {
      id: crypto.randomUUID(),
      name: 'Published',
      api_identifier: 'published',
      field_type: 'boolean',
      default_value: 'false',
    },
  ],
  created_by: userId,
});
```

---

## Configuration Reference

### CMSProvider Props

```tsx
<CMSProvider
  supabase={supabaseClient}  // Required: Supabase client with schema set
  config={{                    // Optional: all fields below are optional
    branding: { ... },
    storage: storageAdapter,
    hooks: { ... },
    customFieldTypes: { ... },
    sidebarItems: [ ... ],
    basePath: '/admin',
  }}
>
  <AdminPanel />
</CMSProvider>
```

### Branding

```tsx
config={{
  branding: {
    businessName: 'Acme Corp',     // Shown in sidebar header + page title
    logoUrl: '/logo.png',          // Sidebar logo (centered when expanded)
    iconUrl: '/icon.png',          // Sidebar icon (shown when collapsed)
    faviconUrl: '/favicon.ico',    // Browser tab icon
    primaryColor: '#2563eb',       // Default icon background color
    accentColor: '#7c3aed',        // Buttons, active nav states, toggles, tabs
    sidebarBg: '#111827',          // Sidebar background color
    sidebarText: '#ffffff',        // Sidebar text color (full opacity)
  }
}}
```

> **Note:** Branding can also be configured from the Settings → Branding panel in the UI. Database settings override config props. The accent color drives all interactive elements: buttons, active sidebar items, settings tabs, toggles, and selection indicators.

### Storage Adapters

Two built-in adapters:

```tsx
import { createSupabaseStorageAdapter, createPresignedUrlStorageAdapter } from '@bullfinch/cms';

// Supabase Storage
createSupabaseStorageAdapter(supabase, 'bucket-name')

// R2/S3 presigned URLs
createPresignedUrlStorageAdapter({
  getPresignedUrl: async (filename, contentType) => ({
    presignedUrl: '...',
    publicUrl: '...',
    filename: '...',
  }),
})
```

Or implement your own:

```tsx
const myAdapter: StorageAdapter = {
  async upload(file: File) {
    // Upload file however you want
    return { url: 'https://...', filename: 'uploaded-file.jpg' };
  },
  async delete(url: string) {
    // Optional: delete from storage
  },
};
```

### Hooks

Lifecycle hooks for custom logic:

```tsx
config={{
  hooks: {
    // Modify entry before saving (return modified entry)
    onBeforeSave: async (entry) => {
      return { ...entry, fields: { ...entry.fields, lastEdited: new Date().toISOString() } };
    },

    // Run after successful save
    onAfterSave: async (entry) => {
      await fetch('/api/revalidate', { method: 'POST', body: JSON.stringify({ id: entry.id }) });
    },

    // Return false to cancel deletion
    onBeforeDelete: async (entry) => {
      return entry.status !== 'published'; // Prevent deleting published entries
    },

    // Run after successful deletion
    onAfterDelete: async (entry) => {
      console.log('Deleted:', entry.id);
    },

    // Run after media upload
    onMediaUpload: async (file, mediaItem) => {
      console.log('Uploaded:', mediaItem.url);
    },
  }
}}
```

### Custom Field Types

Register custom field renderers:

```tsx
function ColorPickerField({ field, value, onChange, disabled }) {
  return (
    <div>
      <label>{field.name}</label>
      <input
        type="color"
        value={(value as string) || '#000000'}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </div>
  );
}

// In config:
config={{
  customFieldTypes: {
    color_picker: {
      type: 'color_picker',
      label: 'Color Picker',
      component: ColorPickerField,
    },
  },
}}
```

Then use `color_picker` as a field type when building content models.

### Custom Sidebar Items

Add extra pages to the admin sidebar:

```tsx
config={{
  sidebarItems: [
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <BarChart className="w-5 h-5" />,
      path: '/analytics',
      component: AnalyticsDashboard,
      position: 'bottom', // 'top' (default) or 'bottom'
      roles: ['Admin', 'Editor'], // optional — hide from other roles
    },
  ],
}}
```

Items appear in a single list after the built-in sections. For full control of
section order, section labels, or interleaving custom items with built-ins, use
`sidebarSections` below.

### Sidebar Sections (reorder, rename, roles)

`sidebarSections` replaces the default `Content` / `Settings` layout with one
you declare. Each section has an `id`, optional `label` (section header), and
an ordered `items` array. Items can be either a built-in item ID string
(`'content-models' | 'entries' | 'media' | 'settings'`) or a full custom
`SidebarItem` object.

```tsx
import type { SidebarSection } from '@bullfinch/cms';

const sidebarSections: SidebarSection[] = [
  {
    id: 'admin',
    label: 'Admin',
    items: ['settings'],
    roles: ['Admin'],                      // entire section hidden for non-admins
  },
  {
    id: 'app',
    label: 'App',
    items: [
      { id: 'classes', label: 'Classes', path: 'classes', component: ClassList },
      { id: 'students', label: 'Students', path: 'students', component: StudentList,
        roles: ['Admin', 'Editor'] },      // hide this one item from Viewers
    ],
  },
  {
    id: 'content',
    label: 'Content',
    items: ['content-models', 'entries', 'media'],
  },
];

<CMSProvider config={{ sidebarSections }} ... />
```

Rules:
- Sections render top-to-bottom in the order you declare them.
- Omit `label` on a section to render its items with no header.
- `roles` on a section hides the entire block for users outside the list.
- `roles` on an item hides just that item. Omit `roles` for "visible to all".
- A section that ends up with zero visible items (after role filtering) is
  hidden entirely, header and all.
- `sidebarItems` (legacy) still works; those items render below all
  `sidebarSections`.

The default layout, exported as `DEFAULT_SIDEBAR_SECTIONS`, is:

```ts
[
  { id: 'content',  label: 'Content',  items: ['content-models', 'entries', 'media'] },
  { id: 'settings', label: 'Settings', items: ['settings'] },
]
```

Role-based visibility is a **UI affordance only** — it hides menu items, it does
not enforce permissions. Always enforce access at the database layer with
Supabase RLS policies. See [User Roles](#user-roles).

---

## Consuming Content (Frontend)

The CMS stores content in Supabase. Your frontend reads it directly:

```ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, anonKey, { db: { schema: 'cms_basecamp' } });

// Fetch all published entries for a content model
const { data: services } = await supabase
  .from('content_entries')
  .select('*, content_models!inner(api_identifier)')
  .eq('content_models.api_identifier', 'service_page')
  .eq('status', 'published')
  .order('created_at', { ascending: false });

// Each entry has:
// - title: string
// - fields: { hero_text: "...", price: 99, image: { url: "..." }, ... }
// - seo: { metaTitle: "...", metaDescription: "..." }
// - status: "published"
// - published_at: "2026-03-05T..."
```

### With Astro (SSG)

```astro
---
// src/pages/services/[slug].astro
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, anonKey, { db: { schema: 'cms_basecamp' } });

const { data: entries } = await supabase
  .from('content_entries')
  .select('*')
  .eq('content_model_id', SERVICE_MODEL_ID)
  .eq('status', 'published');

const entry = entries?.find(e => e.fields.slug === Astro.params.slug);
---

<h1>{entry.title}</h1>
<div set:html={entry.fields.body} />
```

### Fetching a Single Content Entry (e.g., Homepage)

For singleton-style models (one entry per model):

```ts
// Get the model ID
const { data: model } = await supabase
  .from('content_models')
  .select('id')
  .eq('api_identifier', 'homepage')
  .single();

// Get the single entry
const { data: homepage } = await supabase
  .from('content_entries')
  .select('*')
  .eq('content_model_id', model.id)
  .eq('status', 'published')
  .single();

// homepage.fields = { hero_title: "...", hero_image: { url: "..." }, ... }
```

---

## User Roles

| Role | Can View | Can Create/Edit | Can Delete | Can Manage Users | Can Edit Settings |
|------|----------|-----------------|------------|------------------|-------------------|
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Editor** | ✅ | ✅ | Own only | ❌ | ❌ |
| **Viewer** | ✅ | ❌ | ❌ | ❌ | ❌ |

Users are created through Supabase Auth. The CMS auto-creates a user profile record when someone signs up (via database trigger). New users default to `Viewer` role. Admins can promote users through the Settings → User Management panel.

---

## Offboarding a Client

When a client leaves your hosting:

### 1. Export their data

```bash
npx @bullfinch/cms export --schema cms_basecamp --output ./basecamp-export.sql
```

This prints the `pg_dump` command. Run it:

```bash
pg_dump "postgresql://postgres:PASSWORD@db.xxxxx.supabase.co:5432/postgres" \
  --schema=cms_basecamp \
  --no-owner \
  --no-privileges \
  -f ./basecamp-export.sql
```

### 2. Hand them the export

The SQL file contains everything — schema creation, table definitions, all data. They can import it into any Postgres database:

```bash
psql "postgresql://..." -f ./basecamp-export.sql
```

Or into a new Supabase project via the SQL Editor.

### 3. Remove the schema

```sql
DROP SCHEMA cms_basecamp CASCADE;
```

Clean removal. No orphaned data.

---

## CLI Reference

All commands require these environment variables:

```bash
export SUPABASE_URL="https://xxxxx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJI..."
```

**Global flags:** `--json` (machine-readable output), `--version`, `--help`

### `schemas` — Discover client schemas

```bash
npx @bullfinch/cms schemas list                        # List all client schemas
npx @bullfinch/cms schemas info --schema cms_acme      # Schema details (tables, row counts, models)
```

### `models` — Manage content models

```bash
npx @bullfinch/cms models list --schema cms_acme
npx @bullfinch/cms models get --schema cms_acme --model blog_post
npx @bullfinch/cms models create --schema cms_acme \
  --name "Blog Post" --api-id blog_post \
  --description "Blog articles" --icon "📝" \
  --fields '[{"id":"...","name":"Body","api_identifier":"body","field_type":"rich_text","required":true}]'
npx @bullfinch/cms models update --schema cms_acme --model blog_post --name "Article"
npx @bullfinch/cms models delete --schema cms_acme --model blog_post
```

Models are referenced by `api_identifier` (e.g. `blog_post`), not UUID. The `--fields` flag accepts inline JSON or a file path to a JSON array of field definitions.

### `entries` — Manage content entries

```bash
npx @bullfinch/cms entries list --schema cms_acme --model blog_post [--status published] [--limit 50]
npx @bullfinch/cms entries get --schema cms_acme --id <uuid>
npx @bullfinch/cms entries create --schema cms_acme --model blog_post \
  --title "My Post" --fields '{"body":"<p>Hello world</p>"}' \
  --seo '{"metaTitle":"My Post","metaDescription":"A great post"}'
npx @bullfinch/cms entries update --schema cms_acme --id <uuid> \
  --title "Updated Title" --fields '{"body":"<p>New content</p>"}' \
  --seo '{"metaTitle":"Updated Title"}'
npx @bullfinch/cms entries delete --schema cms_acme --id <uuid>
npx @bullfinch/cms entries publish --schema cms_acme --id <uuid>
npx @bullfinch/cms entries unpublish --schema cms_acme --id <uuid>
```

The `--seo` flag accepts inline JSON or a file path. Valid keys: `metaTitle`, `metaDescription`, `ogImage`, `ogTitle`, `ogDescription`, `canonicalUrl`, `noIndex`, `structuredData`. On update, SEO data is **merged** with existing values — you can update individual fields without losing the rest.

### `media` — Manage uploaded files

```bash
npx @bullfinch/cms media list --schema cms_acme [--limit 50]
npx @bullfinch/cms media delete --schema cms_acme --id <uuid>
```

### `settings` — Key/value configuration

```bash
npx @bullfinch/cms settings list --schema cms_acme
npx @bullfinch/cms settings get --schema cms_acme --key site_name
npx @bullfinch/cms settings set --schema cms_acme --key site_name --value "Acme Corp"
```

### `users` — Manage CMS users

```bash
npx @bullfinch/cms users list --schema cms_acme
npx @bullfinch/cms users get --schema cms_acme --id <uuid>
npx @bullfinch/cms users update --schema cms_acme --id <uuid> --role Admin --first-name Jane --last-name Doe
```

### `entries test-on` / `test-off` — Test Mode

```bash
# Enable test mode — snapshots content, replaces with test markers
npx @bullfinch/cms entries test-on --schema cms_acme --id <entry-uuid>

# Disable test mode — restores original content from snapshot
npx @bullfinch/cms entries test-off --schema cms_acme --id <entry-uuid>
```

Test mode replaces entry content with test markers for verifying CMS wiring:
- Text fields get `111` appended
- Media fields get replaced with `placehold.co` placeholder images
- Original content is safely stored in a `_snapshot` column and restored on `test-off`

The admin UI also has a test mode toggle in the entry editor sidebar under "Developer Tools".

### `scaffold` — Generate a new CMS client app

```bash
npx @bullfinch/cms scaffold --name "Acme Corp" --schema cms_acme --dir ./acme-cms
npx @bullfinch/cms scaffold --name "Acme Corp" --schema cms_acme --dir ./acme-cms --primary "#224059" --accent "#FFC844"
```

Generates a complete Vite + React + TypeScript + Tailwind CMS app, ready for `npm install && npm run dev`. Includes:
- `@source` directive for CMS Tailwind classes (no missing styles)
- `resolve.dedupe` in Vite config (no dual React issues)
- Netlify `_redirects` for SPA routing (no 404s on refresh)
- `.env.example` with Supabase placeholder credentials
- Branding config with business name and optional colors

| Flag | Required | Description |
|------|----------|-------------|
| `--name` | ✅ | Business display name |
| `--schema` | ✅ | CMS schema name (e.g., `cms_acme`) |
| `--dir` | ✅ | Output directory path |
| `--primary` | ❌ | Primary brand color (default: `#2563eb`) |
| `--accent` | ❌ | Accent brand color |

### `verify` — Check schema health

```bash
npx @bullfinch/cms verify --schema cms_acme
```

Runs a checklist of health checks against an existing schema and prints pass/fail for each:
- Schema exists
- All required tables exist
- `service_role` has SELECT grants
- PostgREST schema exposure (requires `SUPABASE_ACCESS_TOKEN`)
- `exec_sql` / `exec_sql_read` functions exist
- Event trigger for auto-granting permissions exists
- All migrations applied

Exit code 0 if all pass, 1 if any fail. Useful in CI or after init to confirm everything is wired correctly.

### `init` — Create a new client schema

```bash
npx @bullfinch/cms init --schema cms_acme --name "Acme Corp"
```

Creates the Postgres schema, all tables, RLS policies, indexes, triggers, and seeds default settings. Automatically runs `verify` at the end and prints a health checklist.

### `migrate` — Run migrations on existing schema

```bash
npx @bullfinch/cms migrate --schema cms_acme
```

Applies any pending migrations. Safe to run multiple times (idempotent). The `init` command automatically chains all migrations, so new schemas are always fully configured.

### `export` — Generate export command for offboarding

```bash
npx @bullfinch/cms export --schema cms_acme [--output ./backup.sql]
```

Prints the `pg_dump` command to export the client's complete schema and data.

---

## CLI Validation

The CLI enforces data quality rules to prevent broken CMS configurations.

### Field Type Validation

When creating or updating models, the CLI validates all field types. The `json` type has been removed — use `array` with `item_fields` for structured repeating data.

### Convention Enforcement

The CLI enforces best practices by default:

| Convention | Behavior | Override |
|-----------|----------|----------|
| `long_text` field type | Blocked — suggests `rich_text` (formatting toolbar) or `short_text` (single-line) | `--force` |
| `short_text` on URL-like fields | Blocked — suggests `url` type for fields with `url`/`href` in the name | `--force` |
| Paired `*_text` + `*_url` fields | Warning — suggests `button` type | N/A (warning only) |
| `array` without `item_fields` | Hard error — arrays must define their sub-field structure | Cannot override |

### Entry Validation

When creating or updating entries, the CLI cross-references every field against the content model:

- **Unknown keys rejected** — every field key must match an `api_identifier` in the model
- **Type checking** — values are validated against the field type (strings for text, numbers for numbers, etc.)
- **Fuzzy matching** — typos get suggestions: `"hro_title" not found — did you mean "hero_title"?`
- **Recursive validation** — array items are validated against `item_fields`
- **All-or-nothing** — all errors are collected and reported; no partial writes

---

## AI Agent Integration

The CLI is designed for programmatic control by AI agents. All commands support `--json` output for reliable parsing, and the command structure maps directly to CRUD operations on CMS resources.

**Why the CLI matters for agents:** The CLI's strict validation prevents agents from creating broken models or entries. Invalid field types, unknown entry keys, and convention violations are all caught before data touches the database. This eliminates entire categories of agent errors.

**Security note:** The CLI uses the Supabase `service_role` key, which bypasses Row Level Security. This is superuser access — the agent can read and write all data across all schemas. Treat the key accordingly.

**Example: Agent workflow for wiring a page to CMS**

```bash
# 1. Create a content model with validated field types
cat > /tmp/fields.json << 'EOF'
[
  {"name": "Hero Heading", "api_identifier": "hero_heading", "field_type": "short_text"},
  {"name": "Hero Description", "api_identifier": "hero_description", "field_type": "rich_text"},
  {"name": "Hero Image", "api_identifier": "hero_image", "field_type": "media"},
  {"name": "Hero Button", "api_identifier": "hero_button", "field_type": "button"}
]
EOF
npx @bullfinch/cms models create --schema cms_acme --name "Homepage" --api-id homepage --fields /tmp/fields.json

# 2. Create entry with content (validated against model)
cat > /tmp/data.json << 'EOF'
{
  "hero_heading": "Welcome to Acme",
  "hero_description": "<p>We do great work.</p>",
  "hero_image": "https://acme.netlify.app/hero.webp",
  "hero_button": {"text": "Get Started", "url": "/contact"}
}
EOF
npx @bullfinch/cms entries create --schema cms_acme --model homepage --title "Home" --fields /tmp/data.json --status published \
  --seo '{"metaTitle":"Acme Corp — Home","metaDescription":"Welcome to Acme. We do great work."}'

# 3. Enable test mode for wiring verification
npx @bullfinch/cms entries test-on --schema cms_acme --id <entry-uuid>
# → Text gets "111" appended, images become placehold.co URLs

# 4. Wire frontend, verify 111 markers in HTML output

# 5. Restore original content
npx @bullfinch/cms entries test-off --schema cms_acme --id <entry-uuid>
```

---

## Project Structure

```
@bullfinch/cms/
├── src/
│   ├── index.ts                    # Main exports
│   ├── core/
│   │   ├── types.ts                # All TypeScript types and interfaces
│   │   ├── queries.ts              # Supabase CRUD operations
│   │   ├── config.ts               # Settings load/save helpers
│   │   ├── helpers.ts              # Content & validation helpers
│   │   └── storage.ts              # Storage adapter implementations
│   ├── components/
│   │   ├── provider.tsx            # CMSProvider context + hooks (useCMS, useSupabase, useUser)
│   │   ├── AdminPanel.tsx          # Main admin shell with routing
│   │   ├── auth/
│   │   │   └── Login.tsx           # Login form
│   │   ├── layout/
│   │   │   ├── MainLayout.tsx      # Shell with sidebar + content area
│   │   │   └── Sidebar.tsx         # Dynamic sidebar (auto-lists content models)
│   │   ├── content/
│   │   │   ├── ContentModelsList.tsx       # List all content models
│   │   │   ├── ContentModelEditor.tsx      # Create/edit a content model
│   │   │   ├── ContentEntriesList.tsx      # List entries for a model
│   │   │   ├── ContentEntryEditor.tsx      # Create/edit an entry
│   │   │   ├── DynamicField.tsx            # Renders correct input per field type
│   │   │   ├── FieldBuilder.tsx            # Visual field definition builder
│   │   │   ├── FieldEditor.tsx             # Edit field properties
│   │   │   ├── FieldTypeSelector.tsx       # Field type dropdown
│   │   │   ├── ArrayField.tsx              # Repeatable field groups
│   │   │   ├── ArrayItemFieldEditor.tsx    # Sub-field editor for arrays
│   │   │   ├── ButtonField.tsx             # Button (text + URL) field
│   │   │   ├── MediaPicker.tsx             # Inline media selection
│   │   │   ├── ReferencePicker.tsx         # Content entry reference picker
│   │   │   ├── JsonViewer.tsx              # Raw JSON display
│   │   │   └── SchemaViewer.tsx            # Model schema display
│   │   ├── media/
│   │   │   ├── Media.tsx                   # Main media view
│   │   │   ├── MediaLibrary.tsx            # Grid with search/filter
│   │   │   ├── MediaUpload.tsx             # Upload component
│   │   │   └── MediaCard.tsx               # Individual media item
│   │   ├── settings/
│   │   │   ├── Settings.tsx                # Branding & site settings
│   │   │   ├── UserManagement.tsx          # User list & management
│   │   │   ├── UserEditor.tsx              # Edit user details
│   │   │   └── ChangePassword.tsx          # Password change form
│   │   └── common/
│   │       ├── ConfirmationModal.tsx       # "Are you sure?" modal
│   │       ├── Dropdown.tsx                # Custom dropdown component
│   │       ├── RichTextEditor.tsx          # TipTap WYSIWYG editor
│   │       ├── SEOPanel.tsx                # SEO metadata editor
│   │       └── Toast.tsx                   # Toast notifications
│   ├── schema/
│   │   └── migrations/
│   │       ├── 001_initial.sql             # Base schema (multi-tenant)
│   │       ├── 002_fix_cascade_deletes.sql # Fix FK cascades (SET NULL)
│   │       ├── 003_test_mode.sql           # Add test_mode + _snapshot columns
│   │       ├── 004_grant_roles.sql         # Grant schema access to roles
│   │       ├── 005_auto_grant_event_trigger.sql # Auto-grant on new tables
│   │       ├── 006_exec_sql_helpers.sql    # exec_sql / exec_sql_read functions
│   │       └── 007_public_read_policies.sql # anon SELECT on models/entries/media
│   └── cli/
│       └── index.ts                        # CLI entry point
├── package.json
├── tsconfig.json
├── vite.config.ts                          # Vite library mode build
└── README.md
```

---

## Development

### Building the package

```bash
git clone https://github.com/eczzz/bullfinch-cms.git
cd bullfinch-cms
npm install
npm run build
```

### Linking for local development

```bash
# In the CMS package directory
npm link

# In your client app directory
npm link @bullfinch/cms
```

### Watch mode

```bash
npm run dev  # Rebuilds on file changes
```

---

## Troubleshooting

### First step: run `verify`

If something isn't working, start here:

```bash
npx @bullfinch/cms verify --schema cms_yourschema
```

This checks grants, tables, functions, triggers, and migrations in one shot. Fix whatever shows a red X.

### "exec_sql function does not exist"

The CLI needs a helper function to run DDL. Create it once:

```sql
CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS void AS $$
BEGIN EXECUTE query; END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### "relation does not exist" errors

Make sure your Supabase client is created with the correct schema:

```ts
const supabase = createClient(url, key, {
  db: { schema: 'cms_basecamp' }  // Must match the schema you initialized
});
```

### RLS policy errors / "permission denied"

- Make sure the user exists in the schema's `users` table
- Check their role (Admin required for some operations)
- The auth trigger should auto-create user records, but if it didn't:
  ```sql
  INSERT INTO cms_basecamp.users (id, email, role)
  VALUES ('auth-user-uuid', 'user@example.com', 'Admin');
  ```

### Tailwind classes not applying to CMS components

Add the CMS package to your Tailwind content paths:

```js
// tailwind.config.js
content: [
  './src/**/*.{js,ts,jsx,tsx}',
  './node_modules/@bullfinch/cms/dist/**/*.{js,ts,jsx,tsx}',
],
```

### Media uploads failing

- **Supabase Storage:** Make sure the bucket exists and is set to public
- **R2/S3:** Verify your presigned URL endpoint is returning the correct format: `{ presignedUrl, publicUrl, filename }`
- Check browser console for CORS errors — your storage provider may need CORS configured

### Multiple schemas sharing auth triggers

Each schema creates its own `on_auth_user_created_SCHEMA_NAME` trigger. This means when a new Supabase Auth user signs up, a user record is created in **every** client schema. This is usually fine (the record is harmless), but if you want per-client user isolation, create users via the admin panel instead of self-signup.

---

## License

UNLICENSED — Bullfinch internal use.
