import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Eye, FileText, Search } from 'lucide-react';
import { useSupabase } from '../provider';
import {
  fetchContentEntries,
  fetchContentModel,
  deleteContentEntry,
  updateEntryStatus,
} from '../../core/queries';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { Toast } from '../common/Toast';
import type { ContentModel, ContentEntry, CMSRoute, EntryStatus } from '../../core/types';
import { formatDateTime, truncate } from '../../core/helpers';

interface ContentEntriesListProps {
  modelId: string;
  onNavigate: (route: CMSRoute) => void;
}

export function ContentEntriesList({ modelId, onNavigate }: ContentEntriesListProps) {
  const supabase = useSupabase();
  const [model, setModel] = useState<ContentModel | null>(null);
  const [entries, setEntries] = useState<ContentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EntryStatus | 'all'>('all');
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

  const statusColors: Record<EntryStatus, string> = {
    draft: 'bcms-bg-yellow-100 bcms-text-yellow-700',
    published: 'bcms-bg-green-100 bcms-text-green-700',
    archived: 'bcms-bg-gray-100 bcms-text-gray-600',
  };

  if (loading) {
    return (
      <div className="bcms-space-y-4 bcms-p-8">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bcms-h-16 bcms-bg-gray-200 bcms-rounded-lg bcms-animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="bcms-p-8 bcms-max-w-6xl">
      <div className="bcms-flex bcms-items-center bcms-justify-between bcms-mb-8">
        <div>
          <button
            onClick={() => onNavigate({ page: 'content-models' })}
            className="bcms-text-sm bcms-text-gray-500 hover:bcms-text-gray-700 bcms-mb-1"
          >
            ← Content Models
          </button>
          <h1 className="bcms-text-2xl bcms-font-bold bcms-text-gray-900">
            {model?.name || 'Entries'}
          </h1>
          <p className="bcms-text-gray-500 bcms-text-sm bcms-mt-1">
            {model?.description || 'Manage content entries'}
          </p>
        </div>
        <button
          onClick={() => onNavigate({ page: 'content-entry-editor', modelId })}
          className="bcms-bg-blue-600 bcms-text-white bcms-py-2.5 bcms-px-6 bcms-text-sm bcms-font-semibold bcms-rounded-lg hover:bcms-bg-blue-700 bcms-transition bcms-flex bcms-items-center bcms-gap-2 bcms-shadow-lg"
        >
          <Plus className="bcms-w-4 bcms-h-4" /> New Entry
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bcms-flex bcms-items-center bcms-gap-4 bcms-mb-6">
        <div className="bcms-relative bcms-flex-1">
          <Search className="bcms-absolute bcms-left-3 bcms-top-1/2 bcms--translate-y-1/2 bcms-w-4 bcms-h-4 bcms-text-gray-400" />
          <input
            type="text"
            placeholder="Search entries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bcms-w-full bcms-pl-10 bcms-pr-4 bcms-py-2 bcms-text-sm bcms-border bcms-border-gray-300 bcms-rounded-lg"
          />
        </div>
        <div className="bcms-flex bcms-gap-2">
          {(['all', 'draft', 'published', 'archived'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`bcms-px-3 bcms-py-1.5 bcms-rounded-lg bcms-text-xs bcms-font-medium bcms-transition ${
                statusFilter === s
                  ? 'bcms-bg-blue-600 bcms-text-white'
                  : 'bcms-bg-gray-100 bcms-text-gray-600 hover:bcms-bg-gray-200'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Entries Table */}
      {filtered.length === 0 ? (
        <div className="bcms-bg-white bcms-rounded-xl bcms-shadow-sm bcms-border bcms-border-gray-200 bcms-p-12 bcms-text-center">
          <FileText className="bcms-w-16 bcms-h-16 bcms-mx-auto bcms-text-gray-400 bcms-mb-4" />
          <p className="bcms-text-gray-600 bcms-mb-6 bcms-text-sm">
            {entries.length === 0 ? 'No entries yet. Create your first one.' : 'No entries match your search.'}
          </p>
          {entries.length === 0 && (
            <button
              onClick={() => onNavigate({ page: 'content-entry-editor', modelId })}
              className="bcms-bg-blue-600 bcms-text-white bcms-py-2.5 bcms-px-6 bcms-text-sm bcms-font-semibold bcms-rounded-lg hover:bcms-bg-blue-700 bcms-transition bcms-inline-flex bcms-items-center bcms-gap-2"
            >
              <Plus className="bcms-w-4 bcms-h-4" /> Create First Entry
            </button>
          )}
        </div>
      ) : (
        <div className="bcms-bg-white bcms-rounded-xl bcms-shadow-sm bcms-border bcms-border-gray-200 bcms-overflow-hidden">
          <table className="bcms-w-full">
            <thead className="bcms-bg-gray-50 bcms-border-b bcms-border-gray-200">
              <tr>
                <th className="bcms-text-left bcms-px-6 bcms-py-3 bcms-text-xs bcms-font-semibold bcms-text-gray-500 bcms-uppercase">Title</th>
                <th className="bcms-text-left bcms-px-6 bcms-py-3 bcms-text-xs bcms-font-semibold bcms-text-gray-500 bcms-uppercase">Status</th>
                <th className="bcms-text-left bcms-px-6 bcms-py-3 bcms-text-xs bcms-font-semibold bcms-text-gray-500 bcms-uppercase">Updated</th>
                <th className="bcms-text-right bcms-px-6 bcms-py-3 bcms-text-xs bcms-font-semibold bcms-text-gray-500 bcms-uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bcms-divide-y bcms-divide-gray-100">
              {filtered.map((entry) => (
                <tr
                  key={entry.id}
                  className="hover:bcms-bg-gray-50 bcms-transition bcms-cursor-pointer"
                  onClick={() => onNavigate({ page: 'content-entry-editor', modelId, entryId: entry.id })}
                >
                  <td className="bcms-px-6 bcms-py-4">
                    <div className="bcms-font-medium bcms-text-gray-900 bcms-text-sm">{truncate(entry.title, 60)}</div>
                  </td>
                  <td className="bcms-px-6 bcms-py-4">
                    <span className={`bcms-inline-flex bcms-px-2.5 bcms-py-1 bcms-rounded-full bcms-text-xs bcms-font-medium ${statusColors[entry.status]}`}>
                      {entry.status}
                    </span>
                  </td>
                  <td className="bcms-px-6 bcms-py-4 bcms-text-sm bcms-text-gray-500">
                    {formatDateTime(entry.updated_at)}
                  </td>
                  <td className="bcms-px-6 bcms-py-4" onClick={(e) => e.stopPropagation()}>
                    <div className="bcms-flex bcms-items-center bcms-justify-end bcms-gap-1">
                      <button
                        onClick={() => onNavigate({ page: 'content-entry-editor', modelId, entryId: entry.id })}
                        className="bcms-p-2 bcms-text-gray-400 hover:bcms-text-blue-600 hover:bcms-bg-blue-50 bcms-rounded-lg bcms-transition"
                        title="Edit"
                      >
                        <Pencil className="bcms-w-4 bcms-h-4" />
                      </button>
                      {entry.status === 'draft' && (
                        <button
                          onClick={() => handleStatusChange(entry, 'published')}
                          className="bcms-p-2 bcms-text-gray-400 hover:bcms-text-green-600 hover:bcms-bg-green-50 bcms-rounded-lg bcms-transition"
                          title="Publish"
                        >
                          <Eye className="bcms-w-4 bcms-h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteTarget(entry)}
                        className="bcms-p-2 bcms-text-gray-400 hover:bcms-text-red-600 hover:bcms-bg-red-50 bcms-rounded-lg bcms-transition"
                        title="Delete"
                      >
                        <Trash2 className="bcms-w-4 bcms-h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="bcms-text-xs bcms-text-gray-400 bcms-mt-4">
        {filtered.length} of {entries.length} entries
      </p>

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
