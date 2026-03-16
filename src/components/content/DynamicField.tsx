import React from 'react';
import { Globe, Mail, Link2, Hash, Palette } from 'lucide-react';
import type { FieldDefinition } from '../../core/types';
import { RichTextEditor } from '../common/RichTextEditor';
import { Dropdown } from '../common/Dropdown';
import { ArrayField } from './ArrayField';
import { ButtonField } from './ButtonField';
import { JsonViewer } from './JsonViewer';
import { MediaPicker } from './MediaPicker';
import { ReferencePicker } from './ReferencePicker';

interface DynamicFieldProps {
  field: FieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  disabled?: boolean;
  compact?: boolean;
}

const inputClass =
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed';

export function DynamicField({ field, value, onChange, error, disabled, compact }: DynamicFieldProps) {
  const renderInput = () => {
    switch (field.field_type) {
      case 'short_text':
        return (
          <input
            type="text"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
            placeholder={field.options?.placeholder || `Enter ${field.name.toLowerCase()}…`}
            disabled={disabled}
          />
        );

      case 'url':
        return (
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <Globe className="w-4 h-4 text-gray-400" />
            </div>
            <input
              type="url"
              value={(value as string) || ''}
              onChange={(e) => onChange(e.target.value)}
              className={`${inputClass} pl-9`}
              placeholder={field.options?.placeholder || 'https://…'}
              disabled={disabled}
            />
          </div>
        );

      case 'email':
        return (
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <Mail className="w-4 h-4 text-gray-400" />
            </div>
            <input
              type="email"
              value={(value as string) || ''}
              onChange={(e) => onChange(e.target.value)}
              className={`${inputClass} pl-9`}
              placeholder={field.options?.placeholder || 'name@example.com'}
              disabled={disabled}
            />
          </div>
        );

      case 'slug':
        return (
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <Link2 className="w-4 h-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={(value as string) || ''}
              onChange={(e) => onChange(e.target.value)}
              className={`${inputClass} pl-9 pr-20`}
              placeholder={field.options?.placeholder || 'url-slug'}
              disabled={disabled}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">auto-slug</span>
          </div>
        );

      case 'long_text':
        return (
          <textarea
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            rows={field.options?.rows || 4}
            className={`${inputClass} resize-none`}
            placeholder={field.options?.placeholder || `Enter ${field.name.toLowerCase()}…`}
            disabled={disabled}
          />
        );

      case 'rich_text':
        return (
          <RichTextEditor
            value={(value as string) || ''}
            onChange={(v) => onChange(v)}
          />
        );

      case 'number':
        return (
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <Hash className="w-4 h-4 text-gray-400" />
            </div>
            <input
              type="number"
              value={value !== undefined && value !== null ? String(value) : ''}
              onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
              className={`${inputClass} pl-9`}
              min={field.options?.min}
              max={field.options?.max}
              step={field.options?.step}
              disabled={disabled}
            />
          </div>
        );

      case 'boolean':
        return (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">{field.help_text || 'Enabled'}</p>
            </div>
            <button
              type="button"
              onClick={() => !disabled && onChange(!value)}
              className="relative flex-shrink-0"
              disabled={disabled}
            >
              <div className={`w-10 h-[22px] rounded-full p-[2px] cursor-pointer transition-colors duration-200 ${value ? 'bg-blue-600' : 'bg-gray-200'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <div className={`w-[18px] h-[18px] bg-white rounded-full shadow-sm transition-transform duration-200 ${value ? 'translate-x-[20px]' : 'translate-x-0'}`} />
              </div>
            </button>
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
            disabled={disabled}
          />
        );

      case 'datetime':
        return (
          <input
            type="datetime-local"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
            disabled={disabled}
          />
        );

      case 'color':
        return (
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="color"
                value={(value as string) || '#000000'}
                onChange={(e) => onChange(e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200 p-0.5"
                disabled={disabled}
              />
            </div>
            <div className="relative flex-1">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <Palette className="w-4 h-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={(value as string) || ''}
                onChange={(e) => onChange(e.target.value)}
                className={`${inputClass} pl-9`}
                placeholder="#000000"
                disabled={disabled}
              />
            </div>
          </div>
        );

      case 'select':
        return (
          <Dropdown
            options={field.options?.choices?.map((c) => ({ value: c.value, label: c.label })) || []}
            value={(value as string) || ''}
            onChange={(v) => onChange(v)}
          />
        );

      case 'media':
        return (
          <MediaPicker
            value={(value as string) || null}
            onChange={(url) => onChange(url || '')}
          />
        );

      case 'reference':
        return (
          <ReferencePicker
            modelId={field.options?.reference_model_id || ''}
            value={(value as string) || null}
            onChange={(id) => onChange(id || '')}
            required={field.required}
          />
        );

      case 'button':
        return (
          <ButtonField
            value={(value as any) || { text: '', url: '', target: '_self', style: 'primary' }}
            onChange={(v) => onChange(v)}
          />
        );

      case 'array':
        return (
          <ArrayField
            itemFields={field.options?.item_fields || []}
            value={Array.isArray(value) ? value : []}
            onChange={(v) => onChange(v)}
          />
        );

      case 'json':
        return (
          <div className="bg-gray-900 rounded-lg p-4 relative group">
            <button
              type="button"
              onClick={async () => {
                const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
                await navigator.clipboard.writeText(text);
              }}
              className="absolute top-2 right-2 p-1.5 rounded-md bg-gray-800 text-gray-400 hover:text-gray-200 opacity-0 group-hover:opacity-100 transition-all"
              title="Copy"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
            </button>
            <textarea
              value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
              onChange={(e) => {
                try {
                  onChange(JSON.parse(e.target.value));
                } catch {
                  onChange(e.target.value);
                }
              }}
              rows={6}
              className="w-full bg-transparent text-gray-100 font-mono text-sm focus:outline-none resize-none placeholder-gray-600"
              placeholder="{}"
              disabled={disabled}
            />
          </div>
        );

      default:
        return (
          <div className="px-3 py-2 text-sm text-red-500 bg-red-50 rounded-lg border border-red-200">
            Unsupported field type: {field.field_type}
          </div>
        );
    }
  };

  return (
    <div className={compact ? 'space-y-0.5' : 'space-y-1'}>
      {field.field_type !== 'boolean' && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {field.name}
          {field.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {field.help_text && field.field_type !== 'boolean' && (
        <p className="text-xs text-gray-400 mt-1 mb-1.5">{field.help_text}</p>
      )}
      {renderInput()}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
