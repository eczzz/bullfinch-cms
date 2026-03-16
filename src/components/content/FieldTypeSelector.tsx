import React from 'react';
import { Type, Hash, Calendar, Image, Link, ToggleLeft, List, Code, Mail, Palette, Tag, MousePointer, Layers, Globe, FileText } from 'lucide-react';
import type { FieldType } from '../../core/types';

// ─── Type definitions with categories ───────────────────────────────────────

interface FieldTypeOption {
  value: FieldType;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: 'text' | 'number' | 'media' | 'relations' | 'advanced';
}

const FIELD_TYPE_OPTIONS: FieldTypeOption[] = [
  // Text
  { value: 'short_text', label: 'Short Text', description: 'Single-line text input', icon: <Type className="w-4 h-4" />, category: 'text' },
  { value: 'long_text', label: 'Long Text', description: 'Multi-line text area', icon: <FileText className="w-4 h-4" />, category: 'text' },
  { value: 'rich_text', label: 'Rich Text', description: 'WYSIWYG editor', icon: <Type className="w-4 h-4" />, category: 'text' },
  { value: 'slug', label: 'Slug', description: 'URL-friendly identifier', icon: <Tag className="w-4 h-4" />, category: 'text' },
  // Number
  { value: 'number', label: 'Number', description: 'Numeric input', icon: <Hash className="w-4 h-4" />, category: 'number' },
  { value: 'boolean', label: 'Boolean', description: 'True/false toggle', icon: <ToggleLeft className="w-4 h-4" />, category: 'number' },
  { value: 'date', label: 'Date', description: 'Date picker', icon: <Calendar className="w-4 h-4" />, category: 'number' },
  { value: 'datetime', label: 'Date & Time', description: 'Date and time picker', icon: <Calendar className="w-4 h-4" />, category: 'number' },
  { value: 'color', label: 'Color', description: 'Color picker', icon: <Palette className="w-4 h-4" />, category: 'number' },
  // Media
  { value: 'media', label: 'Media', description: 'File/image upload', icon: <Image className="w-4 h-4" />, category: 'media' },
  { value: 'url', label: 'URL', description: 'Web address', icon: <Globe className="w-4 h-4" />, category: 'media' },
  { value: 'email', label: 'Email', description: 'Email address', icon: <Mail className="w-4 h-4" />, category: 'media' },
  { value: 'button', label: 'Button', description: 'Link text + URL', icon: <MousePointer className="w-4 h-4" />, category: 'media' },
  // Relations
  { value: 'reference', label: 'Reference', description: 'Link to another entry', icon: <Link className="w-4 h-4" />, category: 'relations' },
  { value: 'select', label: 'Select', description: 'Dropdown options', icon: <List className="w-4 h-4" />, category: 'relations' },
  // Advanced
  { value: 'array', label: 'Array', description: 'Repeatable group', icon: <Layers className="w-4 h-4" />, category: 'advanced' },
  { value: 'json', label: 'JSON', description: 'Raw JSON data', icon: <Code className="w-4 h-4" />, category: 'advanced' },
];

const CATEGORIES: Array<{ key: string; label: string }> = [
  { key: 'text', label: 'Text' },
  { key: 'number', label: 'Number & Date' },
  { key: 'media', label: 'Media & Links' },
  { key: 'relations', label: 'Relations' },
  { key: 'advanced', label: 'Advanced' },
];

// ─── Grid selector (used when adding a new field) ───────────────────────────

interface FieldTypeSelectorGridProps {
  onSelect: (type: string) => void;
  onCancel: () => void;
}

// ─── Dropdown selector (used inline in FieldEditor) ─────────────────────────

interface FieldTypeSelectorDropdownProps {
  value: FieldType;
  onChange: (type: FieldType) => void;
}

// ─── Unified component: detects mode by props ───────────────────────────────

type FieldTypeSelectorProps =
  | (FieldTypeSelectorGridProps & { value?: undefined; onChange?: undefined })
  | (FieldTypeSelectorDropdownProps & { onSelect?: undefined; onCancel?: undefined });

export function FieldTypeSelector(props: FieldTypeSelectorProps) {
  // Dropdown mode (inline in FieldEditor)
  if ('value' in props && props.value !== undefined) {
    return (
      <select
        value={props.value}
        onChange={(e) => props.onChange!(e.target.value as FieldType)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
      >
        {FIELD_TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label} — {opt.description}
          </option>
        ))}
      </select>
    );
  }

  // Grid mode (pick new field type)
  const { onSelect, onCancel } = props as FieldTypeSelectorGridProps;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-900">Choose Field Type</h4>
        <button
          onClick={onCancel}
          className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
        >
          Cancel
        </button>
      </div>

      {CATEGORIES.map((cat) => {
        const items = FIELD_TYPE_OPTIONS.filter((o) => o.category === cat.key);
        if (items.length === 0) return null;
        return (
          <div key={cat.key}>
            <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{cat.label}</h5>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {items.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onSelect(opt.value)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-300 hover:shadow-sm transition-all text-center group"
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-50 group-hover:bg-blue-100 flex items-center justify-center text-gray-500 group-hover:text-blue-600 transition-all">
                    {opt.icon}
                  </div>
                  <span className="text-xs font-medium text-gray-700 group-hover:text-blue-700">{opt.label}</span>
                  <span className="text-[10px] text-gray-400 leading-tight">{opt.description}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { FIELD_TYPE_OPTIONS };
