import React from 'react';
import { ExternalLink } from 'lucide-react';

interface ButtonFieldValue {
  text: string;
  url: string;
  target: '_self' | '_blank';
  style?: 'primary' | 'secondary' | 'ghost';
}

interface ButtonFieldProps {
  value: ButtonFieldValue;
  onChange: (value: ButtonFieldValue) => void;
}

const inputClass =
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all';

const STYLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'primary', label: 'Primary' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'ghost', label: 'Ghost' },
];

const STYLE_CLASSES: Record<string, string> = {
  primary: 'cms-btn-accent text-white rounded-lg px-4 py-2 text-sm font-medium shadow-sm',
  secondary: 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg px-4 py-2 text-sm font-medium shadow-sm',
  ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg px-4 py-2 text-sm font-medium',
};

export function ButtonField({ value, onChange }: ButtonFieldProps) {
  const update = (partial: Partial<ButtonFieldValue>) => {
    onChange({ ...value, ...partial });
  };

  const buttonStyle = value.style || 'primary';

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-center">
        {value.text ? (
          <span className={`inline-flex items-center gap-2 ${STYLE_CLASSES[buttonStyle]}`}>
            {value.text}
            {value.target === '_blank' && <ExternalLink className="w-3.5 h-3.5" />}
          </span>
        ) : (
          <span className="text-xs text-gray-400">Button preview will appear here</span>
        )}
      </div>

      {/* Config */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
          <input
            type="text"
            value={value.text || ''}
            onChange={(e) => update({ text: e.target.value })}
            className={inputClass}
            placeholder="Click here"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
          <input
            type="url"
            value={value.url || ''}
            onChange={(e) => update({ url: e.target.value })}
            className={inputClass}
            placeholder="https://…"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Style</label>
          <select
            value={buttonStyle}
            onChange={(e) => update({ style: e.target.value as ButtonFieldValue['style'] })}
            className={inputClass}
          >
            {STYLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Open in new tab</label>
          <button
            type="button"
            onClick={() => update({ target: value.target === '_blank' ? '_self' : '_blank' })}
            className="relative mt-1"
          >
            <div className={`w-10 h-[22px] rounded-full p-[2px] cursor-pointer transition-colors duration-200 ${value.target === '_blank' ? 'cms-accent-bg' : 'bg-gray-200'}`}>
              <div className={`w-[18px] h-[18px] bg-white rounded-full shadow-sm transition-transform duration-200 ${value.target === '_blank' ? 'translate-x-[20px]' : 'translate-x-0'}`} />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
