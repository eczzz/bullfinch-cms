import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function Dropdown({ options, value, onChange, className = '' }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 text-sm text-left bg-white rounded-lg border text-gray-900 transition-all duration-150 flex items-center justify-between shadow-sm ${
          isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/20'
            : 'border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-0'
        }`}
      >
        <span className={selectedOption ? 'text-gray-900' : 'text-gray-400'}>
          {selectedOption?.label || 'Select...'}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-1 overflow-hidden"
          style={{ animation: 'fade-in-up 0.15s ease-out' }}
        >
          {options.map((option) => {
            const isActive = value === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-sm text-left rounded-md transition-all duration-150 flex items-center justify-between ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>{option.label}</span>
                {isActive && <Check className="w-4 h-4 text-blue-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
