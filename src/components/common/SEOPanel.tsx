import React, { useState, useEffect } from 'react';
import { Globe, ChevronDown, Search } from 'lucide-react';
import type { SEOData } from '../../core/types';

interface SEOPanelProps {
  seoData: SEOData;
  onChange: (seoData: SEOData) => void;
  entryTitle?: string;
}

export function SEOPanel({ seoData, onChange, entryTitle }: SEOPanelProps) {
  const [data, setData] = useState<SEOData>(seoData || {});
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    setData(seoData || {});
  }, [seoData]);

  const handleChange = (field: keyof SEOData, value: string | boolean) => {
    const newData = { ...data, [field]: value };
    setData(newData);
    onChange(newData);
  };

  const charCount = (text: string = '', limit: number) => {
    const len = text.length;
    const pct = (len / limit) * 100;
    const color = pct >= 90 ? 'text-red-600' : pct >= 75 ? 'text-amber-600' : 'text-emerald-600';
    return <span className={`text-xs font-mono ${color}`}>{len}/{limit}</span>;
  };

  const previewTitle = data.metaTitle || entryTitle || 'Page Title';
  const previewDescription = data.metaDescription || 'No description provided. Add a meta description to improve SEO.';
  const previewUrl = data.canonicalUrl || 'https://example.com/page';

  const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-0 transition-all duration-150';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 mt-6 overflow-hidden">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-all duration-150"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <Search className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-sm font-medium text-gray-700">SEO Settings</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 border-t border-gray-100">
          {/* Google Preview */}
          <div className="mt-4 mb-6">
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Search Preview</label>
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
              <p className="text-lg text-blue-700 hover:underline cursor-pointer leading-tight truncate">
                {previewTitle}
              </p>
              <p className="text-xs text-emerald-700 mt-1 truncate">{previewUrl}</p>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                {previewDescription}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Meta Title */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Meta Title</label>
                {charCount(data.metaTitle, 60)}
              </div>
              <input
                type="text"
                value={data.metaTitle || ''}
                onChange={(e) => handleChange('metaTitle', e.target.value)}
                className={inputClass}
                placeholder="Falls back to entry title if empty"
              />
            </div>

            {/* Meta Description */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Meta Description</label>
                {charCount(data.metaDescription, 160)}
              </div>
              <textarea
                value={data.metaDescription || ''}
                onChange={(e) => handleChange('metaDescription', e.target.value)}
                className={`${inputClass} resize-none`}
                rows={3}
                placeholder="Describe this content..."
              />
            </div>

            {/* OG Image URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">OG Image URL</label>
              <input
                type="text"
                value={data.ogImage || ''}
                onChange={(e) => handleChange('ogImage', e.target.value)}
                className={inputClass}
                placeholder="https://..."
              />
            </div>

            {/* OG Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">OG Title</label>
              <input
                type="text"
                value={data.ogTitle || ''}
                onChange={(e) => handleChange('ogTitle', e.target.value)}
                className={inputClass}
                placeholder="Falls back to meta title"
              />
            </div>

            {/* OG Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">OG Description</label>
              <textarea
                value={data.ogDescription || ''}
                onChange={(e) => handleChange('ogDescription', e.target.value)}
                className={`${inputClass} resize-none`}
                rows={2}
                placeholder="Falls back to meta description"
              />
            </div>

            {/* Canonical URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Canonical URL</label>
              <input
                type="text"
                value={data.canonicalUrl || ''}
                onChange={(e) => handleChange('canonicalUrl', e.target.value)}
                className={inputClass}
                placeholder="https://..."
              />
            </div>

            {/* No Index */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                id="noIndex"
                checked={data.noIndex || false}
                onChange={(e) => handleChange('noIndex', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500/20 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">No Index</span>
            </label>

            {/* Structured Data */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Structured Data (JSON-LD)</label>
              <textarea
                value={
                  typeof data.structuredData === 'object' && data.structuredData !== null
                    ? JSON.stringify(data.structuredData, null, 2)
                    : data.structuredData || ''
                }
                onChange={(e) => {
                  const raw = e.target.value;
                  try {
                    const parsed = JSON.parse(raw);
                    handleChange('structuredData', parsed);
                  } catch {
                    handleChange('structuredData', raw);
                  }
                }}
                className={`${inputClass} font-mono resize-none`}
                rows={4}
                placeholder='{"@context": "https://schema.org", "@type": "..."}'
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
