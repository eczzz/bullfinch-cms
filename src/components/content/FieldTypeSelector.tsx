import React from 'react';
import type { FieldType } from '../../core/types';

const FIELD_TYPE_OPTIONS: Array<{ value: FieldType; label: string; description: string }> = [
  { value: 'short_text', label: 'Short Text', description: 'Single-line text input' },
  { value: 'long_text', label: 'Long Text', description: 'Multi-line text area' },
  { value: 'rich_text', label: 'Rich Text', description: 'WYSIWYG editor' },
  { value: 'number', label: 'Number', description: 'Numeric input' },
  { value: 'boolean', label: 'Boolean', description: 'True/false toggle' },
  { value: 'date', label: 'Date', description: 'Date picker' },
  { value: 'datetime', label: 'Date & Time', description: 'Date and time picker' },
  { value: 'media', label: 'Media', description: 'File/image picker' },
  { value: 'reference', label: 'Reference', description: 'Link to another entry' },
  { value: 'select', label: 'Select', description: 'Dropdown options' },
  { value: 'color', label: 'Color', description: 'Color picker' },
  { value: 'url', label: 'URL', description: 'Web address' },
  { value: 'email', label: 'Email', description: 'Email address' },
  { value: 'slug', label: 'Slug', description: 'URL-friendly identifier' },
  { value: 'button', label: 'Button', description: 'Link text + URL' },
  { value: 'array', label: 'Array', description: 'Repeatable group of fields' },
  { value: 'json', label: 'JSON', description: 'Raw JSON data' },
];

interface FieldTypeSelectorProps {
  value: FieldType;
  onChange: (type: FieldType) => void;
}

export function FieldTypeSelector({ value, onChange }: FieldTypeSelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as FieldType)}
      className="bcms-w-full bcms-px-4 bcms-py-2 bcms-text-sm bcms-border bcms-border-gray-300 bcms-rounded-lg"
    >
      {FIELD_TYPE_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label} — {opt.description}
        </option>
      ))}
    </select>
  );
}

export { FIELD_TYPE_OPTIONS };
