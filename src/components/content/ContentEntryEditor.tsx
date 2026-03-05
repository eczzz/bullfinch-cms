import React, { useEffect, useState } from 'react';
import { Save, ArrowLeft, Eye, Code, FileText } from 'lucide-react';
import { useSupabase, useCMS } from '../provider';
import {
  fetchContentModel,
  fetchContentEntry,
  createContentEntry,
  updateContentEntry,
  updateEntryStatus,
  updateEntrySEO,
} from '../../core/queries';
import { getDefaultFieldValues, validateAllFields } from '../../core/helpers';
import { DynamicField } from './DynamicField';
import { SEOPanel } from '../common/SEOPanel';
import { JsonViewer } from './JsonViewer';
import { Toast } from '../common/Toast';
import type { ContentModel, ContentEntry, CMSRoute, EntryStatus, SEOData } from '../../core/types';

interface ContentEntryEditorProps {
  modelId: string;
  entryId?: string;
  onNavigate: (route: CMSRoute) => void;
}

export function ContentEntryEditor({ modelId, entryId, onNavigate }: ContentEntryEditorProps) {
  const supabase = useSupabase();
  const { user, config } = useCMS();
  const [model, setModel] = useState<ContentModel | null>(null);
  const [title, setTitle] = useState('');
  const [fields, setFields] = useState<Record<string, unknown>>({});
  const [status, setStatus] = useState<EntryStatus>('draft');
  const [seo, setSeo] = useState<SEOData>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [showSeo, setShowSeo] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; title: string; message?: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [modelId, entryId]);

  const loadData = async () => {
    try {
      const m = await fetchContentModel(supabase, modelId);
      setModel(m);

      if (entryId) {
        const entry = await fetchContentEntry(supabase, entryId);
        if (entry) {
          setTitle(entry.title);
          setFields(entry.fields as Record<string, unknown>);
          setStatus(entry.status);
          setSeo(entry.seo || {});
        }
      } else if (m) {
        setFields(getDefaultFieldValues(m.fields));
      }
    } catch (err) {
      console.error('Error loading entry:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (newStatus?: EntryStatus) => {
    if (!model || !user) return;

    if (!title.trim()) {
      setErrors({ title: 'Title is required' });
      return;
    }

    const validation = validateAllFields(model.fields, fields);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setSaving(true);

    try {
      let entry: Partial<ContentEntry> = {
        title,
        fields,
        status: newStatus || status,
      };

      if (config.hooks?.onBeforeSave) {
        entry = await config.hooks.onBeforeSave(entry);
      }

      if (entryId) {
        const saved = await updateContentEntry(supabase, entryId, entry);
        if (Object.keys(seo).length > 0) {
          await updateEntrySEO(supabase, entryId, seo);
        }
        if (newStatus) {
          await updateEntryStatus(supabase, entryId, newStatus);
          setStatus(newStatus);
        }
        if (config.hooks?.onAfterSave) await config.hooks.onAfterSave(saved);
        setToast({ type: 'success', title: 'Entry saved' });
      } else {
        const saved = await createContentEntry(supabase, {
          ...entry,
          content_model_id: modelId,
          created_by: user.id,
          seo: Object.keys(seo).length > 0 ? seo : undefined,
        });
        if (config.hooks?.onAfterSave) await config.hooks.onAfterSave(saved);
        setToast({ type: 'success', title: 'Entry created' });
        onNavigate({ page: 'content-entry-editor', modelId, entryId: saved.id });
      }
    } catch (err: any) {
      setToast({ type: 'error', title: 'Save failed', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (apiId: string, value: unknown) => {
    setFields((prev) => ({ ...prev, [apiId]: value }));
    if (errors[apiId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[apiId];
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="bcms-p-8 bcms-space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bcms-h-12 bcms-bg-gray-200 bcms-rounded-lg bcms-animate-pulse" />
        ))}
      </div>
    );
  }

  if (!model) {
    return (
      <div className="bcms-p-8 bcms-text-center bcms-text-gray-500">
        Content model not found.
      </div>
    );
  }

  const currentEntry: ContentEntry | null = entryId
    ? { id: entryId, content_model_id: modelId, title, fields, status, seo, published_at: null, created_by: user?.id || '', created_at: '', updated_at: '' }
    : null;

  return (
    <div className="bcms-p-8 bcms-max-w-4xl">
      {/* Header */}
      <div className="bcms-flex bcms-items-center bcms-justify-between bcms-mb-8">
        <div>
          <button
            onClick={() => onNavigate({ page: 'content-entries', modelId })}
            className="bcms-text-sm bcms-text-gray-500 hover:bcms-text-gray-700 bcms-flex bcms-items-center bcms-gap-1 bcms-mb-1"
          >
            <ArrowLeft className="bcms-w-4 bcms-h-4" /> Back to {model.name}
          </button>
          <h1 className="bcms-text-2xl bcms-font-bold bcms-text-gray-900">
            {entryId ? 'Edit Entry' : 'New Entry'}
          </h1>
        </div>
        <div className="bcms-flex bcms-items-center bcms-gap-2">
          {currentEntry && (
            <button
              onClick={() => setShowJson(true)}
              className="bcms-p-2 bcms-text-gray-400 hover:bcms-text-gray-600 hover:bcms-bg-gray-100 bcms-rounded-lg bcms-transition"
              title="View JSON"
            >
              <Code className="bcms-w-5 bcms-h-5" />
            </button>
          )}
          <button
            onClick={() => setShowSeo(!showSeo)}
            className={`bcms-p-2 bcms-rounded-lg bcms-transition ${showSeo ? 'bcms-bg-blue-100 bcms-text-blue-600' : 'bcms-text-gray-400 hover:bcms-text-gray-600 hover:bcms-bg-gray-100'}`}
            title="SEO Settings"
          >
            <FileText className="bcms-w-5 bcms-h-5" />
          </button>
          {status === 'draft' && (
            <button
              onClick={() => handleSave('published')}
              disabled={saving}
              className="bcms-bg-green-600 bcms-text-white bcms-py-2.5 bcms-px-4 bcms-text-sm bcms-font-semibold bcms-rounded-lg hover:bcms-bg-green-700 bcms-transition bcms-flex bcms-items-center bcms-gap-2 disabled:bcms-opacity-50"
            >
              <Eye className="bcms-w-4 bcms-h-4" /> Publish
            </button>
          )}
          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="bcms-bg-blue-600 bcms-text-white bcms-py-2.5 bcms-px-6 bcms-text-sm bcms-font-semibold bcms-rounded-lg hover:bcms-bg-blue-700 bcms-transition bcms-flex bcms-items-center bcms-gap-2 bcms-shadow-lg disabled:bcms-opacity-50"
          >
            <Save className="bcms-w-4 bcms-h-4" /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Status Badge */}
      {entryId && (
        <div className="bcms-mb-6">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as EntryStatus)}
            className="bcms-px-3 bcms-py-1.5 bcms-text-xs bcms-font-medium bcms-border bcms-border-gray-300 bcms-rounded-lg"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      )}

      {/* Title */}
      <div className="bcms-mb-6">
        <label className="bcms-block bcms-text-sm bcms-font-medium bcms-text-gray-700 bcms-mb-1">
          Title <span className="bcms-text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (errors.title) setErrors((p) => { const n = { ...p }; delete n.title; return n; });
          }}
          className="bcms-w-full bcms-px-4 bcms-py-3 bcms-text-lg bcms-border bcms-border-gray-300 bcms-rounded-lg focus:bcms-ring-2 focus:bcms-ring-blue-500"
          placeholder="Entry title"
        />
        {errors.title && <p className="bcms-text-xs bcms-text-red-500 bcms-mt-1">{errors.title}</p>}
      </div>

      {/* Dynamic Fields */}
      <div className="bcms-space-y-6 bcms-bg-white bcms-rounded-xl bcms-shadow-sm bcms-border bcms-border-gray-200 bcms-p-6">
        {model.fields.map((field) => (
          <DynamicField
            key={field.id}
            field={field}
            value={fields[field.api_identifier]}
            onChange={(v) => updateField(field.api_identifier, v)}
            error={errors[field.api_identifier]}
          />
        ))}
        {model.fields.length === 0 && (
          <p className="bcms-text-sm bcms-text-gray-400 bcms-text-center bcms-py-8">
            This content model has no fields defined yet.
          </p>
        )}
      </div>

      {/* SEO Panel */}
      {showSeo && (
        <div className="bcms-mt-6">
          <SEOPanel seoData={seo} onChange={setSeo} />
        </div>
      )}

      {/* JSON Viewer */}
      {showJson && currentEntry && (
        <JsonViewer
          title={title}
          entry={currentEntry}
          model={model}
          onClose={() => setShowJson(false)}
        />
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
