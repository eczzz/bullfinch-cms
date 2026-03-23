---
name: bullfinch-cms
description: Set up and manage Bullfinch CMS — multi-tenant CMS on Supabase with schema isolation. Use when wiring pages to CMS content, creating/updating content models or entries, or running the page wiring loop (map → model → entry → test → verify → restore). Triggers on "set up CMS", "wire page to CMS", "create content model", "CMS for [client]", "bullfinch-cms".
---

# Bullfinch CMS — Agent Skill

Multi-tenant CMS: one Supabase project, per-client Postgres schemas (`cms_<client>`). React admin panel + CLI for management.

## 🔴 RULE: ALL CMS DATA GOES THROUGH THE CLI

**No exceptions. No raw SQL. No Supabase REST API. No Management API for content.**

The CLI is the gatekeeper — it validates field types, enforces conventions, and type-checks entry data against models. Nothing gets into the CMS unless it's clean.

```bash
# Clone + set up CLI (if not already cloned)
cd /tmp && git clone https://github.com/<your-org>/bullfinch-cms.git
cd bullfinch-cms && npm install

# Set env vars (your Supabase project credentials)
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# CLI usage (always from the bullfinch-cms directory)
npx tsx src/cli/index.ts <command> <subcommand> --schema cms_<client> [flags]

# Examples:
npx tsx src/cli/index.ts models create --schema cms_acme --name "Homepage" --api-id homepage --fields /tmp/homepage-fields.json
npx tsx src/cli/index.ts entries create --schema cms_acme --model homepage --title "Homepage" --fields /tmp/homepage-data.json --status published
npx tsx src/cli/index.ts entries update --schema cms_acme --id <uuid> --fields /tmp/updated-fields.json
npx tsx src/cli/index.ts entries test-on --schema cms_acme --id <uuid>
npx tsx src/cli/index.ts entries test-off --schema cms_acme --id <uuid>
npx tsx src/cli/index.ts models list --schema cms_acme
npx tsx src/cli/index.ts entries list --schema cms_acme --model homepage
```

## CLI Validation (Enforced Automatically)

The CLI enforces these rules. You don't need to remember them — the CLI will reject bad input with clear errors.

### Field Type Rules
**Valid types:** `short_text`, `rich_text`, `number`, `boolean`, `date`, `datetime`, `color`, `select`, `media`, `reference`, `button`, `array`, `url`, `email`, `slug`

**Removed/blocked types:**
- ❌ `json` — removed entirely. Use `array` with `item_fields` for structured repeating data.
- ❌ `long_text` — blocked by default. Use `rich_text` for body copy (gives formatting toolbar) or `short_text` for single lines. Pass `--force` to override if truly needed.

### Convention Enforcement (on model create/update)
- `long_text` → error, suggests `rich_text` or `short_text` (bypass with `--force`)
- `short_text` on fields with `url`/`href` in the name → error, suggests `url` type (bypass with `--force`)
- Paired `*_text` + `*_url` sibling fields → warning, suggests `button` type
- `array` without `item_fields` in options → hard error (useless without structure)

### Entry Validation (on entry create/update)
- Every field key must match an `api_identifier` in the model — unknown keys rejected
- Value types checked against field_type (string for text, number for number, boolean for boolean, etc.)
- Fuzzy matching on typos: `"hro_title" not found — did you mean "hero_title"?`
- Array items recursively validated against `item_fields`
- All errors collected and printed before exiting — no partial writes

### Field Type Conventions (What to Use When)
| Content | Type | Notes |
|---------|------|-------|
| Headings, labels, badges | `short_text` | Single-line text |
| Body copy, descriptions, paragraphs | `rich_text` | Multi-line with formatting toolbar |
| URLs, links | `url` | Validated as URL |
| Email addresses | `email` | Validated as email |
| Images, hero backgrounds | `media` | Stores URL string |
| Buttons (text + link) | `button` | Object with `text` and `url` |
| Repeating items (testimonials, cards) | `array` | Must have `options.item_fields` |
| Yes/no toggles | `boolean` | |
| Numbers, counts, ratings | `number` | |
| Dropdowns | `select` | With `options.choices` |

