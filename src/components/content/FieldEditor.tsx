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
  const [expanded, setExpanded] = useState(true);

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
    <div className="bcms-border bcms-border-gray-200 bcms-rounded-lg bcms-bg-white">
      {/* Header */}
      <div
        className="bcms-flex bcms-items-center bcms-gap-2 bcms-px-4 bcms-py-3 bcms-cursor-pointer hover:bcms-bg-gray-50 bcms-transition"
        onClick={() => setExpanded(!expanded)}
      >
        <GripVertical className="bcms-w-4 bcms-h-4 bcms-text-gray-300 bcms-cursor-grab" />
        {expanded ? (
          <ChevronDown className="bcms-w-4 bcms-h-4 bcms-text-gray-400" />
        ) : (
          <ChevronRight className="bcms-w-4 bcms-h-4 bcms-text-gray-400" />
        )}
        <span className="bcms-flex-1 bcms-font-medium bcms-text-sm bcms-text-gray-900">
          {field.name || 'Untitled Field'}
        </span>
        <span className="bcms-text-xs bcms-text-gray-400 bcms-bg-gray-100 bcms-px-2 bcms-py-0.5 bcms-rounded">
          {field.field_type}
        </span>
        {onRemove && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="bcms-p-1 bcms-text-gray-400 hover:bcms-text-red-600 bcms-transition"
            title="Remove field"
          >
            <Trash2 className="bcms-w-4 bcms-h-4" />
          </button>
        )}
      </div>

      {/* Body */}
      {expanded && (
        <div className="bcms-px-4 bcms-pb-4 bcms-space-y-4 bcms-border-t bcms-border-gray-100 bcms-pt-4">
          <div className="bcms-grid bcms-grid-cols-2 bcms-gap-4">
            <div>
              <label className="bcms-block bcms-text-xs bcms-font-medium bcms-text-gray-500 bcms-mb-1">Name</label>
              <input
                type="text"
                value={field.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="bcms-w-full bcms-px-3 bcms-py-2 bcms-text-sm bcms-border bcms-border-gray-300 bcms-rounded-lg"
                placeholder="Field name"
              />
            </div>
            <div>
              <label className="bcms-block bcms-text-xs bcms-font-medium bcms-text-gray-500 bcms-mb-1">API Identifier</label>
              <input
                type="text"
                value={field.api_identifier}
                onChange={(e) => update({ api_identifier: e.target.value })}
                className="bcms-w-full bcms-px-3 bcms-py-2 bcms-text-sm bcms-border bcms-border-gray-300 bcms-rounded-lg bcms-font-mono"
                placeholder="field_name"
              />
            </div>
          </div>

          <div>
            <label className="bcms-block bcms-text-xs bcms-font-medium bcms-text-gray-500 bcms-mb-1">Type</label>
            <FieldTypeSelector value={field.field_type} onChange={handleTypeChange} />
          </div>

          <div>
            <label className="bcms-block bcms-text-xs bcms-font-medium bcms-text-gray-500 bcms-mb-1">Help Text</label>
            <input
              type="text"
              value={field.help_text || ''}
              onChange={(e) => update({ help_text: e.target.value })}
              className="bcms-w-full bcms-px-3 bcms-py-2 bcms-text-sm bcms-border bcms-border-gray-300 bcms-rounded-lg"
              placeholder="Optional help text"
            />
          </div>

          <div className="bcms-flex bcms-items-center bcms-gap-4">
            <label className="bcms-flex bcms-items-center bcms-gap-2 bcms-cursor-pointer">
              <input
                type="checkbox"
                checked={!!field.required}
                onChange={(e) => update({ required: e.target.checked })}
                className="bcms-w-4 bcms-h-4 bcms-rounded"
              />
              <span className="bcms-text-sm bcms-text-gray-600">Required</span>
            </label>
          </div>

          {/* Type-specific options */}
          {field.field_type === 'select' && (
            <div>
              <label className="bcms-block bcms-text-xs bcms-font-medium bcms-text-gray-500 bcms-mb-1">
                Choices (one per line: label|value)
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
                className="bcms-w-full bcms-px-3 bcms-py-2 bcms-text-sm bcms-border bcms-border-gray-300 bcms-rounded-lg bcms-font-mono"
                placeholder="Option 1|option_1&#10;Option 2|option_2"
              />
            </div>
          )}

          {field.field_type === 'reference' && (
            <div>
              <label className="bcms-block bcms-text-xs bcms-font-medium bcms-text-gray-500 bcms-mb-1">Reference Model</label>
              <select
                value={field.options?.reference_model_id || ''}
                onChange={(e) => updateOptions({ reference_model_id: e.target.value })}
                className="bcms-w-full bcms-px-3 bcms-py-2 bcms-text-sm bcms-border bcms-border-gray-300 bcms-rounded-lg"
              >
                <option value="">Select model...</option>
                {allModels.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          )}

          {field.field_type === 'number' && (
            <div className="bcms-grid bcms-grid-cols-3 bcms-gap-4">
              <div>
                <label className="bcms-block bcms-text-xs bcms-font-medium bcms-text-gray-500 bcms-mb-1">Min</label>
                <input type="number" value={field.options?.min ?? ''} onChange={(e) => updateOptions({ min: e.target.value ? Number(e.target.value) : undefined })} className="bcms-w-full bcms-px-3 bcms-py-2 bcms-text-sm bcms-border bcms-border-gray-300 bcms-rounded-lg" />
              </div>
              <div>
                <label className="bcms-block bcms-text-xs bcms-font-medium bcms-text-gray-500 bcms-mb-1">Max</label>
                <input type="number" value={field.options?.max ?? ''} onChange={(e) => updateOptions({ max: e.target.value ? Number(e.target.value) : undefined })} className="bcms-w-full bcms-px-3 bcms-py-2 bcms-text-sm bcms-border bcms-border-gray-300 bcms-rounded-lg" />
              </div>
              <div>
                <label className="bcms-block bcms-text-xs bcms-font-medium bcms-text-gray-500 bcms-mb-1">Step</label>
                <input type="number" value={field.options?.step ?? ''} onChange={(e) => updateOptions({ step: e.target.value ? Number(e.target.value) : undefined })} className="bcms-w-full bcms-px-3 bcms-py-2 bcms-text-sm bcms-border bcms-border-gray-300 bcms-rounded-lg" />
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
    </div>
  );
}
