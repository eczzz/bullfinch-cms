import React, { useState, useEffect } from 'react';
import { Search, Upload, Image, Filter, Check, Link, Loader2, X } from 'lucide-react';
import { useCMS } from '../provider';
import { fetchMedia, deleteMediaRecord, createMediaRecord } from '../../core/queries';
import { MediaCard } from './MediaCard';
import { MediaUpload } from './MediaUpload';
import type { MediaItem } from '../../core/types';

const FILE_TYPE_FILTERS = [
  { key: 'all', label: 'All Files' },
  { key: 'image', label: 'Images' },
  { key: 'video', label: 'Videos' },
  { key: 'document', label: 'Documents' },
] as const;

type FileTypeFilter = (typeof FILE_TYPE_FILTERS)[number]['key'];

export function MediaLibrary() {
  const { supabase, config, user } = useCMS();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FileTypeFilter>('all');
  const [showUpload, setShowUpload] = useState(false);
  const [showImportUrl, setShowImportUrl] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const uploadFileInputRef = React.useRef<HTMLInputElement>(null);

  const canImportFromUrl = !!config.storage?.importFromUrl;

  const handleImportFromUrl = async () => {
    if (!importUrl.trim() || !config.storage?.importFromUrl) return;

    setImportLoading(true);
    setImportError('');

    try {
      const result = await config.storage.importFromUrl(importUrl.trim());

      await createMediaRecord(supabase, {
        filename: result.filename,
        url: result.url,
        mime_type: result.mimeType,
        size: result.size,
        uploaded_by: user?.id,
      });

      setImportUrl('');
      setShowImportUrl(false);
      loadMedia();
    } catch (err: any) {
      setImportError(err.message || 'Import failed');
    } finally {
      setImportLoading(false);
    }
  };

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
    loadMedia();
  }, []);

  const filtered = media.filter((m) => {
    if (searchTerm && !m.filename.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterType === 'image' && !m.mime_type.startsWith('image/')) return false;
    if (filterType === 'video' && !m.mime_type.startsWith('video/')) return false;
    if (filterType === 'document' && (m.mime_type.startsWith('image/') || m.mime_type.startsWith('video/'))) return false;
    return true;
  });

  const handleDelete = async (id: string) => {
    try {
      await deleteMediaRecord(supabase, id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      loadMedia();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleBulkDelete = async () => {
    for (const id of selectedIds) {
      try {
        await deleteMediaRecord(supabase, id);
      } catch (err) {
        console.error('Bulk delete failed for', id, err);
      }
    }
    setSelectedIds(new Set());
    setBulkMode(false);
    loadMedia();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="h-7 w-40 rounded-lg bg-gray-200 animate-pulse mb-2" />
            <div className="h-4 w-64 rounded bg-gray-200 animate-pulse" />
          </div>
          <div className="h-9 w-32 rounded-lg bg-gray-200 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-square rounded-lg bg-gray-200 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Media Library</h1>
          <p className="text-sm text-gray-500 mt-1">Upload and manage your media files</p>
        </div>
        <div className="flex items-center gap-2">
          {bulkMode && selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-all"
            >
              Delete {selectedIds.size} selected
            </button>
          )}
          <button
            onClick={() => {
              setBulkMode(!bulkMode);
              if (bulkMode) setSelectedIds(new Set());
            }}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all ${
              bulkMode
                ? 'bg-gray-900 text-white hover:bg-gray-800'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Check className="w-4 h-4" />
            {bulkMode ? 'Cancel' : 'Select'}
          </button>
          {canImportFromUrl && (
            <button
              onClick={() => {
                setShowImportUrl(!showImportUrl);
                setImportError('');
                setImportUrl('');
              }}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all ${
                showImportUrl
                  ? 'bg-gray-900 text-white hover:bg-gray-800'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Link className="w-4 h-4" />
              Import URL
            </button>
          )}
          <button
            onClick={() => {
              if (!showUpload) {
                setShowUpload(true);
                // Defer to next tick so the MediaUpload mounts first
                setTimeout(() => uploadFileInputRef.current?.click(), 0);
              } else {
                uploadFileInputRef.current?.click();
              }
            }}
            className="inline-flex items-center gap-2 cms-btn-accent text-white rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all"
          >
            <Upload className="w-4 h-4" />
            Upload
          </button>
        </div>
      </div>

      {/* Import from URL bar */}
      {showImportUrl && (
        <div className="mb-6 flex items-center gap-3 p-4 bg-white rounded-lg ring-1 ring-gray-200">
          <Link className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Paste image URL..."
            value={importUrl}
            onChange={(e) => {
              setImportUrl(e.target.value);
              setImportError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleImportFromUrl();
            }}
            disabled={importLoading}
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50"
            autoFocus
          />
          <button
            onClick={handleImportFromUrl}
            disabled={importLoading || !importUrl.trim()}
            className="inline-flex items-center gap-2 cms-btn-accent text-white rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all disabled:opacity-50"
          >
            {importLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Import'
            )}
          </button>
          <button
            onClick={() => {
              setShowImportUrl(false);
              setImportUrl('');
              setImportError('');
            }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
          >
            <X className="w-4 h-4" />
          </button>
          {importError && (
            <p className="text-xs text-red-600 flex-shrink-0">{importError}</p>
          )}
        </div>
      )}

      {/* Upload zone */}
      {showUpload && (
        <div className="mb-6">
          <MediaUpload
            ref={uploadFileInputRef}
            onUploadComplete={() => {
              setShowUpload(false);
              loadMedia();
            }}
          />
        </div>
      )}

      {/* Search & Filter bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search media…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>
        <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-gray-100">
          {FILE_TYPE_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterType(f.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                filterType === f.key
                  ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200/50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid / Empty state */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200 p-16 text-center">
          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Image className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            {media.length === 0 ? 'No media files yet' : 'No files match your search'}
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            {media.length === 0
              ? 'Upload your first file to get started'
              : 'Try adjusting your search or filter'}
          </p>
          {media.length === 0 && (
            <button
              onClick={() => {
                if (!showUpload) {
                  setShowUpload(true);
                  setTimeout(() => uploadFileInputRef.current?.click(), 0);
                } else {
                  uploadFileInputRef.current?.click();
                }
              }}
              className="inline-flex items-center gap-2 cms-btn-accent text-white rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all"
            >
              <Upload className="w-4 h-4" />
              Upload Files
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((m) => (
            <MediaCard
              key={m.id}
              media={m}
              onDelete={() => handleDelete(m.id)}
              selectable={bulkMode}
              selected={selectedIds.has(m.id)}
              onToggleSelect={() => toggleSelect(m.id)}
            />
          ))}
        </div>
      )}

      {/* Count */}
      {filtered.length > 0 && (
        <p className="text-xs text-gray-400 mt-6">
          Showing {filtered.length} of {media.length} files
        </p>
      )}
    </div>
  );
}
