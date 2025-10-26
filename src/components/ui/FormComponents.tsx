import React from 'react';
import { AlertCircle } from 'lucide-react';

interface FormInputProps {
  label: string;
  type?: string;
  step?: string;
  value: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  error?: boolean;
  errorMessage?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export const FormInput: React.FC<FormInputProps> = ({
  label,
  type = 'text',
  step,
  value,
  onChange,
  placeholder,
  error,
  errorMessage,
  required,
  disabled,
  className = '',
}) => (
  <div className={className}>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      step={step}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
        error ? 'border-red-500 bg-red-50' : 'border-gray-300'
      } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
    />
    {error && errorMessage && (
      <div className="flex items-center gap-2 mt-1">
        <AlertCircle className="w-4 h-4 text-red-500" />
        <p className="text-red-600 text-sm">{errorMessage}</p>
      </div>
    )}
  </div>
);

interface FormSelectProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: string[] | { value: string; label: string }[];
  error?: boolean;
  errorMessage?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const FormSelect: React.FC<FormSelectProps> = ({
  label,
  value,
  onChange,
  options,
  error,
  errorMessage,
  required,
  disabled,
  placeholder,
  className = '',
}) => (
  <div className={className}>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
        error ? 'border-red-500 bg-red-50' : 'border-gray-300'
      } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((option, index) => {
        if (typeof option === 'string') {
          return (
            <option key={index} value={option}>
              {option}
            </option>
          );
        } else {
          return (
            <option key={index} value={option.value}>
              {option.label}
            </option>
          );
        }
      })}
    </select>
    {error && errorMessage && (
      <div className="flex items-center gap-2 mt-1">
        <AlertCircle className="w-4 h-4 text-red-500" />
        <p className="text-red-600 text-sm">{errorMessage}</p>
      </div>
    )}
  </div>
);

interface FormTextareaProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  error?: boolean;
  errorMessage?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export const FormTextarea: React.FC<FormTextareaProps> = ({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  error,
  errorMessage,
  required,
  disabled,
  className = '',
}) => (
  <div className={className}>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none ${
        error ? 'border-red-500 bg-red-50' : 'border-gray-300'
      } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
    />
    {error && errorMessage && (
      <div className="flex items-center gap-2 mt-1">
        <AlertCircle className="w-4 h-4 text-red-500" />
        <p className="text-red-600 text-sm">{errorMessage}</p>
      </div>
    )}
  </div>
);

interface FormCheckboxProps {
  label: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  className?: string;
  description?: string;
}

export const FormCheckbox: React.FC<FormCheckboxProps> = ({
  label,
  checked,
  onChange,
  disabled,
  className = '',
  description,
}) => (
  <div className={`flex items-start gap-3 p-3 bg-blue-50 rounded-lg ${className}`}>
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className="w-4 h-4 text-blue-600 rounded mt-0.5"
    />
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
    </div>
  </div>
);

interface FormSectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  icon,
  children,
  className = '',
}) => (
  <div className={className}>
    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
      {icon}
      {title}
    </h3>
    {children}
  </div>
);

interface BarcodeDisplayProps {
  barcode: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const BarcodeDisplay: React.FC<BarcodeDisplayProps> = ({
  barcode,
  label,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'text-xs p-2',
    md: 'text-sm p-3',
    lg: 'text-base p-4',
  };

  return (
    <div className={`bg-white border-2 border-gray-300 rounded-lg ${sizeClasses[size]} text-center`}>
      {label && <p className="text-gray-600 text-xs mb-2">{label}</p>}
      <div className="font-mono text-black tracking-wider">
        {/* Barcode lines representation */}
        <div className="flex justify-center mb-2">
          {barcode.split('').map((digit, index) => (
            <div
              key={index}
              className={`h-8 ${
                parseInt(digit) % 2 === 0 ? 'bg-black w-0.5' : 'bg-black w-1'
              } mx-px`}
            />
          ))}
        </div>
        <div className="text-xs">{barcode}</div>
      </div>
    </div>
  );
};
