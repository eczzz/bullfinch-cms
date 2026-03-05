import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

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

  const variantStyles = {
    danger: { icon: 'bg-red-100 text-red-600', button: 'bg-red-600 hover:bg-red-700 text-white' },
    warning: { icon: 'bg-yellow-100 text-yellow-600', button: 'bg-yellow-600 hover:bg-yellow-700 text-white' },
    info: { icon: 'bg-blue-100 text-blue-600', button: 'bg-blue-600 hover:bg-blue-700 text-white' },
  };

  const styles = variantStyles[variant];

  return (
    <div className="bcms-fixed bcms-inset-0 bcms-bg-black/50 bcms-flex bcms-items-center bcms-justify-center bcms-z-50 bcms-p-4">
      <div className="bcms-bg-white bcms-rounded-lg bcms-shadow-xl bcms-max-w-md bcms-w-full">
        <div className="bcms-flex bcms-items-start bcms-justify-between bcms-p-6 bcms-pb-4">
          <div className="bcms-flex bcms-items-start bcms-gap-4">
            <div className={`bcms-w-12 bcms-h-12 bcms-rounded-full bcms-flex bcms-items-center bcms-justify-center bcms-flex-shrink-0 ${styles.icon}`}>
              <AlertTriangle className="bcms-w-6 bcms-h-6" />
            </div>
            <div>
              <h3 className="bcms-text-lg bcms-font-semibold bcms-text-gray-900">{title}</h3>
              <p className="bcms-text-sm bcms-text-gray-500 bcms-mt-1">{message}</p>
            </div>
          </div>
          <button onClick={onCancel} className="bcms-p-1 hover:bcms-bg-gray-100 bcms-rounded-md bcms-transition">
            <X className="bcms-w-5 bcms-h-5 bcms-text-gray-400" />
          </button>
        </div>
        <div className="bcms-flex bcms-items-center bcms-justify-end bcms-gap-3 bcms-px-6 bcms-pb-6">
          <button onClick={onCancel} className="bcms-px-4 bcms-py-2 bcms-text-sm bcms-text-gray-700 hover:bcms-bg-gray-100 bcms-rounded-md bcms-transition">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className={`bcms-px-4 bcms-py-2 bcms-text-sm bcms-rounded-md bcms-transition ${styles.button}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
