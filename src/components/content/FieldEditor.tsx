import React, { useState } from 'react';
import { Trash2, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { FieldTypeSelector } from './FieldTypeSelector';
import { ArrayItemFieldEditor } from './ArrayItemFieldEditor';
import type { FieldDefinition, FieldType, FieldOptions } from '../../core/types';
import { generateApiIdentifier } from '../../core/helpers';

interface FieldEditorProps {
  field: FieldDefinition;
  onChange: (field: Partial<FieldDefinition>) => void;
  onRemove?: () => void;
  allModels?: Array<{ id: string; name: string }>;
}

export function FieldEditor({ field, onChange, onRemove, allModels = [] }: FieldEditorProps) {
  const update = (partial: Partial<FieldDefinition>) => {
    onChange(partial);
  };

  const updateOptions = (partial: Partial<FieldOptions>) => {
    onChange({ options: { ...(field.options || {}), ...partial } });
  };

  const handleNameChange = (name: string) => {
    const updates: Partial<FieldDefinition> = { name };
    if (!field.api_identifier || field.api_identifier === generateApiIdentifier(field.name)) {
      updates.api_identifier = generateApiIdentifier(name);
    }
    update(updates);
  };

  const handleTypeChange = (field_type: FieldType) => {
    onChange({ field_type, options: {} });
  };

  return (
    <div className="space-y-5">
      {/* Section: Basic */}
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Basic</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
            <input
              type="text"
              value={field.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
              placeholder="Field name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">API Identifier</label>
            <input
              type="text"
              value={field.api_identifier}
              onChange={(e) => update({ api_identifier: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
              placeholder="field_name"
            />
          </div>
        </div>
      </div>

      {/* Section: Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
        <FieldTypeSelector value={field.field_type} onChange={handleTypeChange} />
      </div>

      {/* Section: Options (per-type) */}
      {(field.field_type === 'select' || field.field_type === 'reference' || field.field_type === 'number' || field.field_type === 'array') && (
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Options</h4>

          {field.field_type === 'select' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Choices <span className="text-gray-400 font-normal">(one per line: label|value)</span>
              </label>
              <textarea
                value={(field.options?.choices || []).map((c) => `${c.label}|${c.value}`).join('\n')}
                onChange={(e) => {
                  const choices = e.target.value
                    .split('\n')
                    .filter(Boolean)
                    .map((line) => {
                      const [label, value] = line.split('|');
                      return { label: label?.trim() || '', value: (value || label)?.trim() || '' };
                    });
                  updateOptions({ choices });
                }}
                rows={4}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all resize-none"
                placeholder="Option 1|option_1&#10;Option 2|option_2"
              />
            </div>
          )}

          {field.field_type === 'reference' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Reference Model</label>
              <select
                value={field.options?.reference_model_id || ''}
                onChange={(e) => updateOptions({ reference_model_id: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
              >
                <option value="">Select model…</option>
                {allModels.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          )}

          {field.field_type === 'number' && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Min</label>
                <input
                  type="number"
                  value={field.options?.min ?? ''}
                  onChange={(e) => updateOptions({ min: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Max</label>
                <input
                  type="number"
                  value={field.options?.max ?? ''}
                  onChange={(e) => updateOptions({ max: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Step</label>
                <input
                  type="number"
                  value={field.options?.step ?? ''}
                  onChange={(e) => updateOptions({ step: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                />
              </div>
            </div>
          )}

          {field.field_type === 'array' && (
            <ArrayItemFieldEditor
              fields={field.options?.item_fields || []}
              onChange={(item_fields) => updateOptions({ item_fields })}
              allModels={allModels}
            />
          )}
        </div>
      )}

      {/* Section: Validation */}
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Validation</h4>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Help Text</label>
            <input
              type="text"
              value={field.help_text || ''}
              onChange={(e) => update({ help_text: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
              placeholder="Optional help text shown below the field"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={!!field.required}
              onChange={(e) => update({ required: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500/20 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-sm text-gray-700 group-hover:text-gray-900">Required field</span>
          </label>
        </div>
      </div>
    </div>
  );
}
