import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Eye, FileText, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSupabase } from '../provider';
import {
  fetchContentEntries,
  fetchContentModel,
  deleteContentEntry,
  updateEntryStatus,
} from '../../core/queries';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { Toast } from '../common/Toast';
import { navigate } from '../../core/router';
import type { ContentModel, ContentEntry, EntryStatus } from '../../core/types';
import { formatDateTime, truncate } from '../../core/helpers';

interface ContentEntriesListProps {
  modelId: string;
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
  const [model, setModel] = useState<ContentModel | null>(null);
  const [entries, setEntries] = useState<ContentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EntryStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<ContentEntry | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; title: string; message?: string } | null>(null);

  const loadData = async () => {
    try {
      const [m, e] = await Promise.all([
        fetchContentModel(supabase, modelId),
        fetchContentEntries(supabase, modelId),
      ]);
      setModel(m);
      setEntries(e);
    } catch (err) {
      console.error('Error loading entries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [modelId]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteContentEntry(supabase, deleteTarget.id);
      setDeleteTarget(null);
      setToast({ type: 'success', title: 'Entry deleted' });
      loadData();
    } catch (err: any) {
      setToast({ type: 'error', title: 'Delete failed', message: err.message });
    }
  };

  const handleStatusChange = async (entry: ContentEntry, status: EntryStatus) => {
    try {
      await updateEntryStatus(supabase, entry.id, status);
      loadData();
    } catch (err: any) {
      setToast({ type: 'error', title: 'Status update failed', message: err.message });
    }
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

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="space-y-2">
          <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
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
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm">
        <button
          onClick={() => navigate('#/models')}
          className="text-gray-400 hover:text-gray-600 transition-all"
        >
          Content Models
        </button>
        <span className="text-gray-300">›</span>
        <button
          onClick={() => navigate(`#/models/${modelId}`)}
          className="text-gray-400 hover:text-gray-600 transition-all"
        >
          {model?.name || 'Model'}
        </button>
        <span className="text-gray-300">›</span>
        <span className="text-gray-900 font-medium">Entries</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {model?.name || 'Entries'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {model?.description || 'Manage content entries'}
          </p>
        </div>
        <button
          onClick={() => navigate(`#/models/${modelId}/entries/new`)}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" /> New Entry
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3">
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
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as EntryStatus | 'all')}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
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
              ? 'Create your first entry to start adding content.'
              : 'Try adjusting your search or filter criteria.'}
          </p>
          {entries.length === 0 && (
            <button
              onClick={() => navigate(`#/models/${modelId}/entries/new`)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all"
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
              {paginated.map((entry) => (
                <tr
                  key={entry.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer group"
                  onClick={() => navigate(`#/models/${modelId}/entries/${entry.id}`)}
                >
                  <td className="px-5 py-3">
                    <p className="text-sm font-medium text-gray-900">{truncate(entry.title, 60)}</p>
                  </td>
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
                        onClick={() => navigate(`#/models/${modelId}/entries/${entry.id}`)}
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
              ))}
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
                        ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200/50'
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
