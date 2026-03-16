import React, { useState, useEffect } from 'react';
import { Link, X, Search, Check } from 'lucide-react';
import { useSupabase } from '../provider';
import { fetchContentEntries, fetchContentModel } from '../../core/queries';
import { formatDate } from '../../core/helpers';
import type { ContentEntry } from '../../core/types';

interface ReferencePickerProps {
  modelId: string;
  value: string | null;
  onChange: (entryId: string | null) => void;
  required?: boolean;
}

const STATUS_BADGE: Record<string, string> = {
  published: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60',
  draft: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60',
  archived: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200/60',
};

export function ReferencePicker({ modelId, value, onChange, required }: ReferencePickerProps) {
  const supabase = useSupabase();
  const [showPicker, setShowPicker] = useState(false);
  const [entries, setEntries] = useState<ContentEntry[]>([]);
  const [modelName, setModelName] = useState('');
  const [selectedTitle, setSelectedTitle] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (value && modelId) {
      loadSelected();
    }
  }, [value, modelId]);

  const loadSelected = async () => {
    try {
      const entries = await fetchContentEntries(supabase, modelId);
      const found = entries.find((e) => e.id === value);
      if (found) setSelectedTitle(found.title);
    } catch {}
  };

  const openPicker = async () => {
    setShowPicker(true);
    setSelectedId(null);
    setSearch('');
    setLoading(true);
    try {
      const [model, data] = await Promise.all([
        fetchContentModel(supabase, modelId),
        fetchContentEntries(supabase, modelId),
      ]);
      setModelName(model?.name || '');
      setEntries(data);
    } catch (err) {
      console.error('Error loading references:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = entries.filter(
    (e) => !search || e.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleConfirm = () => {
    if (selectedId) {
      const entry = entries.find((e) => e.id === selectedId);
      onChange(selectedId);
      setSelectedTitle(entry?.title || selectedId);
      setShowPicker(false);
    }
  };

  return (
    <div>
      {/* Trigger */}
      {value ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 ring-1 ring-blue-200 rounded-lg">
          <Link className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <span className="flex-1 text-sm text-blue-700 font-medium truncate">{selectedTitle || value}</span>
          <button
            onClick={() => {
              onChange(null);
              setSelectedTitle('');
            }}
            className="text-blue-400 hover:text-red-500 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={openPicker}
          className="border-2 border-dashed border-gray-300 rounded-lg px-6 py-3 text-sm text-gray-500 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/50 transition-all flex items-center gap-2"
        >
          <Link className="w-4 h-4" /> Select reference
        </button>
      )}

      {/* Picker modal */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setShowPicker(false)} />
          <div className="relative bg-white rounded-xl shadow-lg w-full max-w-md max-h-[70vh] flex flex-col border border-gray-200">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Select {modelName || 'Entry'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Choose a content entry to reference</p>
              </div>
              <button onClick={() => setShowPicker(false)} className="p-1 rounded-md hover:bg-gray-100 transition-all">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Search */}
            <div className="px-5 py-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search entries…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                  <p className="text-sm text-gray-500 mt-3">Loading entries…</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-500">No entries found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filtered.map((entry) => {
                    const isSelected = selectedId === entry.id;
                    return (
                      <button
                        key={entry.id}
                        onClick={() => setSelectedId(isSelected ? null : entry.id)}
                        className={`w-full text-left px-5 py-3 transition-all flex items-center gap-3 ${
                          isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{entry.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                STATUS_BADGE[entry.status?.toLowerCase()] || STATUS_BADGE.draft
                              }`}
                            >
                              {entry.status}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {formatDate(entry.updated_at || entry.created_at)}
                            </span>
                          </div>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                            isSelected ? 'border-blue-600 cms-accent-bg' : 'border-gray-300'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowPicker(false)}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg px-4 py-2 text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selectedId}
                className="inline-flex items-center gap-2 cms-btn-accent text-white rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" />
                Select
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
