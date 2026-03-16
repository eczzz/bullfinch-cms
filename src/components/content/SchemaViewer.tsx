import React, { useState, useMemo } from 'react';
import { X, Copy, Check } from 'lucide-react';
import type { ContentModel } from '../../core/types';

interface SchemaViewerProps {
  model: ContentModel;
  onClose: () => void;
}

function highlightJson(json: string): React.ReactNode[] {
  const lines = json.split('\n');
  return lines.map((line, i) => {
    const highlighted = line
      .replace(/"([^"]+)"(?=\s*:)/g, '<span class="text-blue-400">"$1"</span>')
      .replace(/:\s*"([^"]*)"/g, ': <span class="text-emerald-400">"$1"</span>')
      .replace(/:\s*(\d+\.?\d*)/g, ': <span class="text-amber-400">$1</span>')
      .replace(/:\s*(true|false|null)/g, ': <span class="text-purple-400">$1</span>');

    return (
      <div key={i} className="flex">
        <span className="inline-block w-8 text-right mr-4 text-gray-600 select-none flex-shrink-0">
          {i + 1}
        </span>
        <span dangerouslySetInnerHTML={{ __html: highlighted }} />
      </div>
    );
  });
}

export function SchemaViewer({ model, onClose }: SchemaViewerProps) {
  const [copied, setCopied] = useState(false);

  const schema = useMemo(() => JSON.stringify(
    { name: model.name, api_identifier: model.api_identifier, fields: model.fields },
    null,
    2
  ), [model]);

  const highlighted = useMemo(() => highlightJson(schema), [schema]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(schema);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-gray-200 animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{model.name} — Schema</h3>
            <p className="text-xs text-gray-500 mt-0.5">{model.fields.length} field{model.fields.length !== 1 ? 's' : ''} defined</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all"
              title="Copy schema"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Code Block */}
        <div className="flex-1 overflow-auto">
          <pre className="bg-gray-900 text-gray-100 rounded-b-xl p-4 font-mono text-sm leading-relaxed overflow-x-auto">
            {highlighted}
          </pre>
        </div>
      </div>
    </div>
  );
}
