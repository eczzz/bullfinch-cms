import React, { useEffect, useState } from 'react';
import { Save, Trash2, GripVertical, ChevronDown, ChevronUp, Plus, ArrowLeft, Type, Hash, Calendar, Image, Link, ToggleLeft, List, Code, Mail, Palette, Tag, MousePointer, Layers } from 'lucide-react';
import { useSupabase, useUser } from '../provider';
import { fetchContentModel, createContentModel, updateContentModel, deleteContentModel } from '../../core/queries';
import { generateApiIdentifier } from '../../core/helpers';
import { navigate } from '../../core/router';
import { Toast } from '../common/Toast';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { FieldEditor } from './FieldEditor';
import { FieldTypeSelector } from './FieldTypeSelector';
import type { ContentModel, FieldDefinition } from '../../core/types';

interface ContentModelEditorProps {
  modelId?: string;
}

const ICONS = ['📄', '📝', '📰', '📦', '🎯', '🏷️', '📸', '🎨', '🛒', '📊', '👤', '🗂️', '💼', '🌐', '📁', '⭐'];

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

export function ContentModelEditor({ modelId }: ContentModelEditorProps) {
  const supabase = useSupabase();
  const user = useUser();
  const [name, setName] = useState('');
  const [apiIdentifier, setApiIdentifier] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('📄');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!modelId);
  const [autoSlug, setAutoSlug] = useState(!modelId);
  const [expandedField, setExpandedField] = useState<string | null>(null);
  const [showFieldTypeSelector, setShowFieldTypeSelector] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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
    setShowFieldTypeSelector(false);
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
      setTimeout(() => navigate('/models'), 1000);
    } catch (err: any) {
      setToast({ type: 'error', title: 'Save failed', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!modelId) return;
    try {
      await deleteContentModel(supabase, modelId);
      setToast({ type: 'success', title: 'Model deleted' });
      setTimeout(() => navigate('/models'), 500);
    } catch (err: any) {
      setToast({ type: 'error', title: 'Delete failed', message: err.message });
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-4 bg-gray-100 rounded animate-pulse" />
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm ring-1 ring-gray-200 p-6 space-y-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}
          </div>
          <div className="lg:col-span-3 bg-white rounded-lg shadow-sm ring-1 ring-gray-200 p-6 space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm">
        <button
          onClick={() => navigate('/models')}
          className="text-gray-400 hover:text-gray-600 transition-all"
        >
          Content Models
        </button>
        <span className="text-gray-300">›</span>
        <span className="text-gray-900 font-medium">{modelId ? name || 'Edit Model' : 'New Model'}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/models')}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 ring-1 ring-gray-200 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">
            {modelId ? name || 'Edit Model' : 'New Content Model'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {modelId && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg px-3 py-2 text-sm transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Model details */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-200 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Model Details</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                placeholder="e.g. Blog Post"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">API Identifier</label>
              <input
                type="text"
                value={apiIdentifier}
                onChange={(e) => { setApiIdentifier(e.target.value); setAutoSlug(false); }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                placeholder="e.g. blog_post"
              />
              <p className="mt-1 text-xs text-gray-400">Auto-generated from name. Used in the API.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all resize-none"
                rows={3}
                placeholder="Describe this content model…"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Icon</label>
              <div className="relative">
                <button
                  onClick={() => setShowIconPicker(!showIconPicker)}
                  className="w-12 h-12 rounded-lg border border-gray-200 flex items-center justify-center text-xl hover:bg-gray-50 transition-all"
                >
                  {icon}
                </button>
                {showIconPicker && (
                  <div className="absolute top-14 left-0 z-10 bg-white rounded-lg shadow-lg ring-1 ring-gray-200 p-3 grid grid-cols-8 gap-1">
                    {ICONS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => { setIcon(emoji); setShowIconPicker(false); }}
                        className={`w-8 h-8 rounded-md flex items-center justify-center text-sm hover:bg-blue-50 transition-all ${icon === emoji ? 'bg-blue-50 ring-1 ring-blue-200' : ''}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* View entries link for existing models */}
            {modelId && (
              <div className="pt-2 border-t border-gray-100">
                <button
                  onClick={() => navigate(`/models/${modelId}/entries`)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-all"
                >
                  View Entries →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Fields list */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">
                Fields <span className="text-gray-400 font-normal">({fields.length})</span>
              </h2>
              <button
                onClick={() => setShowFieldTypeSelector(true)}
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5 text-xs font-medium shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Add Field
              </button>
            </div>

            {fields.length === 0 ? (
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Layers className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 mb-3">No fields defined yet</p>
                <button
                  onClick={() => setShowFieldTypeSelector(true)}
                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5 text-xs font-medium shadow-sm transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Add First Field
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    {/* Field row header */}
                    <div
                      className="flex items-center gap-2 px-3 py-2.5 bg-gray-50/50 cursor-pointer hover:bg-gray-50 transition-all"
                      onClick={() => setExpandedField(expandedField === field.id ? null : field.id)}
                    >
                      <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      <div className="w-7 h-7 rounded-md bg-white ring-1 ring-gray-200 flex items-center justify-center text-gray-500 flex-shrink-0">
                        {FIELD_TYPE_ICONS[field.field_type] || <Code className="w-3.5 h-3.5" />}
                      </div>
                      <span className="flex-1 text-sm font-medium text-gray-900 truncate">
                        {field.name || 'Unnamed field'}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-gray-100 text-gray-500 ring-1 ring-gray-200/60 flex-shrink-0">
                        {field.field_type}
                      </span>
                      {field.required && (
                        <span className="text-[10px] font-medium text-red-500 flex-shrink-0">required</span>
                      )}
                      <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => moveField(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-all"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveField(index, 'down')}
                          disabled={index === fields.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-all"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeField(index)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {/* Expanded field editor */}
                    {expandedField === field.id && (
                      <div className="p-4 border-t border-gray-100">
                        <FieldEditor
                          field={field}
                          onChange={(updates) => updateField(index, updates)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Field type selector modal */}
            {showFieldTypeSelector && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <FieldTypeSelector
                  onSelect={addField}
                  onCancel={() => setShowFieldTypeSelector(false)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title="Delete Content Model"
        message={`Are you sure you want to delete "${name}"? This will also delete all its entries. This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
