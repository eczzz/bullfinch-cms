import React, { useEffect, useState, useRef } from 'react';
import { Save, ArrowLeft, Eye, Code, FileText, ChevronRight, MoreHorizontal, Archive, Trash2, Clock } from 'lucide-react';
import { useSupabase, useCMS } from '../provider';
import { navigate } from '../../core/router';
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
import type { ContentModel, ContentEntry, EntryStatus, SEOData } from '../../core/types';

interface ContentEntryEditorProps {
  modelId: string;
  entryId?: string;
}

const STATUS_CONFIG: Record<EntryStatus, { label: string; dot: string; bg: string; text: string; ring: string }> = {
  draft: { label: 'Draft', dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200/60' },
  published: { label: 'Published', dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200/60' },
  archived: { label: 'Archived', dot: 'bg-gray-400', bg: 'bg-gray-100', text: 'text-gray-600', ring: 'ring-gray-200/60' },
};

export function ContentEntryEditor({ modelId, entryId }: ContentEntryEditorProps) {
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
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; title: string; message?: string } | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const statusRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    loadData();
  }, [modelId, entryId]);

  // Track unsaved changes after initial load
  useEffect(() => {
    if (initialLoadDone.current) {
      setHasUnsavedChanges(true);
    }
  }, [title, fields, status, seo]);

  // Close menus on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setShowStatusMenu(false);
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setShowMoreMenu(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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
          setCreatedAt(entry.created_at);
          setUpdatedAt(entry.updated_at);
        }
      } else if (m) {
        setFields(getDefaultFieldValues(m.fields));
      }
    } catch (err) {
      console.error('Error loading entry:', err);
    } finally {
      setLoading(false);
      // Mark initial load as done after a tick so the useEffect doesn't fire
      setTimeout(() => { initialLoadDone.current = true; }, 0);
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
        setHasUnsavedChanges(false);
        setToast({ type: 'success', title: 'Entry saved' });
      } else {
        const saved = await createContentEntry(supabase, {
          ...entry,
          content_model_id: modelId,
          created_by: user.id,
          seo: Object.keys(seo).length > 0 ? seo : undefined,
        });
        if (config.hooks?.onAfterSave) await config.hooks.onAfterSave(saved);
        setHasUnsavedChanges(false);
        setToast({ type: 'success', title: 'Entry created' });
        navigate(`#/models/${modelId}/entries/${saved.id}`);
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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-100 animate-pulse" />
              <div className="h-5 w-48 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-24 bg-gray-100 rounded-lg animate-pulse" />
              <div className="h-9 w-20 bg-gray-100 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-3 gap-8">
            <div className="col-span-2 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-white rounded-lg border border-gray-200 animate-pulse" />
              ))}
            </div>
            <div className="space-y-4">
              <div className="h-48 bg-white rounded-lg border border-gray-200 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!model) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <FileText className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500">Content model not found.</p>
          <button
            onClick={() => navigate('#/models')}
            className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Back to models
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_CONFIG[status];

  const currentEntry: ContentEntry | null = entryId
    ? { id: entryId, content_model_id: modelId, title, fields, status, seo, published_at: null, created_by: user?.id || '', created_at: createdAt || '', updated_at: updatedAt || '' }
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Top Bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-3">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
            <button onClick={() => navigate('#/models')} className="hover:text-gray-600 transition-colors">
              Content Models
            </button>
            <ChevronRight className="w-3 h-3" />
            <button onClick={() => navigate(`#/models/${modelId}/entries`)} className="hover:text-gray-600 transition-colors">
              {model.name}
            </button>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-900 font-medium">{entryId ? title || 'Untitled' : 'New Entry'}</span>
          </nav>

          {/* Title + Actions row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`#/models/${modelId}/entries`)}
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 ring-1 ring-gray-200 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h1 className="text-lg font-semibold text-gray-900 truncate max-w-md">
                {title || 'Untitled Entry'}
              </h1>
              {/* Status Badge */}
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.text} ring-1 ${statusInfo.ring}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                {statusInfo.label}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Unsaved changes indicator */}
              {hasUnsavedChanges && (
                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md ring-1 ring-amber-200/60 font-medium">
                  Unsaved changes
                </span>
              )}

              {/* Save Draft */}
              <button
                onClick={() => handleSave()}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-white text-gray-700 hover:bg-gray-50 ring-1 ring-gray-200 shadow-sm transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving…' : 'Save Draft'}
              </button>

              {/* Publish */}
              {status !== 'published' && (
                <button
                  onClick={() => handleSave('published')}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50"
                >
                  <Eye className="w-4 h-4" />
                  Publish
                </button>
              )}

              {/* More Menu */}
              <div className="relative" ref={moreRef}>
                <button
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 ring-1 ring-gray-200 shadow-sm transition-all"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                {showMoreMenu && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-1 overflow-hidden">
                    {currentEntry && (
                      <button
                        onClick={() => { setShowJson(true); setShowMoreMenu(false); }}
                        className="w-full px-3 py-2 text-sm text-left rounded-md text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-all"
                      >
                        <Code className="w-4 h-4 text-gray-400" />
                        View JSON
                      </button>
                    )}
                    {status !== 'archived' && entryId && (
                      <button
                        onClick={() => { handleSave('archived'); setShowMoreMenu(false); }}
                        className="w-full px-3 py-2 text-sm text-left rounded-md text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-all"
                      >
                        <Archive className="w-4 h-4 text-gray-400" />
                        Archive
                      </button>
                    )}
                    {status === 'published' && (
                      <button
                        onClick={() => { handleSave('draft'); setShowMoreMenu(false); }}
                        className="w-full px-3 py-2 text-sm text-left rounded-md text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-all"
                      >
                        <FileText className="w-4 h-4 text-gray-400" />
                        Unpublish
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-3 gap-8">
          {/* Left: Fields Form */}
          <div className="col-span-2 space-y-6">
            {/* Title Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title) setErrors((p) => { const n = { ...p }; delete n.title; return n; });
                }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                placeholder="Enter entry title…"
              />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
            </div>

            {/* Dynamic Fields Card */}
            <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200 p-6">
              <div className="space-y-6">
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
                  <div className="text-center py-12">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <FileText className="w-4 h-4 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500">No fields defined yet.</p>
                    <p className="text-xs text-gray-400 mt-1">Add fields to this content model to get started.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Sidebar */}
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200 p-5">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Status</h3>
              <div className="relative" ref={statusRef}>
                <button
                  type="button"
                  onClick={() => setShowStatusMenu(!showStatusMenu)}
                  className="w-full px-3 py-2 text-sm text-left bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-all flex items-center justify-between shadow-sm"
                >
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${statusInfo.dot}`} />
                    <span className="text-gray-900 font-medium">{statusInfo.label}</span>
                  </span>
                  <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showStatusMenu ? 'rotate-90' : ''}`} />
                </button>
                {showStatusMenu && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-1">
                    {(Object.entries(STATUS_CONFIG) as [EntryStatus, typeof statusInfo][]).map(([key, config]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => { setStatus(key); setShowStatusMenu(false); }}
                        className={`w-full px-3 py-2 text-sm text-left rounded-md flex items-center gap-2 transition-all ${
                          status === key ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${config.dot}`} />
                        {config.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Metadata Card */}
            {entryId && (
              <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200 p-5">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Details</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Clock className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Created</p>
                      <p className="text-sm text-gray-700">{formatDate(createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Last updated</p>
                      <p className="text-sm text-gray-700">{formatDate(updatedAt)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SEO Panel */}
            <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200 p-5">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">SEO</h3>
              <SEOPanel seoData={seo} onChange={setSeo} />
            </div>
          </div>
        </div>
      </div>

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
