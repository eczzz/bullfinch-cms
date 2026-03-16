# @bullfinch/cms CLI — AgentSkill

## Overview

`@bullfinch/cms` provides a CLI for managing a multi-tenant CMS built on Supabase. Each client gets an isolated Postgres schema within a single Supabase project. The CLI handles schema initialization, content model CRUD, entry management, media, settings, users, migrations, and exports.

All operations target a specific schema (client) via the `--schema` flag.

## Setup

### Required Environment Variables

```bash
export SUPABASE_URL="https://xxxxx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJI..."
```

The service_role key has superuser access — it bypasses RLS. This is required for all CLI operations.

### Optional

- `SUPABASE_ACCESS_TOKEN` — Supabase Management API token. Only needed for operations that hit the Management API (not standard CLI usage).

### Invocation

```bash
npx @bullfinch/cms <command> <subcommand> [flags]
```

## Quick Reference

### Global Flags

| Flag | Description |
|------|-------------|
| `--json` | Output as JSON (use this for parsing) |
| `--version` | Print CLI version |
| `--help` | Show help for any command |

### Commands

| Command | Flags | Description |
|---------|-------|-------------|
| `schemas list` | | List all client schemas |
| `schemas info` | `--schema` | Show schema details (tables, row counts, models) |
| `models list` | `--schema` | List all content models in a schema |
| `models get` | `--schema --model` | Get a single model by api_identifier |
| `models create` | `--schema --name --api-id [--description] [--icon] [--fields]` | Create a content model |
| `models update` | `--schema --model [--name] [--description] [--icon] [--fields]` | Update a content model |
| `models delete` | `--schema --model` | Delete a content model |
| `entries list` | `--schema --model [--status] [--limit]` | List entries for a model |
| `entries get` | `--schema --id` | Get a single entry by ID |
| `entries create` | `--schema --model --title [--fields]` | Create a content entry |
| `entries update` | `--schema --id [--title] [--fields]` | Update a content entry |
| `entries delete` | `--schema --id` | Delete a content entry |
| `entries publish` | `--schema --id` | Set entry status to published |
| `entries unpublish` | `--schema --id` | Set entry status to draft |
| `media list` | `--schema [--limit]` | List media items |
| `media delete` | `--schema --id` | Delete a media item |
| `settings list` | `--schema` | List all settings |
| `settings get` | `--schema --key` | Get a setting value |
| `settings set` | `--schema --key --value` | Set a setting value |
| `users list` | `--schema` | List all users in a schema |
| `users get` | `--schema --id` | Get a user by ID |
| `users update` | `--schema --id [--role] [--first-name] [--last-name]` | Update a user |
| `init` | `--schema --name` | Initialize a new client schema |
| `migrate` | `--schema` | Run pending migrations |
| `export` | `--schema [--output]` | Generate pg_dump export command |

## Content Model Fields

### Field Types

| Type | Description |
|------|-------------|
| `short_text` | Single-line text |
| `long_text` | Multi-line textarea |
| `rich_text` | WYSIWYG HTML editor |
| `number` | Numeric input |
| `boolean` | Toggle (true/false) |
| `date` | Date only |
| `datetime` | Date + time |
| `media` | Image/file from media library |
| `reference` | Link to another content entry |
| `array` | Repeatable group of sub-fields |
| `json` | Raw JSON |
| `select` | Dropdown with predefined options |
| `color` | Color picker |
| `url` | URL with validation |
| `email` | Email with validation |
| `slug` | URL-friendly identifier |
| `button` | Link with text + URL |

### FieldDefinition Structure

The `--fields` flag accepts a JSON array of field definitions (inline or as a file path):

```json
[
  {
    "id": "uuid-string",
    "name": "Display Name",
    "api_identifier": "snake_case_id",
    "field_type": "short_text",
    "required": true,
    "help_text": "Shown below the field in the UI",
    "default_value": "optional default",
    "options": {
      "placeholder": "Type here...",
      "choices": ["Option A", "Option B"]
    },
    "validation": {
      "min_length": 1,
      "max_length": 255,
      "pattern": "^[a-z]+$"
    }
  }
]
```

**Key rules:**
- `id` — UUID. Generate with `crypto.randomUUID()` or `uuidgen`.
- `api_identifier` — snake_case. This is how fields are referenced in entry data.
- `options` — varies by field type. `select` uses `choices`. `long_text` uses `rows`. `media` uses `accept`.
- `validation` — optional constraints. Structure varies by field type.

## Common Workflows

### Creating a New Client

```bash
# 1. Initialize schema
npx @bullfinch/cms init --schema cms_acme --name "Acme Corp"

# 2. Create content models
npx @bullfinch/cms models create --schema cms_acme \
  --name "Service Page" --api-id service_page \
  --description "Service offerings" --icon "🔧" \
  --fields '[{"id":"...","name":"Body","api_identifier":"body","field_type":"rich_text","required":true}]'

# 3. Create entries
npx @bullfinch/cms entries create --schema cms_acme \
  --model service_page --title "Web Development" \
  --fields '{"body":"<p>We build websites.</p>"}'

# 4. Publish
npx @bullfinch/cms entries publish --schema cms_acme --id <entry-uuid>
```

### Updating Content

```bash
# Find the entry
npx @bullfinch/cms entries list --schema cms_acme --model service_page --json

# Update it
npx @bullfinch/cms entries update --schema cms_acme --id <entry-uuid> \
  --fields '{"body":"<p>Updated content.</p>"}'
```

### Schema Discovery

```bash
# List all schemas
npx @bullfinch/cms schemas list --json

# Inspect a specific schema
npx @bullfinch/cms schemas info --schema cms_acme --json
```

## Tips

- **Always use `--json`** for machine-readable output. Default output is human-formatted.
- **Models are referenced by `api_identifier`**, not UUID. Use `--model service_page`, not `--model <uuid>`.
- **`--fields` accepts inline JSON or a file path.** For complex models, write fields to a `.json` file and pass the path.
- **Schema naming convention:** `cms_` prefix + lowercase identifier with underscores. Example: `cms_basecamp`, `cms_acme`.
- **`init` is idempotent-ish.** It won't destroy existing data, but don't run it on an already-initialized schema. Use `migrate` instead.
- **`migrate` is safe to repeat.** It tracks applied migrations and skips ones already run.
- **Entry fields are freeform JSON.** The `--fields` value on entries is the content data, structured according to the model's field definitions.
- **`export` doesn't dump data directly** — it outputs the `pg_dump` command you need to run.
