import React, { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';
import type { SEOData } from '../../core/types';

interface SEOPanelProps {
  seoData: SEOData;
  onChange: (seoData: SEOData) => void;
  entryTitle?: string;
}

export function SEOPanel({ seoData, onChange, entryTitle }: SEOPanelProps) {
  const [data, setData] = useState<SEOData>(seoData || {});

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
    const color = pct >= 90 ? 'bcms-text-red-600' : pct >= 75 ? 'bcms-text-yellow-600' : 'bcms-text-green-600';
    return <span className={`bcms-text-xs bcms-font-mono ${color}`}>{len}/{limit}</span>;
  };

  return (
    <div className="bcms-bg-white bcms-rounded-xl bcms-shadow-sm bcms-border bcms-border-gray-200 bcms-p-6 bcms-mt-6">
      <div className="bcms-flex bcms-items-center bcms-gap-2 bcms-mb-4">
        <Globe className="bcms-w-4 bcms-h-4 bcms-text-blue-600" />
        <h3 className="bcms-font-semibold bcms-text-gray-900">SEO</h3>
      </div>
      <div className="bcms-space-y-4">
        <div>
          <div className="bcms-flex bcms-justify-between bcms-items-center bcms-mb-2">
            <label className="bcms-block bcms-text-sm bcms-font-medium bcms-text-gray-700">Meta Title</label>
            {charCount(data.metaTitle, 60)}
          </div>
          <input type="text" value={data.metaTitle || ''} onChange={(e) => handleChange('metaTitle', e.target.value)} className="bcms-w-full bcms-px-3 bcms-py-2 bcms-text-sm bcms-border bcms-border-gray-300 bcms-rounded focus:bcms-ring-2 focus:bcms-ring-blue-500 focus:bcms-border-blue-500" placeholder="Falls back to entry title if empty" />
        </div>
        <div>
          <div className="bcms-flex bcms-justify-between bcms-items-center bcms-mb-2">
            <label className="bcms-block bcms-text-sm bcms-font-medium bcms-text-gray-700">Meta Description</label>
            {charCount(data.metaDescription, 160)}
          </div>
          <textarea value={data.metaDescription || ''} onChange={(e) => handleChange('metaDescription', e.target.value)} className="bcms-w-full bcms-px-3 bcms-py-2 bcms-text-sm bcms-border bcms-border-gray-300 bcms-rounded focus:bcms-ring-2 focus:bcms-ring-blue-500 focus:bcms-border-blue-500" rows={3} placeholder="Describe this content..." />
        </div>
        <div>
          <label className="bcms-block bcms-text-sm bcms-font-medium bcms-text-gray-700 bcms-mb-2">OG Image URL</label>
          <input type="text" value={data.ogImage || ''} onChange={(e) => handleChange('ogImage', e.target.value)} className="bcms-w-full bcms-px-3 bcms-py-2 bcms-text-sm bcms-border bcms-border-gray-300 bcms-rounded focus:bcms-ring-2 focus:bcms-ring-blue-500 focus:bcms-border-blue-500" placeholder="https://..." />
        </div>
        <div>
          <label className="bcms-block bcms-text-sm bcms-font-medium bcms-text-gray-700 bcms-mb-2">OG Title</label>
          <input type="text" value={data.ogTitle || ''} onChange={(e) => handleChange('ogTitle', e.target.value)} className="bcms-w-full bcms-px-3 bcms-py-2 bcms-text-sm bcms-border bcms-border-gray-300 bcms-rounded focus:bcms-ring-2 focus:bcms-ring-blue-500 focus:bcms-border-blue-500" placeholder="Falls back to meta title" />
        </div>
        <div>
          <label className="bcms-block bcms-text-sm bcms-font-medium bcms-text-gray-700 bcms-mb-2">OG Description</label>
          <textarea value={data.ogDescription || ''} onChange={(e) => handleChange('ogDescription', e.target.value)} className="bcms-w-full bcms-px-3 bcms-py-2 bcms-text-sm bcms-border bcms-border-gray-300 bcms-rounded focus:bcms-ring-2 focus:bcms-ring-blue-500 focus:bcms-border-blue-500" rows={2} placeholder="Falls back to meta description" />
        </div>
        <div>
          <label className="bcms-block bcms-text-sm bcms-font-medium bcms-text-gray-700 bcms-mb-2">Canonical URL</label>
          <input type="text" value={data.canonicalUrl || ''} onChange={(e) => handleChange('canonicalUrl', e.target.value)} className="bcms-w-full bcms-px-3 bcms-py-2 bcms-text-sm bcms-border bcms-border-gray-300 bcms-rounded focus:bcms-ring-2 focus:bcms-ring-blue-500 focus:bcms-border-blue-500" placeholder="https://..." />
        </div>
        <div className="bcms-flex bcms-items-center bcms-gap-2">
          <input type="checkbox" id="bcms-noIndex" checked={data.noIndex || false} onChange={(e) => handleChange('noIndex', e.target.checked)} className="bcms-w-4 bcms-h-4" />
          <label htmlFor="bcms-noIndex" className="bcms-text-sm bcms-font-medium bcms-text-gray-700">No Index</label>
        </div>
        <div>
          <label className="bcms-block bcms-text-sm bcms-font-medium bcms-text-gray-700 bcms-mb-2">Structured Data (JSON-LD)</label>
          <textarea value={data.structuredData || ''} onChange={(e) => handleChange('structuredData', e.target.value)} className="bcms-w-full bcms-px-3 bcms-py-2 bcms-text-sm bcms-font-mono bcms-border bcms-border-gray-300 bcms-rounded focus:bcms-ring-2 focus:bcms-ring-blue-500 focus:bcms-border-blue-500" rows={4} placeholder='{"@context": "https://schema.org", "@type": "..."}' />
        </div>
      </div>
    </div>
  );
}
