import React, { useState, useEffect } from 'react';
import { Image, X, Upload } from 'lucide-react';
import { useSupabase } from '../provider';
import { fetchMedia } from '../../core/queries';
import type { MediaItem } from '../../core/types';

interface MediaPickerProps {
  value: string | null;
  onChange: (url: string | null) => void;
}

export function MediaPicker({ value, onChange }: MediaPickerProps) {
  const supabase = useSupabase();
  const [showPicker, setShowPicker] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

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
    if (showPicker) loadMedia();
  }, [showPicker]);

  const filtered = media.filter(
    (m) => !search || m.filename.toLowerCase().includes(search.toLowerCase())
  );

  const isImage = (mime: string) => mime.startsWith('image/');

  return (
    <div>
      {value ? (
        <div className="bcms-relative bcms-inline-block">
          {value.match(/\.(jpg|jpeg|png|gif|webp|svg)/i) ? (
            <img src={value} alt="" className="bcms-max-h-40 bcms-rounded-lg bcms-border bcms-border-gray-200" />
          ) : (
            <div className="bcms-flex bcms-items-center bcms-gap-2 bcms-px-4 bcms-py-2 bcms-bg-gray-50 bcms-rounded-lg bcms-border bcms-border-gray-200">
              <Image className="bcms-w-4 bcms-h-4 bcms-text-gray-400" />
              <span className="bcms-text-sm bcms-text-gray-600 bcms-truncate bcms-max-w-xs">{value}</span>
            </div>
          )}
          <button
            onClick={() => onChange(null)}
            className="bcms-absolute bcms--top-2 bcms--right-2 bcms-bg-red-500 bcms-text-white bcms-rounded-full bcms-p-1 hover:bcms-bg-red-600 bcms-transition"
          >
            <X className="bcms-w-3 bcms-h-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowPicker(true)}
          className="bcms-border-2 bcms-border-dashed bcms-border-gray-300 bcms-rounded-lg bcms-px-6 bcms-py-4 bcms-text-sm bcms-text-gray-500 hover:bcms-border-blue-400 hover:bcms-text-blue-600 bcms-transition bcms-flex bcms-items-center bcms-gap-2"
        >
          <Upload className="bcms-w-4 bcms-h-4" /> Choose media
        </button>
      )}

      {/* Picker Modal */}
      {showPicker && (
        <div className="bcms-fixed bcms-inset-0 bcms-z-50 bcms-flex bcms-items-center bcms-justify-center">
          <div className="bcms-fixed bcms-inset-0 bcms-bg-black/50" onClick={() => setShowPicker(false)} />
          <div className="bcms-relative bcms-bg-white bcms-rounded-xl bcms-shadow-2xl bcms-w-full bcms-max-w-2xl bcms-max-h-[80vh] bcms-flex bcms-flex-col">
            <div className="bcms-flex bcms-items-center bcms-justify-between bcms-p-4 bcms-border-b">
              <h3 className="bcms-font-semibold bcms-text-gray-900">Select Media</h3>
              <button onClick={() => setShowPicker(false)} className="bcms-p-1 hover:bcms-bg-gray-100 bcms-rounded">
                <X className="bcms-w-5 bcms-h-5" />
              </button>
            </div>
            <div className="bcms-p-4 bcms-border-b">
              <input
                type="text"
                placeholder="Search files..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bcms-w-full bcms-px-4 bcms-py-2 bcms-text-sm bcms-border bcms-border-gray-300 bcms-rounded-lg"
              />
            </div>
            <div className="bcms-flex-1 bcms-overflow-auto bcms-p-4">
              {loading ? (
                <div className="bcms-text-center bcms-py-8 bcms-text-gray-400">Loading...</div>
              ) : filtered.length === 0 ? (
                <div className="bcms-text-center bcms-py-8 bcms-text-gray-400">No media found</div>
              ) : (
                <div className="bcms-grid bcms-grid-cols-4 bcms-gap-3">
                  {filtered.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { onChange(m.url); setShowPicker(false); }}
                      className="bcms-border bcms-border-gray-200 bcms-rounded-lg bcms-overflow-hidden hover:bcms-border-blue-500 hover:bcms-shadow-md bcms-transition bcms-text-left"
                    >
                      {isImage(m.mime_type) ? (
                        <img src={m.url} alt={m.filename} className="bcms-w-full bcms-aspect-square bcms-object-cover" />
                      ) : (
                        <div className="bcms-w-full bcms-aspect-square bcms-bg-gray-50 bcms-flex bcms-items-center bcms-justify-center">
                          <Image className="bcms-w-8 bcms-h-8 bcms-text-gray-300" />
                        </div>
                      )}
                      <div className="bcms-p-2">
                        <p className="bcms-text-xs bcms-text-gray-600 bcms-truncate">{m.filename}</p>
                      </div>
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
