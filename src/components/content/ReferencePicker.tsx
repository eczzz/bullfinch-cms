import React, { useState, useEffect } from 'react';
import { Link, X, Search } from 'lucide-react';
import { useSupabase } from '../provider';
import { fetchContentEntries, fetchContentModel } from '../../core/queries';
import type { ContentEntry } from '../../core/types';

interface ReferencePickerProps {
  modelId: string;
  value: string | null;
  onChange: (entryId: string | null) => void;
  required?: boolean;
}

export function ReferencePicker({ modelId, value, onChange, required }: ReferencePickerProps) {
  const supabase = useSupabase();
  const [showPicker, setShowPicker] = useState(false);
  const [entries, setEntries] = useState<ContentEntry[]>([]);
  const [modelName, setModelName] = useState('');
  const [selectedTitle, setSelectedTitle] = useState('');
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

  return (
    <div>
      {value ? (
        <div className="bcms-flex bcms-items-center bcms-gap-2 bcms-px-4 bcms-py-2 bcms-bg-blue-50 bcms-border bcms-border-blue-200 bcms-rounded-lg">
          <Link className="bcms-w-4 bcms-h-4 bcms-text-blue-500" />
          <span className="bcms-flex-1 bcms-text-sm bcms-text-blue-700">{selectedTitle || value}</span>
          <button onClick={() => { onChange(null); setSelectedTitle(''); }} className="bcms-text-blue-400 hover:bcms-text-red-500">
            <X className="bcms-w-4 bcms-h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={openPicker}
          className="bcms-border-2 bcms-border-dashed bcms-border-gray-300 bcms-rounded-lg bcms-px-6 bcms-py-3 bcms-text-sm bcms-text-gray-500 hover:bcms-border-blue-400 hover:bcms-text-blue-600 bcms-transition bcms-flex bcms-items-center bcms-gap-2"
        >
          <Link className="bcms-w-4 bcms-h-4" /> Select reference
        </button>
      )}

      {showPicker && (
        <div className="bcms-fixed bcms-inset-0 bcms-z-50 bcms-flex bcms-items-center bcms-justify-center">
          <div className="bcms-fixed bcms-inset-0 bcms-bg-black/50" onClick={() => setShowPicker(false)} />
          <div className="bcms-relative bcms-bg-white bcms-rounded-xl bcms-shadow-2xl bcms-w-full bcms-max-w-md bcms-max-h-[70vh] bcms-flex bcms-flex-col">
            <div className="bcms-flex bcms-items-center bcms-justify-between bcms-p-4 bcms-border-b">
              <h3 className="bcms-font-semibold bcms-text-gray-900">Select {modelName} Entry</h3>
              <button onClick={() => setShowPicker(false)} className="bcms-p-1 hover:bcms-bg-gray-100 bcms-rounded">
                <X className="bcms-w-5 bcms-h-5" />
              </button>
            </div>
            <div className="bcms-p-3 bcms-border-b">
              <div className="bcms-relative">
                <Search className="bcms-absolute bcms-left-3 bcms-top-1/2 bcms--translate-y-1/2 bcms-w-4 bcms-h-4 bcms-text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bcms-w-full bcms-pl-10 bcms-pr-4 bcms-py-2 bcms-text-sm bcms-border bcms-border-gray-300 bcms-rounded-lg"
                />
              </div>
            </div>
            <div className="bcms-flex-1 bcms-overflow-auto">
              {loading ? (
                <div className="bcms-text-center bcms-py-8 bcms-text-gray-400">Loading...</div>
              ) : filtered.length === 0 ? (
                <div className="bcms-text-center bcms-py-8 bcms-text-gray-400">No entries found</div>
              ) : (
                <div className="bcms-divide-y bcms-divide-gray-100">
                  {filtered.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => {
                        onChange(entry.id);
                        setSelectedTitle(entry.title);
                        setShowPicker(false);
                      }}
                      className="bcms-w-full bcms-text-left bcms-px-4 bcms-py-3 hover:bcms-bg-blue-50 bcms-transition"
                    >
                      <div className="bcms-font-medium bcms-text-sm bcms-text-gray-900">{entry.title}</div>
                      <div className="bcms-text-xs bcms-text-gray-400">{entry.status}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
