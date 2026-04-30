import React from 'react';
import { Plus, X, ChevronUp, ChevronDown } from 'lucide-react';
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

  const moveItem = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return;
    const updated = [...value];
    const [item] = updated.splice(from, 1);
    updated.splice(to, 0, item);
    onChange(updated);
  };

  const updateItem = (index: number, fieldId: string, fieldValue: unknown) => {
    const updated = [...value];
    updated[index] = { ...updated[index], [fieldId]: fieldValue };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {value.map((item, index) => (
        <div
          key={index}
          className="bg-white rounded-lg ring-1 ring-gray-200 shadow-sm overflow-hidden"
        >
          {/* Item Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => moveItem(index, index - 1)}
                  disabled={index === 0}
                  className="inline-flex items-center justify-center w-5 h-3.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  title="Move up"
                  aria-label="Move item up"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(index, index + 1)}
                  disabled={index === value.length - 1}
                  className="inline-flex items-center justify-center w-5 h-3.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  title="Move down"
                  aria-label="Move item down"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-gray-200 text-[10px] font-semibold text-gray-600">
                {index + 1}
              </span>
              <span className="text-xs text-gray-500 font-medium">Item {index + 1}</span>
            </div>
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
              title="Remove item"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Item Fields */}
          <div className="p-4 space-y-4">
            {itemFields.map((field) => (
              <DynamicField
                key={field.id}
                field={field}
                value={item[field.api_identifier]}
                onChange={(v) => updateItem(index, field.api_identifier, v)}
                compact
              />
            ))}
          </div>
        </div>
      ))}

      {/* Add Item Button */}
      <button
        type="button"
        onClick={addItem}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-white text-gray-700 hover:bg-gray-50 ring-1 ring-gray-200 shadow-sm transition-all"
      >
        <Plus className="w-4 h-4" />
        Add Item
      </button>
    </div>
  );
}
