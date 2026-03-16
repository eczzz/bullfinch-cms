import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

interface ToastProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  onClose: () => void;
  duration?: number;
}

const variantConfig = {
  success: {
    icon: CheckCircle,
    barColor: 'bg-emerald-500',
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-50',
  },
  error: {
    icon: XCircle,
    barColor: 'bg-red-500',
    iconColor: 'text-red-600',
    iconBg: 'bg-red-50',
  },
  warning: {
    icon: AlertTriangle,
    barColor: 'bg-amber-500',
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-50',
  },
  info: {
    icon: Info,
    barColor: 'bg-blue-500',
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-50',
  },
};

export function Toast({ type, title, message, onClose, duration = 4000 }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, duration - 300);

    const closeTimer = setTimeout(onClose, duration);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(closeTimer);
    };
  }, [onClose, duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 200);
  };

  const config = variantConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={`fixed top-6 right-6 max-w-sm w-full z-50 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden flex transition-all duration-200 ${
        isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
      }`}
      style={{ animation: isExiting ? undefined : 'toast-in 0.3s ease-out' }}
    >
      {/* Left color bar */}
      <div className={`w-1 flex-shrink-0 ${config.barColor}`} />

      <div className="flex items-start gap-3 p-3 flex-1 min-w-0">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${config.iconBg}`}>
          <Icon className={`w-4 h-4 ${config.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-sm font-medium text-gray-900">{title}</p>
          {message && (
            <p className="text-xs text-gray-500 mt-0.5">{message}</p>
          )}
        </div>
        <button
          onClick={handleClose}
          className="flex-shrink-0 p-0.5 rounded hover:bg-gray-100 transition-all duration-150"
        >
          <X className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>
    </div>
  );
}
