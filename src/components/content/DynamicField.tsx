import React from 'react';
import type { FieldDefinition } from '../../core/types';
import { RichTextEditor } from '../common/RichTextEditor';
import { ArrayField } from './ArrayField';
import { ButtonField } from './ButtonField';
import { MediaPicker } from './MediaPicker';
import { ReferencePicker } from './ReferencePicker';

interface DynamicFieldProps {
  field: FieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  disabled?: boolean;
}

export function DynamicField({ field, value, onChange, error, disabled }: DynamicFieldProps) {
  const baseInputClass =
    'bcms-w-full bcms-px-4 bcms-py-2 bcms-text-sm bcms-border bcms-border-gray-300 bcms-rounded-lg focus:bcms-ring-2 focus:bcms-ring-blue-500 focus:bcms-border-blue-500 bcms-transition disabled:bcms-bg-gray-100 disabled:bcms-cursor-not-allowed';

  const renderInput = () => {
    switch (field.field_type) {
      case 'short_text':
      case 'url':
      case 'email':
      case 'slug':
        return (
          <input
            type={field.field_type === 'email' ? 'email' : field.field_type === 'url' ? 'url' : 'text'}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            className={baseInputClass}
            placeholder={field.options?.placeholder || field.name}
            disabled={disabled}
          />
        );

      case 'long_text':
        return (
          <textarea
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            rows={field.options?.rows || 4}
            className={`${baseInputClass} bcms-resize-none`}
            placeholder={field.options?.placeholder || field.name}
            disabled={disabled}
          />
        );

      case 'rich_text':
        return (
          <RichTextEditor
            content={(value as string) || ''}
            onChange={(v) => onChange(v)}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value !== undefined && value !== null ? String(value) : ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
            className={baseInputClass}
            min={field.options?.min}
            max={field.options?.max}
            step={field.options?.step}
            disabled={disabled}
          />
        );

      case 'boolean':
        return (
          <label className="bcms-flex bcms-items-center bcms-gap-3 bcms-cursor-pointer">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => onChange(e.target.checked)}
              className="bcms-w-5 bcms-h-5 bcms-rounded bcms-border-gray-300"
              disabled={disabled}
            />
            <span className="bcms-text-sm bcms-text-gray-600">{field.help_text || 'Enabled'}</span>
          </label>
        );

      case 'date':
        return (
          <input
            type="date"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            className={baseInputClass}
            disabled={disabled}
          />
        );

      case 'datetime':
        return (
          <input
            type="datetime-local"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            className={baseInputClass}
            disabled={disabled}
          />
        );

      case 'color':
        return (
          <div className="bcms-flex bcms-items-center bcms-gap-3">
            <input
              type="color"
              value={(value as string) || '#000000'}
              onChange={(e) => onChange(e.target.value)}
              className="bcms-w-10 bcms-h-10 bcms-rounded bcms-cursor-pointer bcms-border-0"
              disabled={disabled}
            />
            <input
              type="text"
              value={(value as string) || ''}
              onChange={(e) => onChange(e.target.value)}
              className={baseInputClass}
              placeholder="#000000"
              disabled={disabled}
            />
          </div>
        );

      case 'select':
        return (
          <select
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            className={baseInputClass}
            disabled={disabled}
          >
            <option value="">Select...</option>
            {field.options?.choices?.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
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
            value={(value as any) || { text: '', url: '', target: '_self' }}
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
            className={`${baseInputClass} bcms-font-mono bcms-text-xs`}
            placeholder="{}"
            disabled={disabled}
          />
        );

      default:
        return (
          <div className="bcms-text-sm bcms-text-red-500">
            Unsupported field type: {field.field_type}
          </div>
        );
    }
  };

  return (
    <div className="bcms-space-y-1">
      {field.field_type !== 'boolean' && (
        <label className="bcms-block bcms-text-sm bcms-font-medium bcms-text-gray-700">
          {field.name}
          {field.required && <span className="bcms-text-red-500 bcms-ml-1">*</span>}
        </label>
      )}
      {field.help_text && field.field_type !== 'boolean' && (
        <p className="bcms-text-xs bcms-text-gray-400">{field.help_text}</p>
      )}
      {renderInput()}
      {error && <p className="bcms-text-xs bcms-text-red-500">{error}</p>}
    </div>
  );
}
