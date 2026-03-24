import React, { useState } from 'react';
import { Trash2, Copy, Download, File, Image, Film, FileText, Check, ExternalLink } from 'lucide-react';
import { useCMS } from '../provider';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { formatFileSize, formatDate } from '../../core/helpers';
import type { MediaItem } from '../../core/types';

/** Clipboard write with fallback for non-HTTPS contexts (LAN IPs, etc.) */
async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Fallback: textarea + execCommand
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

interface MediaCardProps {
  media: MediaItem;
  onDelete: () => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

function getFileTypeBadge(mime: string): { label: string; icon: React.ReactNode; color: string } {
  if (mime.startsWith('image/')) {
    return { label: 'Image', icon: <Image className="w-3 h-3" />, color: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' };
  }
  if (mime.startsWith('video/')) {
    return { label: 'Video', icon: <Film className="w-3 h-3" />, color: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200' };
  }
  return { label: 'Document', icon: <FileText className="w-3 h-3" />, color: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200' };
}

export function MediaCard({ media, onDelete, selectable, selected, onToggleSelect }: MediaCardProps) {
  const { user } = useCMS();
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isImage = media.mime_type.startsWith('image/');
  const isOwnFile = user?.id === media.uploaded_by;
  const badge = getFileTypeBadge(media.mime_type);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await copyToClipboard(media.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Last resort: open a prompt-like display (won't happen with the fallback, but just in case)
      console.error('Copy to clipboard failed');
    }
  };

  return (
    <>
      <div
        className={`bg-white rounded-lg shadow-sm ring-1 overflow-hidden transition-all group cursor-pointer ${
          selected ? 'ring-2 ring-blue-600' : 'ring-gray-200 hover:shadow-md'
        }`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => {
          if (selectable && onToggleSelect) onToggleSelect();
        }}
      >
        {/* Image area */}
        <div className="relative aspect-square bg-gray-50 overflow-hidden">
          {isImage ? (
            <img src={media.url} alt={media.filename} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <File className="w-12 h-12 text-gray-300" />
            </div>
          )}

          {/* File type badge */}
          <div className="absolute top-2 left-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${badge.color}`}>
              {badge.icon}
              {badge.label}
            </span>
          </div>

          {/* Select checkbox */}
          {selectable && (
            <div className="absolute top-2 right-2">
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                  selected
                    ? 'cms-accent-bg text-white'
                    : 'bg-white/90 ring-1 ring-gray-300 text-transparent'
                }`}
              >
                <Check className="w-3 h-3" />
              </div>
            </div>
          )}

          {/* Hover action bar — positioned at bottom only so right-click on image still works */}
          {hovered && !selectable && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8 transition-opacity">
              <div className="flex items-center gap-1.5">
                <a
                  href={media.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="Open in new tab"
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/90 text-gray-700 hover:bg-white transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <a
                  href={media.url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="Download"
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/90 text-gray-700 hover:bg-white transition-all"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={handleCopy}
                  title="Copy URL"
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/90 text-gray-700 hover:bg-white transition-all"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
                {isOwnFile && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm(true);
                    }}
                    title="Delete"
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all ml-auto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Info area */}
        <div className="p-3">
          <h3 className="text-sm font-medium text-gray-900 truncate" title={media.filename}>
            {media.filename}
          </h3>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-gray-400">{formatFileSize(media.size)}</p>
            <p className="text-xs text-gray-400">{formatDate(media.created_at)}</p>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title="Delete File"
        message={`Delete "${media.filename}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => {
          setShowDeleteConfirm(false);
          onDelete();
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}
