import React, { useState, useEffect } from 'react';
import { Search, Upload } from 'lucide-react';
import { useSupabase } from '../provider';
import { fetchMedia, deleteMediaRecord } from '../../core/queries';
import { MediaCard } from './MediaCard';
import { MediaUpload } from './MediaUpload';
import type { MediaItem } from '../../core/types';

export function MediaLibrary() {
  const supabase = useSupabase();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'image' | 'document'>('all');
  const [showUpload, setShowUpload] = useState(false);

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

  useEffect(() => { loadMedia(); }, []);

  const filtered = media.filter((m) => {
    if (searchTerm && !m.filename.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterType === 'image' && !m.mime_type.startsWith('image/')) return false;
    if (filterType === 'document' && m.mime_type.startsWith('image/')) return false;
    return true;
  });

  const handleDelete = async (id: string) => {
    try {
      await deleteMediaRecord(supabase, id);
      loadMedia();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="bcms-p-8">
        <div className="bcms-grid bcms-grid-cols-4 bcms-gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bcms-h-40 bcms-bg-gray-200 bcms-rounded-lg bcms-animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bcms-p-8 bcms-max-w-7xl">
      <div className="bcms-flex bcms-items-center bcms-justify-between bcms-mb-8">
        <div>
          <h1 className="bcms-text-2xl bcms-font-bold bcms-text-gray-900">Media Library</h1>
          <p className="bcms-text-gray-500 bcms-text-sm bcms-mt-1">Upload and manage your media files</p>
        </div>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="bcms-bg-blue-600 bcms-text-white bcms-py-2.5 bcms-px-6 bcms-text-sm bcms-font-semibold bcms-rounded-lg hover:bcms-bg-blue-700 bcms-transition bcms-flex bcms-items-center bcms-gap-2 bcms-shadow-lg"
        >
          <Upload className="bcms-w-4 bcms-h-4" /> {showUpload ? 'Cancel' : 'Upload Files'}
        </button>
      </div>

      {showUpload && (
        <div className="bcms-mb-8">
          <MediaUpload onUploadComplete={() => { setShowUpload(false); loadMedia(); }} />
        </div>
      )}

      {/* Search & Filter */}
      <div className="bcms-mb-6 bcms-space-y-4">
        <div className="bcms-relative">
          <Search className="bcms-absolute bcms-left-3 bcms-top-1/2 bcms--translate-y-1/2 bcms-w-4 bcms-h-4 bcms-text-gray-400" />
          <input
            type="text"
            placeholder="Search media..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bcms-w-full bcms-pl-10 bcms-pr-4 bcms-py-2 bcms-text-sm bcms-border bcms-border-gray-300 bcms-rounded-lg"
          />
        </div>
        <div className="bcms-flex bcms-gap-2">
          {(['all', 'image', 'document'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`bcms-px-3 bcms-py-1.5 bcms-rounded-lg bcms-text-xs bcms-font-medium bcms-transition ${
                filterType === t
                  ? 'bcms-bg-blue-600 bcms-text-white'
                  : 'bcms-bg-gray-100 bcms-text-gray-600 hover:bcms-bg-gray-200'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bcms-bg-white bcms-rounded-xl bcms-shadow-sm bcms-border bcms-border-gray-200 bcms-p-12 bcms-text-center">
          <p className="bcms-text-gray-500 bcms-mb-4">
            {media.length === 0 ? 'No files yet. Upload your first file.' : 'No files match your search.'}
          </p>
        </div>
      ) : (
        <div className="bcms-grid bcms-grid-cols-1 md:bcms-grid-cols-2 lg:bcms-grid-cols-3 xl:bcms-grid-cols-4 bcms-gap-6">
          {filtered.map((m) => (
            <MediaCard key={m.id} media={m} onDelete={() => handleDelete(m.id)} />
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <p className="bcms-text-xs bcms-text-gray-400 bcms-mt-6">
          Showing {filtered.length} of {media.length} files
        </p>
      )}
    </div>
  );
}
