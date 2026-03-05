import React from 'react';
import { X, Copy } from 'lucide-react';
import type { ContentEntry, ContentModel } from '../../core/types';

interface JsonViewerProps {
  title: string;
  entry: ContentEntry;
  model?: ContentModel;
  onClose: () => void;
}

export function JsonViewer({ title, entry, model, onClose }: JsonViewerProps) {
  const json = JSON.stringify(entry, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(json);
  };

  return (
    <div className="bcms-fixed bcms-inset-0 bcms-z-50 bcms-flex bcms-items-center bcms-justify-center">
      <div className="bcms-fixed bcms-inset-0 bcms-bg-black/50" onClick={onClose} />
      <div className="bcms-relative bcms-bg-white bcms-rounded-xl bcms-shadow-2xl bcms-w-full bcms-max-w-2xl bcms-max-h-[80vh] bcms-flex bcms-flex-col">
        <div className="bcms-flex bcms-items-center bcms-justify-between bcms-p-4 bcms-border-b">
          <h3 className="bcms-font-semibold bcms-text-gray-900">Entry JSON</h3>
          <div className="bcms-flex bcms-items-center bcms-gap-2">
            <button
              onClick={handleCopy}
              className="bcms-p-2 bcms-text-gray-400 hover:bcms-text-gray-600 hover:bcms-bg-gray-100 bcms-rounded-lg bcms-transition"
              title="Copy JSON"
            >
              <Copy className="bcms-w-4 bcms-h-4" />
            </button>
            <button onClick={onClose} className="bcms-p-1 hover:bcms-bg-gray-100 bcms-rounded">
              <X className="bcms-w-5 bcms-h-5" />
            </button>
          </div>
        </div>
        <pre className="bcms-flex-1 bcms-overflow-auto bcms-p-4 bcms-text-xs bcms-font-mono bcms-text-gray-700 bcms-bg-gray-50">
          {json}
        </pre>
      </div>
    </div>
  );
}
