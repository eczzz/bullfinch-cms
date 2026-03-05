import React from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { DynamicField } from './DynamicField';
import type { FieldDefinition } from '../../core/types';

interface ArrayFieldProps {
  itemFields: FieldDefinition[];
  value: Array<Record<string, unknown>>;
  onChange: (value: Array<Record<string, unknown>>) => void;
}

export function ArrayField({ itemFields, value, onChange }: ArrayFieldProps) {
  const addItem = () => {
    const defaults: Record<string, unknown> = {};
    for (const f of itemFields) {
      defaults[f.api_identifier] = f.field_type === 'boolean' ? false : f.field_type === 'number' ? 0 : '';
    }
    onChange([...value, defaults]);
  };

  const removeItem = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, fieldId: string, fieldValue: unknown) => {
    const updated = [...value];
    updated[index] = { ...updated[index], [fieldId]: fieldValue };
    onChange(updated);
  };

  return (
    <div className="bcms-space-y-3">
      {value.map((item, index) => (
        <div key={index} className="bcms-border bcms-border-gray-200 bcms-rounded-lg bcms-p-4 bcms-bg-gray-50">
          <div className="bcms-flex bcms-items-center bcms-justify-between bcms-mb-3">
            <div className="bcms-flex bcms-items-center bcms-gap-2">
              <GripVertical className="bcms-w-4 bcms-h-4 bcms-text-gray-300" />
              <span className="bcms-text-xs bcms-font-medium bcms-text-gray-500">Item {index + 1}</span>
            </div>
            <button
              onClick={() => removeItem(index)}
              className="bcms-p-1 bcms-text-gray-400 hover:bcms-text-red-600 bcms-transition"
            >
              <Trash2 className="bcms-w-4 bcms-h-4" />
            </button>
          </div>
          <div className="bcms-space-y-4">
            {itemFields.map((field) => (
              <DynamicField
                key={field.id}
                field={field}
                value={item[field.api_identifier]}
                onChange={(v) => updateItem(index, field.api_identifier, v)}
              />
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={addItem}
        className="bcms-w-full bcms-border-2 bcms-border-dashed bcms-border-gray-300 bcms-rounded-lg bcms-py-3 bcms-text-sm bcms-text-gray-500 hover:bcms-border-blue-400 hover:bcms-text-blue-600 bcms-transition bcms-flex bcms-items-center bcms-justify-center bcms-gap-2"
      >
        <Plus className="bcms-w-4 bcms-h-4" /> Add Item
      </button>
    </div>
  );
}
