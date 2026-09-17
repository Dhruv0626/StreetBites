import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  name?: string;
  value: string;
  onChange: (value: string) => void;
  options: (SelectOption | string)[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  name,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  disabled = false,
  className = '',
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Normalize options to { value, label } format
  const normalizedOptions: SelectOption[] = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Scroll to active option when opening
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const activeElement = dropdownRef.current.querySelector('[data-selected="true"]');
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`} id={id}>
      {/* Hidden input for form tracking */}
      {name && <input type="hidden" name={name} value={value} />}

      {/* Select Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full bg-white border rounded-xl px-4 py-3 text-sm text-left flex items-center justify-between font-sans transition-all duration-200 cursor-pointer select-none ${
          disabled
            ? 'opacity-60 bg-stone-50 cursor-not-allowed border-stone-200 text-stone-400'
            : isOpen
            ? 'border-[#D94A38] ring-2 ring-[#D94A38]/15 text-stone-800 shadow-sm'
            : 'border-[#E7E2D9] hover:border-[#D94A38]/60 text-stone-800'
        }`}
      >
        <span className={`truncate font-medium ${!selectedOption ? 'text-stone-400' : 'text-stone-800'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-stone-500 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#D94A38]' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 left-0 right-0 mt-1.5 max-h-64 bg-white border border-[#E7E2D9] rounded-xl shadow-xl overflow-y-auto py-1 animate-in fade-in zoom-in-95 duration-150 custom-dropdown-scrollbar"
        >
          {normalizedOptions.length === 0 ? (
            <div className="px-4 py-3 text-xs text-stone-400 font-medium text-center">
              No options available
            </div>
          ) : (
            normalizedOptions.map((option) => {
              const isSelected = option.value === value;
              return (
                <div
                  key={option.value}
                  data-selected={isSelected}
                  onClick={() => handleSelect(option.value)}
                  className={`px-4 py-2.5 text-sm flex items-center justify-between cursor-pointer font-sans transition-colors duration-150 ${
                    isSelected
                      ? 'bg-[#D94A38] text-white font-semibold'
                      : 'text-stone-700 hover:bg-[#D94A38]/10 hover:text-[#D94A38]'
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && <Check className="w-4 h-4 text-white shrink-0 ml-2 stroke-[2.5]" />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
