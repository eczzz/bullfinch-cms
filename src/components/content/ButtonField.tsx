import React from 'react';

interface ButtonFieldValue {
  text: string;
  url: string;
  target: '_self' | '_blank';
}

interface ButtonFieldProps {
  value: ButtonFieldValue;
  onChange: (value: ButtonFieldValue) => void;
}

export function ButtonField({ value, onChange }: ButtonFieldProps) {
  const update = (partial: Partial<ButtonFieldValue>) => {
    onChange({ ...value, ...partial });
  };

  return (
    <div className="bcms-grid bcms-grid-cols-2 bcms-gap-3">
      <div>
        <label className="bcms-block bcms-text-xs bcms-text-gray-500 bcms-mb-1">Button Text</label>
        <input
          type="text"
          value={value.text || ''}
          onChange={(e) => update({ text: e.target.value })}
          className="bcms-w-full bcms-px-3 bcms-py-2 bcms-text-sm bcms-border bcms-border-gray-300 bcms-rounded-lg"
          placeholder="Click here"
        />
      </div>
      <div>
        <label className="bcms-block bcms-text-xs bcms-text-gray-500 bcms-mb-1">URL</label>
        <input
          type="url"
          value={value.url || ''}
          onChange={(e) => update({ url: e.target.value })}
          className="bcms-w-full bcms-px-3 bcms-py-2 bcms-text-sm bcms-border bcms-border-gray-300 bcms-rounded-lg"
          placeholder="https://..."
        />
      </div>
      <div>
        <label className="bcms-block bcms-text-xs bcms-text-gray-500 bcms-mb-1">Open in</label>
        <select
          value={value.target || '_self'}
          onChange={(e) => update({ target: e.target.value as '_self' | '_blank' })}
          className="bcms-w-full bcms-px-3 bcms-py-2 bcms-text-sm bcms-border bcms-border-gray-300 bcms-rounded-lg"
        >
          <option value="_self">Same tab</option>
          <option value="_blank">New tab</option>
        </select>
      </div>
    </div>
  );
}
