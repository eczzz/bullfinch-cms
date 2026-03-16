import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Database, FileText, MoreHorizontal, Clock } from 'lucide-react';
import { useSupabase } from '../provider';
import { fetchContentModels, deleteContentModel, fetchContentEntries } from '../../core/queries';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { Toast } from '../common/Toast';
import { navigate } from '../../core/router';
import type { ContentModel } from '../../core/types';
import { formatDate } from '../../core/helpers';

export function ContentModelsList() {
  const supabase = useSupabase();
  const [models, setModels] = useState<ContentModel[]>([]);
  const [entryCounts, setEntryCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<ContentModel | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; title: string; message?: string } | null>(null);

  const loadModels = async () => {
    try {
      const data = await fetchContentModels(supabase);
      setModels(data);
      const counts: Record<string, number> = {};
      for (const m of data) {
        const entries = await fetchContentEntries(supabase, m.id);
        counts[m.id] = entries.length;
      }
      setEntryCounts(counts);
    } catch (err) {
      console.error('Error loading content models:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadModels(); }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteContentModel(supabase, deleteTarget.id);
      setDeleteTarget(null);
      setToast({ type: 'success', title: 'Content model deleted' });
      loadModels();
    } catch (err: any) {
      setToast({ type: 'error', title: 'Delete failed', message: err.message });
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-48 rounded-lg bg-gray-200 animate-pulse" />
            <div className="h-4 w-64 rounded bg-gray-100 animate-pulse" />
          </div>
          <div className="h-9 w-32 rounded-lg bg-gray-200 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm ring-1 ring-gray-200 p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="w-9 h-9 rounded-lg bg-gray-100 animate-pulse" />
                <div className="w-6 h-6 rounded bg-gray-100 animate-pulse" />
              </div>
              <div className="h-4 w-3/4 rounded bg-gray-100 animate-pulse" />
              <div className="h-3 w-full rounded bg-gray-50 animate-pulse" />
              <div className="flex justify-between">
                <div className="h-5 w-16 rounded-full bg-gray-100 animate-pulse" />
                <div className="h-3 w-20 rounded bg-gray-50 animate-pulse" />
              </div>
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
          <h1 className="text-2xl font-semibold text-gray-900">Content Models</h1>
          <p className="text-sm text-gray-500 mt-1">Define the structure of your content</p>
        </div>
        <button
          onClick={() => navigate('/models/new')}
          className="inline-flex items-center gap-2 cms-btn-accent text-white rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" /> New Model
        </button>
      </div>

      {models.length === 0 ? (
        /* Empty state */
        <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-200 p-12 text-center">
          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Database className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-sm font-medium text-gray-900 mb-1">No content models yet</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
            Content models define the structure of your content. Create your first one to get started.
          </p>
          <button
            onClick={() => navigate('/models/new')}
            className="inline-flex items-center gap-2 cms-btn-accent text-white rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Create First Model
          </button>
        </div>
      ) : (
        /* Cards grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {models.map((model) => (
            <div
              key={model.id}
              className="bg-white rounded-lg shadow-sm ring-1 ring-gray-200 hover:shadow-md hover:ring-gray-300 transition-all cursor-pointer group"
              onClick={() => navigate(`/models/${model.id}`)}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-lg">
                    {model.icon || '📄'}
                  </div>
                  <div
                    className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => navigate(`/models/${model.id}`)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                      title="Edit model"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(model)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                      title="Delete model"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">{model.name}</h3>
                <p className="text-xs text-gray-500 mb-4 line-clamp-2">
                  {model.description || 'No description'}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                      <FileText className="w-3 h-3" />
                      {entryCounts[model.id] || 0} entries
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 ring-1 ring-blue-200/60">
                      {model.fields.length} fields
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(model.updated_at)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmationModal
        isOpen={!!deleteTarget}
        title="Delete Content Model"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This will also delete all its entries.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
