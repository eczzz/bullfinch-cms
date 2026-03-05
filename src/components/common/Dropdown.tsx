import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

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
    <div className={`bcms-relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="bcms-w-full bcms-px-4 bcms-py-2 bcms-text-sm bcms-text-left bcms-bg-white bcms-rounded bcms-border bcms-border-gray-300 focus:bcms-border-blue-500 bcms-outline-none bcms-transition bcms-flex bcms-items-center bcms-justify-between"
      >
        <span>{selectedOption?.label}</span>
        <ChevronDown className={`bcms-w-4 bcms-h-4 bcms-transition-transform ${isOpen ? 'bcms-rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="bcms-absolute bcms-top-full bcms-left-0 bcms-right-0 bcms-mt-1 bcms-bg-white bcms-border bcms-border-gray-300 bcms-rounded bcms-shadow-lg bcms-z-10">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => { onChange(option.value); setIsOpen(false); }}
              className={`bcms-w-full bcms-px-4 bcms-py-2 bcms-text-sm bcms-text-left bcms-transition ${
                value === option.value
                  ? 'bcms-bg-blue-600 bcms-text-white'
                  : 'hover:bcms-bg-gray-100 bcms-text-gray-900'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
