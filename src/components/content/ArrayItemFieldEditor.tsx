import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { FieldTypeSelector } from './FieldTypeSelector';
import { generateApiIdentifier } from '../../core/helpers';
import type { FieldDefinition, FieldType } from '../../core/types';

interface ArrayItemFieldEditorProps {
  fields: FieldDefinition[];
  onChange: (fields: FieldDefinition[]) => void;
  allModels?: Array<{ id: string; name: string }>;
}

export function ArrayItemFieldEditor({ fields, onChange, allModels = [] }: ArrayItemFieldEditorProps) {
  const addSubField = () => {
    onChange([
      ...fields,
      {
        id: crypto.randomUUID(),
        name: '',
        api_identifier: '',
        field_type: 'short_text' as FieldType,
        required: false,
      },
    ]);
  };

  const updateSubField = (index: number, partial: Partial<FieldDefinition>) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], ...partial };
    onChange(updated);
  };

  const removeSubField = (index: number) => {
    onChange(fields.filter((_, i) => i !== index));
  };

  return (
    <div className="bcms-space-y-3">
      <label className="bcms-block bcms-text-xs bcms-font-medium bcms-text-gray-500">Array Item Fields</label>
      {fields.map((f, i) => (
        <div key={f.id} className="bcms-flex bcms-items-start bcms-gap-2 bcms-p-3 bcms-border bcms-border-gray-200 bcms-rounded-lg bcms-bg-gray-50">
          <div className="bcms-flex-1 bcms-space-y-2">
            <input
              type="text"
              value={f.name}
              onChange={(e) => {
                const name = e.target.value;
                const api_identifier = generateApiIdentifier(name);
                updateSubField(i, { name, api_identifier });
              }}
              className="bcms-w-full bcms-px-3 bcms-py-1.5 bcms-text-sm bcms-border bcms-border-gray-300 bcms-rounded"
              placeholder="Field name"
            />
            <FieldTypeSelector
              value={f.field_type}
              onChange={(field_type) => updateSubField(i, { field_type })}
            />
          </div>
          <button
            onClick={() => removeSubField(i)}
            className="bcms-p-1 bcms-text-gray-400 hover:bcms-text-red-600 bcms-transition bcms-mt-1"
          >
            <Trash2 className="bcms-w-4 bcms-h-4" />
          </button>
        </div>
      ))}
      <button
        onClick={addSubField}
        className="bcms-text-xs bcms-text-blue-600 hover:bcms-text-blue-700 bcms-flex bcms-items-center bcms-gap-1"
      >
        <Plus className="bcms-w-3 bcms-h-3" /> Add sub-field
      </button>
    </div>
  );
}