**Field JSON property names** (from FieldDefinition interface):
- `name` — display name shown in admin UI
- `api_identifier` — the key used in entry fields JSON (NOT `api_id`, NOT `key`)
- `field_type` — the type (NOT `type`)
- `required` — boolean (optional)
- `help_text` — hint text (optional)
- `options` — for arrays: `{"item_fields": [...]}`, for selects: `{"choices": [...]}`

The CLI auto-normalizes `type→field_type` and `api_id→api_identifier`, but always use the correct names.

## Test Mode

Test mode replaces entry content with test markers (111 text + placeholder images) to verify CMS wiring. Original content is snapshotted and restored automatically.

### CLI Commands
```bash
# Enable test mode — snapshots fields, replaces with test markers
npx tsx src/cli/index.ts entries test-on --schema cms_<client> --id <entry-uuid>

# Disable test mode — restores original content from snapshot
npx tsx src/cli/index.ts entries test-off --schema cms_<client> --id <entry-uuid>
```

### What Test Mode Does
- `short_text`, `slug`: appends ` 111` to value
- `long_text`: appends ` 111` to value
- `rich_text`: appends `<p>111</p>` to value
- `email`: replaces with `test111@example.com`
- `url`: left unchanged (breaking URLs doesn't help)
- `media`: replaces with `https://placehold.co/800x600/e2e8f0/64748b?text=<Field+Name>`
- `button`: appends ` 111` to text, keeps URL
- `array`: recurses into each item with same rules
- `number`, `boolean`, `date`, `datetime`, `color`, `select`, `reference`: left unchanged

### Admin UI
- Toggle switch in "Developer Tools" sidebar card (entry editor)
- Amber warning banner when active: "🧪 Test Mode Active"
- Custom confirmation modal before enabling
- "Restore Original Content" button in banner to disable

### Safety
- Original fields saved to `_snapshot` column — no manual snapshots needed
- `test-on` fails if already in test mode (prevents double-snapshot)
- `test-off` fails if no snapshot exists (prevents data loss)
- `test_mode` boolean column tracks state

## New Client Setup

1. **Clone bullfinch-cms**, run `npm install && npm run build`
2. **Set env vars** for your Supabase project (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
3. **Init schema:** `npx tsx src/cli/index.ts init --schema cms_<client> --name "<Client Name>"`
   - Init automatically runs ALL migrations — new schemas are fully configured
   - If `exec_sql` function missing, create it first (see README)
4. **Scaffold client CMS app:**
   ```bash
   npx tsx src/cli/index.ts scaffold --name "<Client Name>" --schema cms_<client> --dir ./<client>-cms --primary "#224059" --accent "#FFC844"
   cd <client>-cms
   cp .env.example .env   # Fill in Supabase credentials
   npm install
   npm run dev
   ```
   - The scaffold command generates a complete deploy-ready app with all common issues pre-solved:
     - Tailwind `@source` for CMS component classes (no missing styles)
     - `resolve.dedupe` in Vite config (no dual React)
     - Netlify `_redirects` for SPA routing (no 404s on refresh)
     - Branding config with business name and colors
5. **Add RLS policies** for public frontend reads:
   ```sql
   CREATE POLICY <name>_public_select ON cms_<schema>.content_models FOR SELECT TO anon USING (true);
   CREATE POLICY <name>_public_select ON cms_<schema>.content_entries FOR SELECT TO anon USING (status = 'published');
   ```

## The Page Wiring Loop

Repeatable process for connecting a static page to CMS content. All steps are mandatory.

### Step 1: Map the Page

This is the most important step. You're reading the source code and deciding what becomes a CMS field.

**How to read Astro components:**
- Content lives in TWO places: the frontmatter (`---` block) with JS variables/arrays/objects, AND the HTML template with inline text
- Read BOTH. Frontmatter often has arrays (team members, services). Inline HTML has headings, paragraphs, badges.
- Read EVERY component the page imports. Don't skip any.

**What IS a CMS field (client-editable content):**
- Headings (`<h1>`, `<h2>`, etc.)
- Paragraphs, descriptions, body copy
- Badge/label text
- Button text AND their href/URL (use `button` type — one field, not two)
- Images showing real content (team photos, hero backgrounds, product images)
- Repeating content arrays (team members, testimonials, service cards, FAQ items)
- Email addresses, phone numbers, URLs shown as text

**What is NOT a CMS field (stays hardcoded):**
- Decorative SVGs and icons (clouds, confetti, leaves, stars, ornaments)
- Animation configurations (particle counts, timing, keyframe values)
- CSS classes, colors, layout structure
- Structural elements (rainbow stripes, dividers, dot separators)
- Font Awesome icon CLASS NAMES when decorative — BUT include as `short_text` if the icon varies per item in a repeating array
- Navigation (Navbar) and Footer — site-wide, not page-specific
- Component HTML structure and CSS

**Field naming conventions:**
- Prefix every field with its section/component name: `hero_heading`, `team_badge`, `why_description`
- This prevents name collisions across sections
- Use snake_case for `api_identifier`
- Use readable names for `name`: "Hero Heading", "Team Badge"

**Shared components (CTA, etc.):**
- Include fields in each page's model with a section prefix
- Example: CTA on about page → `cta_badge`, `cta_heading`, `cta_button`

**Image URL construction:**
- All images in entry data must use full absolute URLs from the live site
- Pattern: `https://<site>.netlify.app/<image-path>`
- Check `<img src>` AND CSS `background-image: url(...)` — hero sections almost always use CSS backgrounds

**Rich text value format:**
- Wrap in HTML: `"<p>This is body copy.</p>"`
- Multiple paragraphs: use multiple `<p>` tags
- The editor expects HTML, not plain strings

**Field order:**
- Group by section, in page reading order
- Within a section: badge → heading → description → button
- This is the order clients see in admin

### Step 2: Create Content Model (CLI ONLY)
```bash
npx tsx src/cli/index.ts models create --schema cms_<client> --name "<Page Name>" --api-id <page-id> --fields /tmp/<page>-fields.json
```
- `rich_text` for body copy (NOT `long_text`)
- `url` for links (NOT `short_text`)
- `button` for text+url pairs (NOT separate fields)
- `array` with `item_fields` for repeating content (NOT `json`)
- Do NOT add SEO fields — use the built-in `seo` column

### Step 3: Create Content Entry (CLI ONLY)
```bash
npx tsx src/cli/index.ts entries create --schema cms_<client> --model <api_id> --title "<Page Name>" --fields /tmp/<page>-data.json --status published
```
- Exact content from the live site
- Live site URLs for images
- Button values: `{"text": "Learn More", "url": "/contact"}`
- Rich text wrapped in `<p>` tags
- SEO goes in `seo` column, not `fields`

### Step 4: Enable Test Mode
```bash
npx tsx src/cli/index.ts entries test-on --schema cms_<client> --id <entry-uuid>
```

### Step 5: Wire the Frontend
- Create `src/lib/supabase.ts` (Supabase client with schema config)
- Create `src/lib/content.ts` (generic `getPage(apiId)` fetcher)
- Modify page file: fetch CMS data, pass fields as props
- Modify each component: Props interface, destructure with fallback defaults
- **Every visible text, image, button must come from props**
- **CSS background images** — use CSS custom property pattern:
  ```astro
  <div style={`--hero-bg: url('${heroImage}')`} class="hero">
  ```
  ```css
  .hero { background-image: var(--hero-bg, url('/fallback.webp')); }
  ```
  Never `url(var(...))` — that double-wraps and breaks.

### Step 6: Verify
```bash
curl -s http://localhost:<port>/<page> | grep -o '111' | wc -l      # must be > 0
curl -s http://localhost:<port>/<page> | grep -o 'placehold.co' | wc -l  # must be > 0 if page has images
```
- 111 count of 0 = wiring broken
- placehold.co count of 0 when images exist = images not wired

### Step 7: Restore
```bash
npx tsx src/cli/index.ts entries test-off --schema cms_<client> --id <entry-uuid>
```

### Step 8: Commit and Push

## Sub-Agent Dispatch Template

When spawning sub-agents for page wiring, include ALL of the following in the prompt.

### Required Prompt Sections

**1. CLI Setup:**
```
ALL CMS operations go through the CLI. No raw SQL. No Supabase REST API.

Setup:
cd /tmp/bullfinch-cms
export SUPABASE_URL=<your-url>
export SUPABASE_SERVICE_ROLE_KEY=<your-key>

Commands:
npx tsx src/cli/index.ts models create --schema <schema> --name '<Name>' --api-id <id> --fields /tmp/<file>.json
npx tsx src/cli/index.ts entries create --schema <schema> --model <api_id> --title '<Title>' --fields /tmp/<file>.json --status published
npx tsx src/cli/index.ts entries test-on --schema <schema> --id <entry-uuid>
npx tsx src/cli/index.ts entries test-off --schema <schema> --id <entry-uuid>

Valid field types: short_text, rich_text, number, boolean, date, datetime, color, select, media, reference, button, array, url, email, slug
BLOCKED types: json (removed), long_text (use rich_text instead)

Field type conventions:
- Headings/labels/badges → short_text
- Body copy/descriptions → rich_text
- URLs → url
- Images → media
- Buttons → button (object with text + url)
- Repeating items → array (with options.item_fields)

The CLI validates everything. If it rejects your input, fix it — don't try to bypass.
```

**2. CSS background images:**
```
Check for images in BOTH <img src> attributes AND CSS background-image properties.
Hero sections almost always use CSS backgrounds. Wire with CSS custom property pattern:
  style={`--hero-bg: url('${backgroundImage}')`} on the element
  background-image: var(--hero-bg, url('/fallback.webp')) in CSS
Never url(var(...)) — that double-wraps and breaks.
```

**3. Test mode:**
```
After creating the entry, enable test mode:
  npx tsx src/cli/index.ts entries test-on --schema <schema> --id <entry-uuid>
After wiring, verify:
  curl -s http://localhost:<port>/<page> | grep -o '111' | wc -l  → must be > 0
  curl -s http://localhost:<port>/<page> | grep -o 'placehold.co' | wc -l  → must be > 0 if page has images
If counts are 0, wiring is broken. Fix before reporting success.
When done: npx tsx src/cli/index.ts entries test-off --schema <schema> --id <entry-uuid>
```

**4. Page mapping guidance:**
```
Read the page file and ALL components it imports. Extract every piece of client-editable content.
CMS fields = headings, text, badges, buttons (use button type), images, repeating arrays.
NOT CMS fields = decorative SVGs, animations, CSS, structural dividers, navbar, footer.
Prefix all fields with section name: hero_heading, team_badge, why_description.
Image URLs = full absolute URLs from live site.
Rich text values must be HTML-wrapped: "<p>text here</p>".
Field order = grouped by section, in page reading order.
```

**5. Every step must be listed as mandatory with verification.**

### Common Failures (Historical)
| Failure | Root Cause | Mitigated By |
|---------|-----------|--------------|
| Wrong CMS field types via raw SQL | Agents assumed type names | CLI validation (hard block) |
| Used `long_text` for body copy | Didn't know about `rich_text` | CLI convention enforcement |
| Used `json` instead of `array` | Lazy catch-all | `json` removed from CLI |
| Skipped test verification | Treated as optional | Test mode CLI commands |
| Missed CSS background images | Only looked for `<img>` tags | Mandatory prompt section |
| Double-wrapped CSS url() | Used `url(var(--bg))` | Prompt includes correct pattern |
| Paired text+url instead of button | Didn't know button type existed | CLI warns on paired fields |

## Common Gotchas

- **RLS blocks anon reads** — always add public SELECT policies
- **Dual React** — fix with `resolve.dedupe` in Vite config
- **`@source` path** — relative to CSS file, not project root
- **Field order in models** — clients see fields in the order defined
- **CSS background images** — use CSS custom property pattern, not hardcoded
- **SEO goes in `seo` column** — not as model fields
- **Init runs all migrations** — new schemas are always fully configured
