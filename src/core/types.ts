import type { SupabaseClient } from '@supabase/supabase-js';

// ─── Field Definitions ──────────────────────────────────────────────────────

export type FieldType =
  | 'short_text'
  | 'long_text'
  | 'rich_text'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'media'
  | 'reference'
  | 'array'
  | 'json'
  | 'select'
  | 'color'
  | 'url'
  | 'email'
  | 'slug'
  | 'button';

export interface FieldDefinition {
  id: string;
  name: string;
  api_identifier: string;
  field_type: FieldType;
  required?: boolean;
  help_text?: string;
  default_value?: string;
  options?: FieldOptions;
  validation?: FieldValidationRules;
}

export interface FieldOptions {
  placeholder?: string;
  rows?: number;
  min?: number;
  max?: number;
  step?: number;
  choices?: Array<{ label: string; value: string }>;
  item_fields?: FieldDefinition[];
  reference_model_id?: string;
  multiple?: boolean;
  accept?: string;
  [key: string]: unknown;
}

export interface FieldValidationRules {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  patternMessage?: string;
  min?: number;
  max?: number;
}

// ─── Content Models ─────────────────────────────────────────────────────────

export interface ContentModel {
  id: string;
  name: string;
  api_identifier: string;
  description: string;
  icon: string;
  fields: FieldDefinition[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ─── Content Entries ────────────────────────────────────────────────────────

export type EntryStatus = 'draft' | 'published' | 'archived';

export interface ContentEntry {
  id: string;
  content_model_id: string;
  title: string;
  fields: Record<string, unknown>;
  status: EntryStatus;
  seo?: SEOData | null;
  published_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ─── Media ──────────────────────────────────────────────────────────────────

export interface MediaItem {
  id: string;
  filename: string;
  url: string;
  mime_type: string;
  size: number;
  uploaded_by: string;
  created_at: string;
}

// ─── Users ──────────────────────────────────────────────────────────────────

export type UserRole = 'Admin' | 'Editor' | 'Viewer';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

// ─── Settings ───────────────────────────────────────────────────────────────

export interface Setting {
  id: string;
  key: string;
  value: string;
  updated_at: string;
}

// ─── SEO ────────────────────────────────────────────────────────────────────

export interface SEOData {
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  structuredData?: string;
}

// ─── Branding ───────────────────────────────────────────────────────────────

export interface BrandingConfig {
  businessName: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  accentColor?: string;
}

// ─── Storage Adapter ────────────────────────────────────────────────────────

export interface StorageAdapter {
  upload(file: File): Promise<{ url: string; filename: string }>;
  delete?(url: string): Promise<void>;
  getPresignedUrl?(filename: string, contentType: string): Promise<{
    presignedUrl: string;
    publicUrl: string;
    filename: string;
  }>;
}

// ─── CMS Config ─────────────────────────────────────────────────────────────

export interface CMSConfig {
  branding?: Partial<BrandingConfig>;
  storage?: StorageAdapter;
  customFieldTypes?: Record<string, CustomFieldType>;
  sidebarItems?: SidebarItem[];
  hooks?: CMSHooks;
  basePath?: string;
}

export interface CustomFieldType {
  type: string;
  label: string;
  icon?: string;
  component: React.ComponentType<CustomFieldProps>;
}

export interface CustomFieldProps {
  field: FieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

export interface SidebarItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  path: string;
  component: React.ComponentType;
  position?: 'top' | 'bottom';
}

export interface CMSHooks {
  onBeforeSave?: (entry: Partial<ContentEntry>) => Partial<ContentEntry> | Promise<Partial<ContentEntry>>;
  onAfterSave?: (entry: ContentEntry) => void | Promise<void>;
  onBeforeDelete?: (entry: ContentEntry) => boolean | Promise<boolean>;
  onAfterDelete?: (entry: ContentEntry) => void | Promise<void>;
  onMediaUpload?: (file: File, result: MediaItem) => void | Promise<void>;
}

// ─── CMS Context ────────────────────────────────────────────────────────────

export interface CMSContextValue {
  supabase: SupabaseClient;
  config: CMSConfig;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// ─── Route State ────────────────────────────────────────────────────────────

export type CMSRoute =
  | { page: 'content-models' }
  | { page: 'content-model-editor'; id?: string }
  | { page: 'content-entries'; modelId: string }
  | { page: 'content-entry-editor'; modelId: string; entryId?: string }
  | { page: 'media' }
  | { page: 'settings' }
  | { page: 'users' }
  | { page: 'change-password' }
  | { page: 'custom'; path: string };

// ─── File Validation ────────────────────────────────────────────────────────

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  video: ['video/mp4', 'video/webm', 'video/ogg'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv',
  ],
};

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
