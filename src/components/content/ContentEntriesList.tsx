import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Eye, FileText, Search } from 'lucide-react';
import { useSupabase } from '../provider';
import {
  fetchContentEntries,
  fetchAllContentEntries,
  fetchContentModels,
  fetchContentModel,
  deleteContentEntry,
  updateEntryStatus,
} from '../../core/queries';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { Dropdown } from '../common/Dropdown';
import { Toast } from '../common/Toast';
import { navigate } from '../../core/router';
import type { ContentModel, ContentEntry, EntryStatus } from '../../core/types';
import { formatDateTime, truncate } from '../../core/helpers';

interface ContentEntriesListProps {
  modelId?: string;
}

const PAGE_SIZE = 20;

const STATUS_BADGE_CLASSES: Record<EntryStatus, string> = {
  draft: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  published: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  archived: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
};

const STATUS_DOT_CLASSES: Record<EntryStatus, string> = {
  draft: 'bg-amber-500',
  published: 'bg-emerald-500',
  archived: 'bg-gray-400',
};

export function ContentEntriesList({ modelId }: ContentEntriesListProps) {
  const supabase = useSupabase();
  const [models, setModels] = useState<ContentModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>(modelId || '');
  const [selectedModel, setSelectedModel] = useState<ContentModel | null>(null);
  const [entries, setEntries] = useState<ContentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EntryStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<ContentEntry | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; title: string; message?: string } | null>(null);

  // Load all models for the dropdown
  useEffect(() => {
    fetchContentModels(supabase).then(setModels).catch(console.error);
  }, [supabase]);

  // Build a model lookup map
  const modelMap = React.useMemo(() => {
    const map: Record<string, ContentModel> = {};
    models.forEach((m) => { map[m.id] = m; });
    return map;
  }, [models]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      if (selectedModelId) {
        const [m, e] = await Promise.all([
          fetchContentModel(supabase, selectedModelId),
          fetchContentEntries(supabase, selectedModelId),
        ]);
        setSelectedModel(m);
        setEntries(e);
      } else {
        setSelectedModel(null);
        const e = await fetchAllContentEntries(supabase);
        setEntries(e);
      }
    } catch (err) {
      console.error('Error loading entries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEntries(); }, [selectedModelId]);

  // Sync URL when model changes
  useEffect(() => {
    if (modelId !== undefined) return; // only for unified view
    const path = selectedModelId ? `/entries/${selectedModelId}` : '/entries';
    if (window.location.pathname !== path) {
      history.replaceState({}, '', path);
    }
  }, [selectedModelId, modelId]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteContentEntry(supabase, deleteTarget.id);
      setDeleteTarget(null);
      setToast({ type: 'success', title: 'Entry deleted' });
      loadEntries();
    } catch (err: any) {
      setToast({ type: 'error', title: 'Delete failed', message: err.message });
    }
  };

  const handleStatusChange = async (entry: ContentEntry, status: EntryStatus) => {
    try {
      await updateEntryStatus(supabase, entry.id, status);
      loadEntries();
    } catch (err: any) {
      setToast({ type: 'error', title: 'Status update failed', message: err.message });
    }
  };

  const handleModelChange = (newModelId: string) => {
    setSelectedModelId(newModelId);
    setPage(1);
  };

  const filtered = entries.filter((e) => {
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  // Resolve the model ID for navigation (entry row click, new entry, etc.)
  const getEntryModelId = (entry: ContentEntry) => entry.content_model_id;
  const activeModelId = selectedModelId || '';
  const [showCreatePicker, setShowCreatePicker] = useState(false);
  const createBtnRef = React.useRef<HTMLDivElement>(null);

  // Close create picker on outside click
  useEffect(() => {
    if (!showCreatePicker) return;
    const handler = (e: MouseEvent) => {
      if (createBtnRef.current && !createBtnRef.current.contains(e.target as Node)) {
        setShowCreatePicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCreatePicker]);

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex gap-3">
            <div className="h-8 w-52 bg-gray-100 rounded-lg animate-pulse" />
            <div className="h-8 w-24 bg-gray-100 rounded-lg animate-pulse" />
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3 border-b border-gray-50">
              <div className="h-4 w-48 bg-gray-100 rounded animate-pulse flex-1" />
              <div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" />
              <div className="h-4 w-20 bg-gray-50 rounded animate-pulse" />
              <div className="h-4 w-24 bg-gray-50 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Entries</h1>
          <p className="text-sm text-gray-500 mt-1">
            {selectedModel ? selectedModel.description || `Manage ${selectedModel.name} entries` : 'Manage all content entries'}
          </p>
        </div>
        <div className="relative" ref={createBtnRef}>
          <button
            onClick={() => {
              if (activeModelId) {
                navigate(`/models/${activeModelId}/entries/new`);
              } else if (models.length === 1) {
                navigate(`/models/${models[0].id}/entries/new`);
              } else {
                setShowCreatePicker((v) => !v);
              }
            }}
            className="inline-flex items-center gap-2 cms-btn-accent text-white rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Create
          </button>
          {showCreatePicker && (
            <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-lg shadow-lg ring-1 ring-gray-200 py-1.5 z-30 animate-in fade-in slide-in-from-top-1">
              <p className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Select model</p>
              {models.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setShowCreatePicker(false);
                    navigate(`/models/${m.id}/entries/new`);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors flex items-center gap-2"
                >
                  <span>{m.icon || '📄'}</span>
                  {m.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        {/* Content model dropdown */}
        <Dropdown
          value={selectedModelId}
          onChange={handleModelChange}
          options={[
            { value: '', label: 'All Content Models' },
            ...models.map((m) => ({ value: m.id, label: m.name })),
          ]}
          className="w-48"
        />

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search entries…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <Dropdown
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as EntryStatus | 'all')}
          options={[
            { value: 'all', label: 'All Statuses' },
            { value: 'draft', label: 'Draft' },
            { value: 'published', label: 'Published' },
            { value: 'archived', label: 'Archived' },
          ]}
          className="w-36"
        />
      </div>

      {/* Table or empty state */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-200 p-12 text-center">
          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-sm font-medium text-gray-900 mb-1">
            {entries.length === 0 ? 'No entries yet' : 'No entries match your filters'}
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            {entries.length === 0
              ? activeModelId
                ? 'Create your first entry to start adding content.'
                : 'Select a content model and create your first entry.'
              : 'Try adjusting your search or filter criteria.'}
          </p>
          {entries.length === 0 && activeModelId && (
            <button
              onClick={() => navigate(`/models/${activeModelId}/entries/new`)}
              className="inline-flex items-center gap-2 cms-btn-accent text-white rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" /> Create First Entry
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Title
                </th>
                {!selectedModelId && (
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Model
                  </th>
                )}
                <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Updated
                </th>
                <th className="text-right px-5 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider w-24">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.map((entry) => {
                const entryModelId = getEntryModelId(entry);
                const entryModel = modelMap[entryModelId];
                return (
                  <tr
                    key={entry.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/models/${entryModelId}/entries/${entry.id}`)}
                  >
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-gray-900">{truncate(entry.title, 60)}</p>
                    </td>
                    {!selectedModelId && (
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                          {entryModel ? (
                            <>
                              <span>{entryModel.icon || '📄'}</span>
                              {entryModel.name}
                            </>
                          ) : (
                            <span className="italic text-gray-400">Unknown</span>
                          )}
                        </span>
                      </td>
                    )}
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE_CLASSES[entry.status]}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_CLASSES[entry.status]}`} />
                        {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {formatDateTime(entry.updated_at)}
                    </td>
                    <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => navigate(`/models/${entryModelId}/entries/${entry.id}`)}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {entry.status === 'draft' && (
                          <button
                            onClick={() => handleStatusChange(entry, 'published')}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                            title="Publish"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteTarget(entry)}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Showing <span className="font-medium text-gray-700">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</span> of <span className="font-medium text-gray-700">{filtered.length}</span> entries
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-2.5 py-1 text-xs font-medium rounded-md text-gray-600 hover:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                      page === p
                        ? 'cms-accent-bg text-white ring-1 ring-blue-200/50'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                {totalPages > 5 && <span className="text-xs text-gray-400">…</span>}
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-2.5 py-1 text-xs font-medium rounded-md text-gray-600 hover:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!deleteTarget}
        title="Delete Entry"
        message={`Are you sure you want to delete "${deleteTarget?.title}"?`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
