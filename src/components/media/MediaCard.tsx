import React, { useState } from 'react';
import { Trash2, Copy, Download, File, FileText, Image } from 'lucide-react';
import { useCMS } from '../provider';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { formatFileSize, formatDate } from '../../core/helpers';
import type { MediaItem } from '../../core/types';

interface MediaCardProps {
  media: MediaItem;
  onDelete: () => void;
}

export function MediaCard({ media, onDelete }: MediaCardProps) {
  const { user } = useCMS();
  const [copied, setCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isImage = media.mime_type.startsWith('image/');
  const isOwnFile = user?.id === media.uploaded_by;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(media.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="bcms-bg-white bcms-rounded-xl bcms-shadow-sm bcms-border bcms-border-gray-200 bcms-overflow-hidden hover:bcms-shadow-lg bcms-transition-all bcms-group"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="bcms-relative bcms-aspect-square bcms-bg-gray-50 bcms-overflow-hidden">
        {isImage ? (
          <img src={media.url} alt={media.filename} className="bcms-w-full bcms-h-full bcms-object-cover" />
        ) : (
          <div className="bcms-w-full bcms-h-full bcms-flex bcms-items-center bcms-justify-center">
            <File className="bcms-w-12 bcms-h-12 bcms-text-gray-300" />
          </div>
        )}

        {showActions && (
          <div className="bcms-absolute bcms-inset-0 bcms-bg-black/50 bcms-flex bcms-items-center bcms-justify-center bcms-gap-2">
            <a
              href={media.url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="bcms-bg-white bcms-text-gray-700 bcms-p-2 bcms-rounded-lg hover:bcms-bg-gray-100 bcms-transition"
            >
              <Download className="bcms-w-5 bcms-h-5" />
            </a>
            <button onClick={handleCopy} className="bcms-bg-white bcms-text-gray-700 bcms-p-2 bcms-rounded-lg hover:bcms-bg-gray-100 bcms-transition">
              <Copy className="bcms-w-5 bcms-h-5" />
            </button>
            {isOwnFile && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="bcms-bg-red-600 bcms-text-white bcms-p-2 bcms-rounded-lg hover:bcms-bg-red-700 bcms-transition"
              >
                <Trash2 className="bcms-w-5 bcms-h-5" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="bcms-p-4">
        <h3 className="bcms-text-sm bcms-font-medium bcms-text-gray-900 bcms-truncate" title={media.filename}>
          {media.filename}
        </h3>
        <div className="bcms-flex bcms-items-center bcms-justify-between bcms-mt-1">
          <p className="bcms-text-xs bcms-text-gray-400">{formatFileSize(media.size)}</p>
          <p className="bcms-text-xs bcms-text-gray-400">{formatDate(media.created_at)}</p>
        </div>
        {copied && <p className="bcms-text-xs bcms-text-green-600 bcms-mt-2">✓ URL copied</p>}
      </div>

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title="Delete File"
        message={`Delete "${media.filename}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => { setShowDeleteConfirm(false); onDelete(); }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
