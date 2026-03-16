import React, { useState } from 'react';
import { Plus, GripVertical, Trash2, ChevronDown, ChevronRight, Type, Hash, Calendar, Image, Link, ToggleLeft, List, Code, Mail, Palette, Tag, MousePointer, Layers } from 'lucide-react';
import { FieldEditor } from './FieldEditor';
import { FieldTypeSelector } from './FieldTypeSelector';
import type { FieldDefinition } from '../../core/types';

interface FieldBuilderProps {
  fields: FieldDefinition[];
  onChange: (fields: FieldDefinition[]) => void;
  allModels?: Array<{ id: string; name: string }>;
}

const FIELD_TYPE_ICONS: Record<string, React.ReactNode> = {
  short_text: <Type className="w-3.5 h-3.5" />,
  long_text: <Type className="w-3.5 h-3.5" />,
  rich_text: <Type className="w-3.5 h-3.5" />,
  number: <Hash className="w-3.5 h-3.5" />,
  boolean: <ToggleLeft className="w-3.5 h-3.5" />,
  date: <Calendar className="w-3.5 h-3.5" />,
  datetime: <Calendar className="w-3.5 h-3.5" />,
  media: <Image className="w-3.5 h-3.5" />,
  reference: <Link className="w-3.5 h-3.5" />,
  select: <List className="w-3.5 h-3.5" />,
  color: <Palette className="w-3.5 h-3.5" />,
  url: <Link className="w-3.5 h-3.5" />,
  email: <Mail className="w-3.5 h-3.5" />,
  slug: <Tag className="w-3.5 h-3.5" />,
  button: <MousePointer className="w-3.5 h-3.5" />,
  array: <Layers className="w-3.5 h-3.5" />,
  json: <Code className="w-3.5 h-3.5" />,
};

export function FieldBuilder({ fields, onChange, allModels = [] }: FieldBuilderProps) {
  const [expandedField, setExpandedField] = useState<string | null>(null);
  const [showTypeSelector, setShowTypeSelector] = useState(false);

  const addField = (type: string) => {
    const newField: FieldDefinition = {
      id: crypto.randomUUID(),
      name: '',
      api_identifier: '',
      field_type: type as any,
      required: false,
    };
    if (type === 'array') {
      newField.options = { item_fields: [] };
    }
    onChange([...fields, newField]);
    setExpandedField(newField.id);
    setShowTypeSelector(false);
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Fields</h3>
        <button
          onClick={() => setShowTypeSelector(true)}
          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5 text-xs font-medium shadow-sm transition-all"
        >
          <Plus className="w-3 h-3" /> Add Field
        </button>
      </div>

      {fields.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <Layers className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500 mb-3">No fields defined yet</p>
          <button
            onClick={() => setShowTypeSelector(true)}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5 text-xs font-medium shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Add First Field
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {fields.map((field, i) => (
            <div key={field.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              {/* Field card header */}
              <div
                className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-all"
                onClick={() => setExpandedField(expandedField === field.id ? null : field.id)}
              >
                <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                <div className="w-7 h-7 rounded-md bg-gray-50 ring-1 ring-gray-200 flex items-center justify-center text-gray-500 flex-shrink-0">
                  {FIELD_TYPE_ICONS[field.field_type] || <Code className="w-3.5 h-3.5" />}
                </div>
                <span className="flex-1 text-sm font-medium text-gray-900 truncate">
                  {field.name || 'Untitled Field'}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-gray-100 text-gray-500 ring-1 ring-gray-200/60 flex-shrink-0">
                  {field.field_type}
                </span>
                {field.required && (
                  <span className="text-[10px] font-medium text-red-500 flex-shrink-0">required</span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); removeField(i); }}
                  className="p-1 text-gray-400 hover:text-red-600 transition-all flex-shrink-0"
                  title="Remove field"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                {expandedField === field.id
                  ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                }
              </div>
              {/* Expanded editor */}
              {expandedField === field.id && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-4">
                  <FieldEditor
                    field={field}
                    onChange={(partial) => updateField(i, { ...fields[i], ...partial } as FieldDefinition)}
                    onRemove={() => removeField(i)}
                    allModels={allModels}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Type selector */}
      {showTypeSelector && (
        <div className="border-t border-gray-100 pt-4">
          <FieldTypeSelector
            onSelect={addField}
            onCancel={() => setShowTypeSelector(false)}
          />
        </div>
      )}
    </div>
  );
}
