import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Database, FileText } from 'lucide-react';
import { useSupabase } from '../provider';
import { fetchContentModels, deleteContentModel, fetchContentEntries } from '../../core/queries';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { Toast } from '../common/Toast';
import type { ContentModel, CMSRoute } from '../../core/types';
import { formatDate } from '../../core/helpers';

interface ContentModelsListProps {
  onNavigate: (route: CMSRoute) => void;
}

export function ContentModelsList({ onNavigate }: ContentModelsListProps) {
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
      // Load entry counts
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
      <div className="bcms-space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bcms-h-20 bcms-bg-gray-200 bcms-rounded-xl bcms-animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="bcms-space-y-6">
      <div className="bcms-flex bcms-items-center bcms-justify-between">
        <div>
          <h1 className="bcms-text-2xl bcms-font-bold bcms-text-gray-900">Content Models</h1>
          <p className="bcms-text-gray-500 bcms-text-sm bcms-mt-1">Define the structure of your content</p>
        </div>
        <button
          onClick={() => onNavigate({ page: 'content-model-editor' })}
          className="bcms-bg-blue-600 bcms-text-white bcms-py-2.5 bcms-px-6 bcms-text-sm bcms-font-semibold bcms-rounded-lg hover:bcms-bg-blue-700 bcms-transition bcms-flex bcms-items-center bcms-gap-2 bcms-shadow-lg"
        >
          <Plus className="bcms-w-4 bcms-h-4" /> New Model
        </button>
      </div>

      {models.length === 0 ? (
        <div className="bcms-bg-white bcms-rounded-xl bcms-shadow-sm bcms-border bcms-border-gray-200 bcms-p-12 bcms-text-center">
          <Database className="bcms-w-16 bcms-h-16 bcms-mx-auto bcms-text-gray-400 bcms-mb-4" />
          <p className="bcms-text-gray-600 bcms-mb-6 bcms-text-sm">No content models yet. Create your first one to get started.</p>
          <button
            onClick={() => onNavigate({ page: 'content-model-editor' })}
            className="bcms-bg-blue-600 bcms-text-white bcms-py-2.5 bcms-px-6 bcms-text-sm bcms-font-semibold bcms-rounded-lg hover:bcms-bg-blue-700 bcms-transition bcms-inline-flex bcms-items-center bcms-gap-2"
          >
            <Plus className="bcms-w-4 bcms-h-4" /> Create First Model
          </button>
        </div>
      ) : (
        <div className="bcms-grid bcms-grid-cols-1 md:bcms-grid-cols-2 lg:bcms-grid-cols-3 bcms-gap-4">
          {models.map((model) => (
            <div
              key={model.id}
              className="bcms-bg-white bcms-rounded-xl bcms-shadow-sm bcms-border bcms-border-gray-200 bcms-p-6 hover:bcms-shadow-md bcms-transition bcms-cursor-pointer bcms-group"
              onClick={() => onNavigate({ page: 'content-entries', modelId: model.id })}
            >
              <div className="bcms-flex bcms-items-start bcms-justify-between bcms-mb-4">
                <div className="bcms-text-2xl">{model.icon || '📄'}</div>
                <div className="bcms-flex bcms-gap-1 bcms-opacity-0 group-hover:bcms-opacity-100 bcms-transition" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => onNavigate({ page: 'content-model-editor', id: model.id })} className="bcms-p-2 bcms-text-gray-400 hover:bcms-text-blue-600 hover:bcms-bg-blue-50 bcms-rounded-lg bcms-transition" title="Edit">
                    <Pencil className="bcms-w-4 bcms-h-4" />
                  </button>
                  <button onClick={() => setDeleteTarget(model)} className="bcms-p-2 bcms-text-gray-400 hover:bcms-text-red-600 hover:bcms-bg-red-50 bcms-rounded-lg bcms-transition" title="Delete">
                    <Trash2 className="bcms-w-4 bcms-h-4" />
                  </button>
                </div>
              </div>
              <h3 className="bcms-font-semibold bcms-text-gray-900 bcms-mb-1">{model.name}</h3>
              <p className="bcms-text-xs bcms-text-gray-500 bcms-mb-3">{model.description || 'No description'}</p>
              <div className="bcms-flex bcms-items-center bcms-justify-between bcms-text-xs bcms-text-gray-400">
                <span className="bcms-flex bcms-items-center bcms-gap-1">
                  <FileText className="bcms-w-3 bcms-h-3" /> {entryCounts[model.id] || 0} entries
                </span>
                <span>{model.fields.length} fields</span>
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
