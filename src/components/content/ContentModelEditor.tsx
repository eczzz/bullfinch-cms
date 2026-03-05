import React, { useEffect, useState } from 'react';
import { ArrowLeft, Save, Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { useSupabase, useUser } from '../provider';
import { fetchContentModel, createContentModel, updateContentModel } from '../../core/queries';
import { generateApiIdentifier } from '../../core/helpers';
import { Toast } from '../common/Toast';
import { FieldEditor } from './FieldEditor';
import type { ContentModel, FieldDefinition, CMSRoute } from '../../core/types';

interface ContentModelEditorProps {
  modelId?: string;
  onNavigate: (route: CMSRoute) => void;
}

const FIELD_TYPES: Array<{ value: string; label: string; description: string }> = [
  { value: 'short_text', label: 'Short Text', description: 'Single-line text input' },
  { value: 'long_text', label: 'Long Text', description: 'Multi-line text area' },
  { value: 'rich_text', label: 'Rich Text', description: 'WYSIWYG editor with formatting' },
  { value: 'number', label: 'Number', description: 'Numeric input' },
  { value: 'boolean', label: 'Boolean', description: 'Toggle switch' },
  { value: 'date', label: 'Date', description: 'Date picker' },
  { value: 'datetime', label: 'Date & Time', description: 'Date and time picker' },
  { value: 'media', label: 'Media', description: 'Image or file upload' },
  { value: 'select', label: 'Select', description: 'Dropdown selection' },
  { value: 'array', label: 'Array', description: 'Repeatable group of fields' },
  { value: 'json', label: 'JSON', description: 'Raw JSON editor' },
  { value: 'url', label: 'URL', description: 'URL input' },
  { value: 'email', label: 'Email', description: 'Email input' },
  { value: 'color', label: 'Color', description: 'Color picker' },
  { value: 'slug', label: 'Slug', description: 'URL-friendly identifier' },
  { value: 'reference', label: 'Reference', description: 'Link to another entry' },
];

export function ContentModelEditor({ modelId, onNavigate }: ContentModelEditorProps) {
  const supabase = useSupabase();
  const user = useUser();
  const [name, setName] = useState('');
  const [apiIdentifier, setApiIdentifier] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('📄');
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!modelId);
  const [autoSlug, setAutoSlug] = useState(!modelId);
  const [expandedField, setExpandedField] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; title: string; message?: string } | null>(null);

  useEffect(() => {
    if (modelId) {
      fetchContentModel(supabase, modelId).then((model) => {
        if (model) {
          setName(model.name);
          setApiIdentifier(model.api_identifier);
          setDescription(model.description);
          setIcon(model.icon);
          setFields(model.fields);
        }
        setLoading(false);
      });
    }
  }, [modelId, supabase]);

  const handleNameChange = (value: string) => {
    setName(value);
    if (autoSlug) setApiIdentifier(generateApiIdentifier(value));
  };

  const addField = (type: string) => {
    const id = `field_${Date.now()}`;
    const newField: FieldDefinition = {
      id,
      name: '',
      api_identifier: '',
      field_type: type as any,
      required: false,
    };
    if (type === 'array') {
      newField.options = { item_fields: [] };
    }
    setFields([...fields, newField]);
    setExpandedField(id);
  };

  const updateField = (index: number, updates: Partial<FieldDefinition>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFields(newFields);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newFields.length) return;
    [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
    setFields(newFields);
  };

  const handleSave = async () => {
    if (!name || !apiIdentifier) {
      setToast({ type: 'error', title: 'Name and API identifier are required' });
      return;
    }
    setSaving(true);
    try {
      const modelData: Partial<ContentModel> = {
        name,
        api_identifier: apiIdentifier,
        description,
        icon,
        fields,
      };
      if (modelId) {
        await updateContentModel(supabase, modelId, modelData);
      } else {
        modelData.created_by = user?.id;
        await createContentModel(supabase, modelData);
      }
      setToast({ type: 'success', title: modelId ? 'Model updated' : 'Model created' });
      setTimeout(() => onNavigate({ page: 'content-models' }), 1000);
    } catch (err: any) {
      setToast({ type: 'error', title: 'Save failed', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="bcms-animate-pulse bcms-space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="bcms-h-12 bcms-bg-gray-200 bcms-rounded-lg" />)}</div>;
  }

  return (
    <div className="bcms-space-y-6">
      {/* Header */}
      <div className="bcms-flex bcms-items-center bcms-justify-between">
        <div className="bcms-flex bcms-items-center bcms-gap-4">
          <button onClick={() => onNavigate({ page: 'content-models' })} className="bcms-p-2 hover:bcms-bg-gray-100 bcms-rounded-lg bcms-transition">
            <ArrowLeft className="bcms-w-5 bcms-h-5" />
          </button>
          <h1 className="bcms-text-2xl bcms-font-bold bcms-text-gray-900">{modelId ? 'Edit Model' : 'New Content Model'}</h1>
        </div>
        <button onClick={handleSave} disabled={saving} className="bcms-bg-blue-600 bcms-text-white bcms-py-2.5 bcms-px-6 bcms-text-sm bcms-font-semibold bcms-rounded-lg hover:bcms-bg-blue-700 bcms-transition bcms-flex bcms-items-center bcms-gap-2 disabled:bcms-opacity-50">
          <Save className="bcms-w-4 bcms-h-4" /> {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Model Info */}
      <div className="bcms-bg-white bcms-rounded-xl bcms-shadow-sm bcms-border bcms-border-gray-200 bcms-p-6">
        <h2 className="bcms-text-lg bcms-font-semibold bcms-text-gray-900 bcms-mb-4">Model Information</h2>
        <div className="bcms-grid bcms-grid-cols-1 md:bcms-grid-cols-2 bcms-gap-4">
          <div>
            <label className="bcms-block bcms-text-sm bcms-font-medium bcms-text-gray-700 bcms-mb-1">Name</label>
            <input type="text" value={name} onChange={(e) => handleNameChange(e.target.value)} className="bcms-w-full bcms-px-4 bcms-py-2.5 bcms-text-sm bcms-border bcms-border-gray-300 bcms-rounded-lg focus:bcms-ring-2 focus:bcms-ring-blue-500" placeholder="e.g. Blog Post" />
          </div>
          <div>
            <label className="bcms-block bcms-text-sm bcms-font-medium bcms-text-gray-700 bcms-mb-1">API Identifier</label>
            <input type="text" value={apiIdentifier} onChange={(e) => { setApiIdentifier(e.target.value); setAutoSlug(false); }} className="bcms-w-full bcms-px-4 bcms-py-2.5 bcms-text-sm bcms-font-mono bcms-border bcms-border-gray-300 bcms-rounded-lg focus:bcms-ring-2 focus:bcms-ring-blue-500" placeholder="e.g. blog_post" />
          </div>
          <div className="md:bcms-col-span-2">
            <label className="bcms-block bcms-text-sm bcms-font-medium bcms-text-gray-700 bcms-mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="bcms-w-full bcms-px-4 bcms-py-2.5 bcms-text-sm bcms-border bcms-border-gray-300 bcms-rounded-lg focus:bcms-ring-2 focus:bcms-ring-blue-500" rows={2} placeholder="Describe this content model..." />
          </div>
          <div>
            <label className="bcms-block bcms-text-sm bcms-font-medium bcms-text-gray-700 bcms-mb-1">Icon (emoji)</label>
            <input type="text" value={icon} onChange={(e) => setIcon(e.target.value)} className="bcms-w-20 bcms-px-4 bcms-py-2.5 bcms-text-lg bcms-border bcms-border-gray-300 bcms-rounded-lg focus:bcms-ring-2 focus:bcms-ring-blue-500 bcms-text-center" />
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className="bcms-bg-white bcms-rounded-xl bcms-shadow-sm bcms-border bcms-border-gray-200 bcms-p-6">
        <h2 className="bcms-text-lg bcms-font-semibold bcms-text-gray-900 bcms-mb-4">Fields ({fields.length})</h2>

        {fields.length === 0 && (
          <div className="bcms-text-center bcms-py-8 bcms-text-gray-400 bcms-text-sm">
            No fields yet. Add your first field below.
          </div>
        )}

        <div className="bcms-space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="bcms-border bcms-border-gray-200 bcms-rounded-lg bcms-overflow-hidden">
              {/* Field header */}
              <div className="bcms-flex bcms-items-center bcms-gap-3 bcms-px-4 bcms-py-3 bcms-bg-gray-50 bcms-cursor-pointer" onClick={() => setExpandedField(expandedField === field.id ? null : field.id)}>
                <GripVertical className="bcms-w-4 bcms-h-4 bcms-text-gray-400" />
                <div className="bcms-flex-1">
                  <span className="bcms-font-medium bcms-text-sm bcms-text-gray-900">{field.name || 'Unnamed field'}</span>
                  <span className="bcms-ml-2 bcms-text-xs bcms-text-gray-400 bcms-font-mono">{field.field_type}</span>
                  {field.required && <span className="bcms-ml-2 bcms-text-xs bcms-text-red-500">*required</span>}
                </div>
                <div className="bcms-flex bcms-items-center bcms-gap-1" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => moveField(index, 'up')} disabled={index === 0} className="bcms-p-1 bcms-text-gray-400 hover:bcms-text-gray-600 disabled:bcms-opacity-30"><ChevronUp className="bcms-w-4 bcms-h-4" /></button>
                  <button onClick={() => moveField(index, 'down')} disabled={index === fields.length - 1} className="bcms-p-1 bcms-text-gray-400 hover:bcms-text-gray-600 disabled:bcms-opacity-30"><ChevronDown className="bcms-w-4 bcms-h-4" /></button>
                  <button onClick={() => removeField(index)} className="bcms-p-1 bcms-text-gray-400 hover:bcms-text-red-600"><Trash2 className="bcms-w-4 bcms-h-4" /></button>
                </div>
              </div>
              {/* Field editor */}
              {expandedField === field.id && (
                <div className="bcms-p-4 bcms-border-t bcms-border-gray-200">
                  <FieldEditor field={field} onChange={(updates) => updateField(index, updates)} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add field buttons */}
        <div className="bcms-mt-4">
          <p className="bcms-text-sm bcms-font-medium bcms-text-gray-700 bcms-mb-2">Add Field</p>
          <div className="bcms-flex bcms-flex-wrap bcms-gap-2">
            {FIELD_TYPES.map((ft) => (
              <button
                key={ft.value}
                onClick={() => addField(ft.value)}
                className="bcms-px-3 bcms-py-1.5 bcms-text-xs bcms-font-medium bcms-border bcms-border-gray-200 bcms-rounded-lg hover:bcms-bg-blue-50 hover:bcms-border-blue-300 hover:bcms-text-blue-700 bcms-transition"
                title={ft.description}
              >
                {ft.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
