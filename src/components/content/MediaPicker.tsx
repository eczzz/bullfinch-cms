import React, { useState, useEffect, useRef } from 'react';
import { Image, X, Upload, Search, Check, File, Link } from 'lucide-react';
import { useSupabase } from '../provider';
import { useCMS } from '../provider';
import { fetchMedia, createMediaRecord } from '../../core/queries';
import { validateFile, formatFileSize } from '../../core/helpers';
import type { MediaItem } from '../../core/types';

type PickerTab = 'library' | 'url';

interface MediaPickerProps {
  value: string | null;
  onChange: (url: string | null) => void;
}

export function MediaPicker({ value, onChange }: MediaPickerProps) {
  const supabase = useSupabase();
  const { config, user } = useCMS();
  const [showPicker, setShowPicker] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [pickerTab, setPickerTab] = useState<PickerTab>('library');
  const [externalUrl, setExternalUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMedia = async () => {
    setLoading(true);
    try {
      const data = await fetchMedia(supabase);
      setMedia(data);
    } catch (err) {
      console.error('Error loading media:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showPicker) {
      loadMedia();
      setSelectedUrl(null);
      setSearch('');
      setExternalUrl('');
      setPickerTab('library');
    }
  }, [showPicker]);

  const filtered = media.filter(
    (m) => !search || m.filename.toLowerCase().includes(search.toLowerCase())
  );

  const isImage = (mime: string) => mime.startsWith('image/');

  const handleConfirm = () => {
    if (selectedUrl) {
      onChange(selectedUrl);
      setShowPicker(false);
    }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0];
    const validation = validateFile(file);
    if (!validation.valid) return;

    try {
      let url: string;
      if (config.storage) {
        const result = await config.storage.upload(file);
        url = result.url;
      } else {
        const ext = file.name.split('.').pop() || 'bin';
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const path = `uploads/${filename}`;
        const { error } = await supabase.storage.from('media').upload(path, file, { contentType: file.type });
        if (error) throw error;
        const { data } = supabase.storage.from('media').getPublicUrl(path);
        url = data.publicUrl;
      }

      await createMediaRecord(supabase, {
        filename: file.name,
        url,
        mime_type: file.type,
        size: file.size,
        uploaded_by: user?.id,
      });

      await loadMedia();
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };

  return (
    <div>
      {/* Trigger / value display */}
      {value ? (
        <div className="relative inline-block">
          {value.match(/\.(jpg|jpeg|png|gif|webp|svg)/i) ? (
            <img
              src={value}
              alt=""
              className="max-h-40 rounded-lg ring-1 ring-gray-200"
            />
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg ring-1 ring-gray-200">
              <Image className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600 truncate max-w-xs">{value}</span>
            </div>
          )}
          <button
            onClick={() => onChange(null)}
            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-all shadow-sm"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPicker(true)}
            className="border-2 border-dashed border-gray-300 rounded-lg px-6 py-4 text-sm text-gray-500 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/50 transition-all flex items-center gap-2"
          >
            <Upload className="w-4 h-4" /> Choose media
          </button>
          <span className="text-xs text-gray-400">or</span>
          <button
            onClick={() => { setShowPicker(true); setPickerTab('url'); }}
            className="border-2 border-dashed border-gray-300 rounded-lg px-6 py-4 text-sm text-gray-500 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/50 transition-all flex items-center gap-2"
          >
            <Link className="w-4 h-4" /> Paste URL
          </button>
        </div>
      )}

      {/* Picker modal */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setShowPicker(false)} />
          <div className="relative bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[80vh] flex flex-col border border-gray-200">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Select Media</h3>
                <p className="text-xs text-gray-500 mt-0.5">Choose a file from your media library</p>
              </div>
              <button onClick={() => setShowPicker(false)} className="p-1 rounded-md hover:bg-gray-100 transition-all">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Tabs */}
            <div className="px-5 border-b border-gray-100 flex gap-0">
              <button
                onClick={() => setPickerTab('library')}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                  pickerTab === 'library'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="flex items-center gap-1.5"><Upload className="w-3.5 h-3.5" /> Library</span>
              </button>
              <button
                onClick={() => setPickerTab('url')}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                  pickerTab === 'url'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="flex items-center gap-1.5"><Link className="w-3.5 h-3.5" /> External URL</span>
              </button>
            </div>

            {pickerTab === 'url' ? (
              /* URL input panel */
              <div className="flex-1 p-5">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Image URL</label>
                    <input
                      type="url"
                      value={externalUrl}
                      onChange={(e) => setExternalUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      autoFocus
                    />
                  </div>
                  {externalUrl && externalUrl.match(/^https?:\/\/.+/i) && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500">Preview:</p>
                      <div className="rounded-lg overflow-hidden ring-1 ring-gray-200 bg-gray-50 p-2 inline-block">
                        <img
                          src={externalUrl}
                          alt="Preview"
                          className="max-h-48 rounded"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>

            {/* Search + upload */}
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search files…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg px-3 py-2 text-sm font-medium shadow-sm transition-all"
              >
                <Upload className="w-4 h-4" />
                Upload
              </button>
              <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => handleUpload(e.target.files)}
                className="hidden"
              />
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-auto p-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                  <p className="text-sm text-gray-500 mt-3">Loading media…</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <Image className="w-5 h-5 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">No media found</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {filtered.map((m) => {
                    const isSelected = selectedUrl === m.url;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setSelectedUrl(isSelected ? null : m.url)}
                        className={`relative rounded-lg overflow-hidden ring-1 transition-all text-left ${
                          isSelected
                            ? 'ring-2 ring-blue-600 shadow-md'
                            : 'ring-gray-200 hover:ring-gray-300 hover:shadow-sm'
                        }`}
                      >
                        {isImage(m.mime_type) ? (
                          <img src={m.url} alt={m.filename} className="w-full aspect-square object-cover" />
                        ) : (
                          <div className="w-full aspect-square bg-gray-50 flex items-center justify-center">
                            <File className="w-8 h-8 text-gray-300" />
                          </div>
                        )}
                        <div className="p-2">
                          <p className="text-xs text-gray-600 truncate">{m.filename}</p>
                          <p className="text-[10px] text-gray-400">{formatFileSize(m.size)}</p>
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full cms-accent-bg flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            </>
            )}

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowPicker(false)}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg px-4 py-2 text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (pickerTab === 'url' && externalUrl.match(/^https?:\/\/.+/i)) {
                    onChange(externalUrl);
                    setShowPicker(false);
                  } else {
                    handleConfirm();
                  }
                }}
                disabled={pickerTab === 'url' ? !externalUrl.match(/^https?:\/\/.+/i) : !selectedUrl}
                className="inline-flex items-center gap-2 cms-btn-accent text-white rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" />
                {pickerTab === 'url' ? 'Use URL' : 'Select'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
