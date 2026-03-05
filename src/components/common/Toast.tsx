import React, { useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

interface ToastProps {
  type: 'success' | 'error';
  title: string;
  message?: string;
  onClose: () => void;
  duration?: number;
}

export function Toast({ type, title, message, onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const isSuccess = type === 'success';

  return (
    <div
      className={`bcms-fixed bcms-bottom-6 bcms-right-6 bcms-max-w-sm bcms-z-50 bcms-rounded-lg bcms-shadow-lg bcms-p-4 bcms-border ${
        isSuccess ? 'bcms-bg-green-50 bcms-border-green-200' : 'bcms-bg-red-50 bcms-border-red-200'
      }`}
      style={{ animation: 'bcms-slideInUp 0.3s ease-out forwards' }}
    >
      <div className="bcms-flex bcms-items-start bcms-gap-3">
        {isSuccess ? (
          <CheckCircle className="bcms-w-5 bcms-h-5 bcms-flex-shrink-0 bcms-mt-0.5 bcms-text-green-600" />
        ) : (
          <XCircle className="bcms-w-5 bcms-h-5 bcms-flex-shrink-0 bcms-mt-0.5 bcms-text-red-600" />
        )}
        <div className="bcms-flex-1">
          <h3 className={`bcms-font-medium bcms-text-sm ${isSuccess ? 'bcms-text-green-800' : 'bcms-text-red-800'}`}>
            {title}
          </h3>
          {message && (
            <p className={`bcms-text-xs bcms-mt-1 ${isSuccess ? 'bcms-text-green-700' : 'bcms-text-red-700'}`}>
              {message}
            </p>
          )}
        </div>
        <button onClick={onClose} className={`bcms-flex-shrink-0 bcms-p-1 hover:bcms-opacity-70 bcms-transition ${isSuccess ? 'bcms-text-green-800' : 'bcms-text-red-800'}`}>
          <X className="bcms-w-4 bcms-h-4" />
        </button>
      </div>
    </div>
  );
}
