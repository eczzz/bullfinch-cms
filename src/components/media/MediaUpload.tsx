import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useCMS } from '../provider';
import { createMediaRecord } from '../../core/queries';
import { validateFile, formatFileSize } from '../../core/helpers';

interface MediaUploadProps {
  onUploadComplete: () => void;
}

interface UploadItem {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export function MediaUpload({ onUploadComplete }: MediaUploadProps) {
  const { supabase, config, user } = useCMS();
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(Array.from(e.dataTransfer.files));
  };

  const processFiles = async (files: File[]) => {
    const items: UploadItem[] = files.map((f) => ({ file: f, progress: 0, status: 'pending' }));
    setUploads((prev) => [...prev, ...items]);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const idx = uploads.length + i;

      const validation = validateFile(file);
      if (!validation.valid) {
        setUploads((prev) =>
          prev.map((u, j) => (j === idx ? { ...u, status: 'error', error: validation.error } : u))
        );
        continue;
      }

      setUploads((prev) => prev.map((u, j) => (j === idx ? { ...u, status: 'uploading' } : u)));

      try {
        let url: string;
        let filename: string;

        if (config.storage) {
          const result = await config.storage.upload(file);
          url = result.url;
          filename = result.filename;
        } else {
          const ext = file.name.split('.').pop() || 'bin';
          filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
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

        if (config.hooks?.onMediaUpload) {
          await config.hooks.onMediaUpload(file, {
            id: '',
            filename: file.name,
            url,
            mime_type: file.type,
            size: file.size,
            uploaded_by: user?.id || '',
            created_at: '',
          });
        }

        setUploads((prev) =>
          prev.map((u, j) => (j === idx ? { ...u, status: 'success', progress: 100 } : u))
        );
      } catch (err: any) {
        setUploads((prev) =>
          prev.map((u, j) => (j === idx ? { ...u, status: 'error', error: err.message } : u))
        );
      }
    }

    onUploadComplete();
  };

  const removeItem = (index: number) => {
    setUploads((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-10 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-white hover:border-gray-400'
        }`}
        onDragEnter={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-3 ${
            isDragging ? 'bg-blue-100' : 'bg-gray-100'
          }`}
        >
          <Upload className={`w-5 h-5 ${isDragging ? 'text-blue-600' : 'text-gray-400'}`} />
        </div>
        <p className="text-sm font-medium text-gray-700 mb-1">
          {isDragging ? 'Drop files here' : 'Drag & drop files or click to browse'}
        </p>
        <p className="text-xs text-gray-400">Maximum file size: 50MB</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => {
            processFiles(Array.from(e.target.files || []));
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
          className="hidden"
        />
      </div>

      {/* Upload items */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((u, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 p-3 rounded-lg bg-white ring-1 transition-all ${
                u.status === 'error' ? 'ring-red-200' : 'ring-gray-200'
              }`}
            >
              <div className="flex-shrink-0">
                {u.status === 'success' && (
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                )}
                {u.status === 'error' && (
                  <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                  </div>
                )}
                {(u.status === 'pending' || u.status === 'uploading') && (
                  <div className="w-6 h-6 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{u.file.name}</p>
                <p className="text-xs text-gray-400">{formatFileSize(u.file.size)}</p>
                {u.status === 'error' && <p className="text-xs text-red-600 mt-0.5">{u.error}</p>}
                {u.status === 'uploading' && (
                  <div className="mt-1.5 h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all"
                      style={{ width: `${u.progress}%` }}
                    />
                  </div>
                )}
              </div>
              <button
                onClick={() => removeItem(i)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
