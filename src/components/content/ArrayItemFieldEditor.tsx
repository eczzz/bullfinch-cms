import React from 'react';
import { Plus, X } from 'lucide-react';
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
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
        Array Item Fields
      </label>

      {fields.map((f, i) => (
        <div
          key={f.id}
          className="flex items-start gap-2 p-3 bg-white rounded-lg ring-1 ring-gray-200"
        >
          <div className="flex-1 space-y-2">
            <input
              type="text"
              value={f.name}
              onChange={(e) => {
                const name = e.target.value;
                const api_identifier = generateApiIdentifier(name);
                updateSubField(i, { name, api_identifier });
              }}
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              placeholder="Field name"
            />
            <FieldTypeSelector
              value={f.field_type}
              onChange={(field_type) => updateSubField(i, { field_type })}
            />
          </div>
          <button
            type="button"
            onClick={() => removeSubField(i)}
            className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all mt-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addSubField}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Add sub-field
      </button>
    </div>
  );
}
