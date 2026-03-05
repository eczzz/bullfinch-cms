import React, { useState, useRef } from 'react';
import { Upload, X } from 'lucide-react';
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
        setUploads((prev) => prev.map((u, j) => j === idx ? { ...u, status: 'error', error: validation.error } : u));
        continue;
      }

      setUploads((prev) => prev.map((u, j) => j === idx ? { ...u, status: 'uploading' } : u));

      try {
        let url: string;
        let filename: string;

        if (config.storage) {
          const result = await config.storage.upload(file);
          url = result.url;
          filename = result.filename;
        } else {
          // Fallback to Supabase storage
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
          await config.hooks.onMediaUpload(file, { id: '', filename: file.name, url, mime_type: file.type, size: file.size, uploaded_by: user?.id || '', created_at: '' });
        }

        setUploads((prev) => prev.map((u, j) => j === idx ? { ...u, status: 'success', progress: 100 } : u));
      } catch (err: any) {
        setUploads((prev) => prev.map((u, j) => j === idx ? { ...u, status: 'error', error: err.message } : u));
      }
    }

    onUploadComplete();
  };

  const removeItem = (index: number) => {
    setUploads((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="bcms-space-y-4">
      <div
        className={`bcms-border-2 bcms-border-dashed bcms-rounded-lg bcms-p-8 bcms-text-center bcms-transition ${
          isDragging ? 'bcms-border-blue-500 bcms-bg-blue-50' : 'bcms-border-gray-300 bcms-bg-gray-50 hover:bcms-border-blue-400'
        }`}
        onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <Upload className="bcms-w-8 bcms-h-8 bcms-text-gray-400 bcms-mx-auto bcms-mb-3" />
        <p className="bcms-text-sm bcms-font-medium bcms-text-gray-700 bcms-mb-1">Drag files here to upload</p>
        <p className="bcms-text-xs bcms-text-gray-400 bcms-mb-4">or click to browse (max 50MB)</p>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="bcms-bg-blue-600 bcms-text-white bcms-py-2 bcms-px-4 bcms-text-sm bcms-font-semibold bcms-rounded-lg hover:bcms-bg-blue-700 bcms-transition"
        >
          Select Files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => { processFiles(Array.from(e.target.files || [])); if (fileInputRef.current) fileInputRef.current.value = ''; }}
          className="bcms-hidden"
        />
      </div>

      {uploads.length > 0 && (
        <div className="bcms-space-y-2">
          {uploads.map((u, i) => (
            <div key={i} className="bcms-flex bcms-items-center bcms-gap-3 bcms-p-3 bcms-border bcms-border-gray-200 bcms-rounded-lg bcms-bg-white">
              <div className="bcms-flex-1 bcms-min-w-0">
                <p className="bcms-text-sm bcms-font-medium bcms-text-gray-900 bcms-truncate">{u.file.name}</p>
                <p className="bcms-text-xs bcms-text-gray-400">{formatFileSize(u.file.size)}</p>
                {u.status === 'error' && <p className="bcms-text-xs bcms-text-red-500">{u.error}</p>}
                {u.status === 'success' && <p className="bcms-text-xs bcms-text-green-500">✓ Uploaded</p>}
              </div>
              <button onClick={() => removeItem(i)} className="bcms-p-1 bcms-text-gray-400 hover:bcms-text-gray-600">
                <X className="bcms-w-4 bcms-h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
