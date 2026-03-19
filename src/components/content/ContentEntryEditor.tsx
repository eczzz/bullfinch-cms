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
  enableTestMode,
  disableTestMode,
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
  const [showBuildModal, setShowBuildModal] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; title: string; message?: string } | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [testMode, setTestMode] = useState(false);
  const [testModeLoading, setTestModeLoading] = useState(false);
  const [showTestModeConfirm, setShowTestModeConfirm] = useState(false);

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
          setTestMode(entry.test_mode || false);
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
        const effectiveStatus = newStatus || status;
        if (effectiveStatus === 'published') {
          setShowBuildModal(true);
        } else {
          setToast({ type: 'success', title: 'Entry saved' });
        }
      } else {
        const saved = await createContentEntry(supabase, {
          ...entry,
          content_model_id: modelId,
          created_by: user.id,
          seo: Object.keys(seo).length > 0 ? seo : undefined,
        });
        if (config.hooks?.onAfterSave) await config.hooks.onAfterSave(saved);
        setHasUnsavedChanges(false);
        navigate(`/models/${modelId}/entries/${saved.id}`);
        const effectiveStatus = newStatus || status;
        if (effectiveStatus === 'published') {
          setShowBuildModal(true);
        } else {
          setToast({ type: 'success', title: 'Entry created' });
        }
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

  const handleTestModeToggle = () => {
    if (testMode) {
      handleDisableTestMode();
    } else {
      setShowTestModeConfirm(true);
    }
  };

  const confirmEnableTestMode = async () => {
    if (!model || !entryId) return;
    setShowTestModeConfirm(false);
    setTestModeLoading(true);
    try {
      await enableTestMode(supabase, entryId, model.fields);
      await loadData();
      setToast({ type: 'success', title: 'Test mode enabled' });
    } catch (err: any) {
      setToast({ type: 'error', title: 'Failed to enable test mode', message: err.message });
    } finally {
      setTestModeLoading(false);
    }
  };

  const handleDisableTestMode = async () => {
    if (!entryId) return;
    setTestModeLoading(true);
    try {
      await disableTestMode(supabase, entryId);
      await loadData();
      setToast({ type: 'success', title: 'Original content restored' });
    } catch (err: any) {
      setToast({ type: 'error', title: 'Failed to restore content', message: err.message });
    } finally {
      setTestModeLoading(false);
    }
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
            onClick={() => navigate('/models')}
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
            <button onClick={() => navigate('/models')} className="hover:text-gray-600 transition-colors">
              Content Models
            </button>
            <ChevronRight className="w-3 h-3" />
            <button onClick={() => navigate(`/models/${modelId}/entries`)} className="hover:text-gray-600 transition-colors">
              {model.name}
            </button>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-900 font-medium">{entryId ? title || 'Untitled' : 'New Entry'}</span>
          </nav>

          {/* Title + Actions row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/models/${modelId}/entries`)}
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

              {/* Save / Update */}
              <button
                onClick={() => handleSave()}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-white text-gray-700 hover:bg-gray-50 ring-1 ring-gray-200 shadow-sm transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving…' : status === 'published' ? 'Update' : 'Save Draft'}
              </button>

              {/* Publish */}
              {status !== 'published' && (
                <button
                  onClick={() => handleSave('published')}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg cms-btn-accent text-white shadow-sm transition-all disabled:opacity-50"
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

      {/* Test Mode Banner */}
      {testMode && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🧪</span>
              <span className="text-sm font-medium text-amber-800">
                Test Mode Active — Content has been replaced with test markers
              </span>
            </div>
            <button
              onClick={handleDisableTestMode}
              disabled={testModeLoading}
              className="text-sm font-medium text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1 rounded-md transition-all"
            >
              {testModeLoading ? 'Restoring…' : 'Restore Original Content'}
            </button>
          </div>
        </div>
      )}

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

            {/* Developer Tools — Test Mode */}
            {entryId && (
              <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200 p-5">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Developer Tools</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🧪</span>
                    <span className="text-sm text-gray-700 font-medium">Test Mode</span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={testMode}
                    disabled={testModeLoading}
                    onClick={handleTestModeToggle}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      testMode ? 'bg-amber-500' : 'bg-gray-200'
                    } ${testModeLoading ? 'opacity-50' : ''}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                      testMode ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
                {testMode && (
                  <p className="text-xs text-amber-600 mt-2">Original content saved. Toggle off to restore.</p>
                )}
              </div>
            )}

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

      {/* Test Mode Confirmation Modal */}
      {showTestModeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setShowTestModeConfirm(false)} />
          <div className="relative bg-white rounded-xl shadow-lg w-full max-w-md border border-gray-200 p-6">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto">
                <span className="text-2xl">🧪</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Enable Test Mode?</h3>
                <p className="text-sm text-gray-500 mt-2">
                  This will temporarily replace all content with test markers (111 text, placeholder images).
                  Your original content is safely saved and will be restored when you turn test mode off.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowTestModeConfirm(false)} className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100 transition-all">
                  Cancel
                </button>
                <button onClick={confirmEnableTestMode} className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-amber-500 text-white hover:bg-amber-600 shadow-sm transition-all">
                  Enable Test Mode
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Build Production Modal */}
      {showBuildModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => { setShowBuildModal(false); setToast({ type: 'success', title: 'Changes saved' }); }} />
          <div className="relative bg-white rounded-xl shadow-lg w-full max-w-md border border-gray-200 p-6">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto">
                <Eye className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Changes Saved</h3>
                <p className="text-sm text-gray-500 mt-2">
                  Would you like to rebuild the production site now, or skip if you have more edits to make?
                </p>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={async () => {
                    setShowBuildModal(false);
                    try {
                      const { data } = await supabase.from('settings').select('value').eq('key', 'integration_netlify_build_hook').single();
                      if (data?.value) {
                        await fetch(data.value, { method: 'POST' });
                        setToast({ type: 'success', title: 'Build triggered' });
                      } else {
                        setToast({ type: 'error', title: 'No build hook configured', message: 'Add a Netlify build hook in Settings → Integrations' });
                      }
                    } catch (err: any) {
                      setToast({ type: 'error', title: 'Build failed', message: err.message });
                    }
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg cms-btn-accent text-white shadow-sm transition-all"
                >
                  Build Production Site
                </button>
                <button
                  onClick={() => { setShowBuildModal(false); setToast({ type: 'success', title: 'Changes saved — build skipped' }); }}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all"
                >
                  Skip — I have more changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
