# @bullfinch/cms

Multi-tenant CMS built on React + Supabase with schema-based isolation. Each client gets their own Postgres schema — complete data isolation, one Supabase project, easy offboarding.

## Install

```bash
npm install @bullfinch/cms
```

Peer dependencies: `react`, `react-dom`, `@supabase/supabase-js`

## Quick Start

### 1. Initialize a client schema

```bash
SUPABASE_URL=https://xxx.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=xxx \
npx @bullfinch/cms init --schema cms_acme --name "Acme Corp"
```

### 2. Mount in your app

```tsx
import { createClient } from '@supabase/supabase-js';
import { CMSProvider, AdminPanel } from '@bullfinch/cms';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
  { db: { schema: 'cms_acme' } }
);

function App() {
  return (
    <CMSProvider
      supabase={supabase}
      config={{
        branding: {
          businessName: 'Acme Corp',
          primaryColor: '#3b82f6',
        },
      }}
    >
      <AdminPanel />
    </CMSProvider>
  );
}
```

## Multi-tenancy

Each client gets their own Postgres schema:

```
your-supabase-project
├── cms_acme        ← Acme Corp
├── cms_lighthouse  ← Lighthouse Therapeutics
├── cms_basecamp    ← Base Camp Ouray
└── ...
```

- **Isolation:** Schemas are fully separate. No cross-client data leaks.
- **Cost:** One $10/month Supabase project instead of one per client.
- **Offboarding:** `pg_dump --schema=cms_acme` gives a clean, portable SQL file.

## CLI

```bash
# Initialize new client
npx @bullfinch/cms init --schema cms_foo --name "Foo Inc"

# Run migrations
npx @bullfinch/cms migrate --schema cms_foo

# Export for offboarding
npx @bullfinch/cms export --schema cms_foo --output ./backup.sql
```

## Extension Points

### Custom sidebar items

```tsx
<CMSProvider config={{
  sidebarItems: [{
    id: 'analytics',
    label: 'Analytics',
    path: '/analytics',
    component: MyAnalyticsPage,
  }]
}}>
```

### Hooks

```tsx
<CMSProvider config={{
  hooks: {
    onBeforeSave: (entry) => ({ ...entry, fields: { ...entry.fields, updated: Date.now() } }),
    onAfterSave: (entry) => console.log('Saved:', entry.id),
    onBeforeDelete: (entry) => confirm('Sure?'),
  }
}}>
```

### Custom field types

```tsx
<CMSProvider config={{
  customFieldTypes: {
    color_picker: {
      type: 'color_picker',
      label: 'Color Picker',
      component: MyColorPicker,
    }
  }
}}>
```

### Custom storage adapter

```tsx
<CMSProvider config={{
  storage: {
    async upload(file) {
      // Upload to R2, S3, Cloudflare, wherever
      return { url: 'https://...', filename: file.name };
    },
    async getPresignedUrl(filename, contentType) {
      // For direct browser uploads
      return { presignedUrl: '...', publicUrl: '...', filename };
    }
  }
}}>
```

## What's Included

- **Content Models** — Define custom content types with a visual field builder
- **Content Entries** — CRUD entries against any model, with draft/published/archived workflow
- **Media Library** — Upload, browse, and manage files
- **Rich Text Editor** — TipTap-based with images, tables, links, YouTube embeds
- **SEO Panel** — Meta titles, descriptions, OG tags, structured data per entry
- **User Management** — Admin/Editor/Viewer roles
- **Branding** — Custom colors, logo, business name
- **Multi-tenant** — Schema-based isolation, one Supabase project for all clients

## License

UNLICENSED — Bullfinch internal use.
