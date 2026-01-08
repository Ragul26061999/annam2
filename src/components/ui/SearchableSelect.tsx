import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

interface Option {
  value: string;
  label: string;
  subLabel?: string;
  group?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  className = '',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState<Option[]>(options);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get selected option details
  const selectedOption = options.find(opt => opt.value === value);

  // Update filtered options when search term or options change
  useEffect(() => {
    if (!searchTerm) {
      setFilteredOptions(options);
    } else {
      const lowerSearch = searchTerm.toLowerCase();
      setFilteredOptions(
        options.filter(opt => 
          opt.label.toLowerCase().includes(lowerSearch) || 
          opt.subLabel?.toLowerCase().includes(lowerSearch) ||
          opt.group?.toLowerCase().includes(lowerSearch)
        )
      );
    }
  }, [searchTerm, options]);

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle option selection
  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  // Clear selection
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  // Toggle dropdown
  const toggleOpen = () => {
    if (disabled) return;
    if (!isOpen) {
      setIsOpen(true);
      // Focus input on open
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      {/* Trigger Button */}
      <div
        onClick={toggleOpen}
        className={`
          flex items-center justify-between w-full px-4 py-3 bg-white border rounded-xl text-sm font-semibold transition-all cursor-pointer
          ${isOpen ? 'border-teal-500 ring-2 ring-teal-100' : 'border-slate-200'}
          ${disabled ? 'bg-slate-50 cursor-not-allowed opacity-75' : 'hover:border-teal-300'}
        `}
      >
        <div className="flex-1 truncate">
          {selectedOption ? (
            <span className="text-slate-900">{selectedOption.label}</span>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {selectedOption && !disabled && (
            <div 
              onClick={handleClear}
              className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-red-500 transition-colors"
            >
              <X size={14} />
            </div>
          )}
          <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search Input */}
          <div className="p-3 border-b border-slate-100 bg-slate-50">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Type to search..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
            {filteredOptions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No results found for "{searchTerm}"
              </div>
            ) : (
              <div className="py-1">
                {filteredOptions.map((option) => (
                  <div
                    key={option.value}
                    onClick={() => handleSelect(option.value)}
                    className={`
                      px-4 py-3 cursor-pointer transition-colors flex items-center justify-between
                      ${value === option.value ? 'bg-teal-50 text-teal-900' : 'hover:bg-slate-50 text-slate-700'}
                    `}
                  >
                    <div>
                      <div className="font-medium">{option.label}</div>
                      {(option.subLabel || option.group) && (
                        <div className="text-xs text-slate-500 mt-0.5 flex gap-2">
                          {option.group && <span className="bg-slate-100 px-1.5 py-0.5 rounded">{option.group}</span>}
                          {option.subLabel}
                        </div>
                      )}
                    </div>
                    {value === option.value && <Check size={16} className="text-teal-600" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
