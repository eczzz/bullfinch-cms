import React from 'react';
import { AlertTriangle, Info, AlertCircle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger',
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const variantConfig = {
    danger: {
      icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
      iconBg: 'bg-red-50',
      button: 'bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-medium shadow-sm',
    },
    warning: {
      icon: <AlertCircle className="w-5 h-5 text-amber-600" />,
      iconBg: 'bg-amber-50',
      button: 'bg-amber-600 hover:bg-amber-700 text-white rounded-lg px-4 py-2 text-sm font-medium shadow-sm',
    },
    info: {
      icon: <Info className="w-5 h-5 text-blue-600" />,
      iconBg: 'bg-blue-50',
      button: 'bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium shadow-sm',
    },
  };

  const config = variantConfig[variant];

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="bg-white rounded-xl shadow-lg max-w-md w-full"
        style={{ animation: 'fade-in-up 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-0 flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${config.iconBg}`}>
              {config.icon}
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500 mt-1">{message}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg hover:bg-gray-100 transition-all duration-150 flex-shrink-0 -mt-1 -mr-1"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 mt-4 border-t border-gray-100">
          <button
            onClick={onCancel}
            className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all duration-150"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`transition-all duration-150 ${config.button}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
