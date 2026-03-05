import React from 'react';
import { Plus } from 'lucide-react';
import { FieldEditor } from './FieldEditor';
import type { FieldDefinition } from '../../core/types';

interface FieldBuilderProps {
  fields: FieldDefinition[];
  onChange: (fields: FieldDefinition[]) => void;
  allModels?: Array<{ id: string; name: string }>;
}

export function FieldBuilder({ fields, onChange, allModels = [] }: FieldBuilderProps) {
  const addField = () => {
    const newField: FieldDefinition = {
      id: crypto.randomUUID(),
      name: '',
      api_identifier: '',
      field_type: 'short_text',
      required: false,
    };
    onChange([...fields, newField]);
  };

  const updateField = (index: number, field: FieldDefinition) => {
    const updated = [...fields];
    updated[index] = field;
    onChange(updated);
  };

  const removeField = (index: number) => {
    onChange(fields.filter((_, i) => i !== index));
  };

  return (
    <div className="bcms-space-y-3">
      <div className="bcms-flex bcms-items-center bcms-justify-between">
        <h3 className="bcms-text-sm bcms-font-semibold bcms-text-gray-900">Fields</h3>
        <button
          onClick={addField}
          className="bcms-bg-blue-600 bcms-text-white bcms-py-1.5 bcms-px-4 bcms-text-xs bcms-font-semibold bcms-rounded-lg hover:bcms-bg-blue-700 bcms-transition bcms-flex bcms-items-center bcms-gap-1"
        >
          <Plus className="bcms-w-3 bcms-h-3" /> Add Field
        </button>
      </div>

      {fields.length === 0 ? (
        <div className="bcms-border-2 bcms-border-dashed bcms-border-gray-200 bcms-rounded-lg bcms-p-8 bcms-text-center">
          <p className="bcms-text-sm bcms-text-gray-400 bcms-mb-3">No fields defined yet.</p>
          <button
            onClick={addField}
            className="bcms-bg-blue-600 bcms-text-white bcms-py-2 bcms-px-4 bcms-text-sm bcms-font-semibold bcms-rounded-lg hover:bcms-bg-blue-700 bcms-transition bcms-inline-flex bcms-items-center bcms-gap-1"
          >
            <Plus className="bcms-w-4 bcms-h-4" /> Add First Field
          </button>
        </div>
      ) : (
        <div className="bcms-space-y-2">
          {fields.map((field, i) => (
            <FieldEditor
              key={field.id}
              field={field}
              onChange={(partial) => updateField(i, { ...fields[i], ...partial } as FieldDefinition)}
              onRemove={() => removeField(i)}
              allModels={allModels}
            />
          ))}
        </div>
      )}
    </div>
  );
}
