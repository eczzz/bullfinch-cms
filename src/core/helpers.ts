import type { FieldDefinition, FieldValidationRules, FileValidationResult } from './types';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from './types';

// ─── Slug Generation ────────────────────────────────────────────────────────

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generateApiIdentifier(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/[\s]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// ─── Field Validation ───────────────────────────────────────────────────────

export function validateField(
  field: FieldDefinition,
  value: unknown
): { valid: boolean; error?: string } {
  if (field.required && (value === undefined || value === null || value === '')) {
    return { valid: false, error: `${field.name} is required` };
  }

  if (value === undefined || value === null || value === '') {
    return { valid: true };
  }

  const rules = field.validation;
  if (!rules) return { valid: true };

  if (typeof value === 'string') {
    if (rules.minLength && value.length < rules.minLength) {
      return { valid: false, error: `${field.name} must be at least ${rules.minLength} characters` };
    }
    if (rules.maxLength && value.length > rules.maxLength) {
      return { valid: false, error: `${field.name} must be at most ${rules.maxLength} characters` };
    }
    if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
      return { valid: false, error: rules.patternMessage || `${field.name} has invalid format` };
    }
  }

  if (typeof value === 'number') {
    if (rules.min !== undefined && value < rules.min) {
      return { valid: false, error: `${field.name} must be at least ${rules.min}` };
    }
    if (rules.max !== undefined && value > rules.max) {
      return { valid: false, error: `${field.name} must be at most ${rules.max}` };
    }
  }

  return { valid: true };
}

export function validateAllFields(
  fields: FieldDefinition[],
  values: Record<string, unknown>
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  let valid = true;

  for (const field of fields) {
    const result = validateField(field, values[field.api_identifier]);
    if (!result.valid) {
      valid = false;
      errors[field.api_identifier] = result.error!;
    }
  }

  return { valid, errors };
}

// ─── Default Field Values ───────────────────────────────────────────────────

export function getDefaultFieldValues(fields: FieldDefinition[]): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.default_value !== undefined) {
      values[field.api_identifier] = field.default_value;
    } else {
      switch (field.field_type) {
        case 'boolean':
          values[field.api_identifier] = false;
          break;
        case 'number':
          values[field.api_identifier] = 0;
          break;
        case 'array':
          values[field.api_identifier] = [];
          break;
        case 'json':
          values[field.api_identifier] = {};
          break;
        default:
          values[field.api_identifier] = '';
      }
    }
  }
  return values;
}

// ─── File Validation ────────────────────────────────────────────────────────

export function validateFile(file: File, accept?: string): FileValidationResult {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size ${formatFileSize(file.size)} exceeds maximum of ${formatFileSize(MAX_FILE_SIZE)}`,
    };
  }

  if (accept) {
    const acceptedTypes = accept.split(',').map((t) => t.trim());
    const isAccepted = acceptedTypes.some((type) => {
      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      }
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.replace('/*', '/'));
      }
      return file.type === type;
    });
    if (!isAccepted) {
      return { valid: false, error: `File type ${file.type} is not allowed` };
    }
  }

  return { valid: true };
}

// ─── Formatting Helpers ─────────────────────────────────────────────────────

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ─── Test Mode ──────────────────────────────────────────────────────────────

export function generateTestFields(
  currentFields: Record<string, unknown>,
  fieldDefinitions: FieldDefinition[]
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...currentFields };

  for (const field of fieldDefinitions) {
    const key = field.api_identifier;
    const value = currentFields[key];

    switch (field.field_type) {
      case 'short_text':
      case 'slug':
        result[key] = value && typeof value === 'string' ? `${value} 111` : 'test 111';
        break;

      case 'rich_text':
        result[key] = value && typeof value === 'string' ? `${value}<p>111</p>` : '<p>test 111</p>';
        break;

      case 'long_text':
        result[key] = value && typeof value === 'string' ? `${value} 111` : 'test 111';
        break;

      case 'email':
        result[key] = 'test111@example.com';
        break;

      case 'url':
        // Leave unchanged — breaking URLs doesn't help
        break;

      case 'media':
        result[key] = `https://placehold.co/800x600/e2e8f0/64748b?text=${encodeURIComponent(field.name)}`;
        break;

      case 'button': {
        const btn = (value && typeof value === 'object' && !Array.isArray(value))
          ? value as Record<string, unknown>
          : { text: '', url: '' };
        result[key] = {
          text: (btn.text && typeof btn.text === 'string' ? btn.text : '') + ' 111',
          url: btn.url || '',
        };
        break;
      }

      case 'array': {
        if (Array.isArray(value) && field.options?.item_fields && field.options.item_fields.length > 0) {
          result[key] = value.map((item) => {
            if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
              return generateTestFields(item as Record<string, unknown>, field.options!.item_fields!);
            }
            return item;
          });
        }
        break;
      }

      // number, boolean, date, datetime, color, select, reference, json — leave unchanged
      default:
        break;
    }
  }

  return result;
}

// ─── Misc ───────────────────────────────────────────────────────────────────

export function classNames(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '…';
}
