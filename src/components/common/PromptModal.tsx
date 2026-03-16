import React, { useState, useEffect, useRef } from 'react';

interface PromptModalProps {
  isOpen: boolean;
  title: string;
  message?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function PromptModal({
  isOpen,
  title,
  message,
  defaultValue = '',
  placeholder = '',
  confirmLabel = 'OK',
  onConfirm,
  onCancel,
}: PromptModalProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(value);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <form
        onSubmit={handleSubmit}
        className="relative bg-white rounded-xl shadow-xl ring-1 ring-gray-200 w-full max-w-md mx-4 overflow-hidden"
      >
        <div className="px-6 py-5">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {message && <p className="text-sm text-gray-500 mt-1">{message}</p>}
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="mt-3 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>
        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-end gap-2 bg-gray-50">
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg px-4 py-2 text-sm font-medium transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 cms-btn-accent text-white rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all"
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
