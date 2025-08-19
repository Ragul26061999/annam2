'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface ModernCalendarProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  minDate?: string;
  maxDate?: string;
  disabledDates?: string[];
  className?: string;
}

const ModernCalendar: React.FC<ModernCalendarProps> = ({
  selectedDate,
  onDateSelect,
  minDate,
  maxDate,
  disabledDates = [],
  className = ''
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'current' | 'next'>('current');

  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  useEffect(() => {
    if (viewMode === 'current') {
      setCurrentMonth(today);
    } else {
      setCurrentMonth(nextMonth);
    }
  }, [viewMode]);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const isDateDisabled = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if date is in the past
    if (date < today) return true;
    
    // Check if date is before minDate
    if (minDate && dateStr < minDate) return true;
    
    // Check if date is after maxDate
    if (maxDate && dateStr > maxDate) return true;
    
    // Check if date is in disabled dates
    if (disabledDates.includes(dateStr)) return true;
    
    return false;
  };

  const renderCalendar = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = getDaysInMonth(date);
    const firstDay = getFirstDayOfMonth(date);
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="h-12 w-12"></div>
      );
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDate(year, month, day);
      const isSelected = selectedDate === dateStr;
      const isDisabled = isDateDisabled(dateStr);
      const isToday = dateStr === formatDate(today.getFullYear(), today.getMonth(), today.getDate());
      
      days.push(
        <button
          key={day}
          onClick={() => !isDisabled && onDateSelect(dateStr)}
          disabled={isDisabled}
          className={`
            h-12 w-12 rounded-xl font-semibold text-sm transition-all duration-200
            ${
              isSelected
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg ring-4 ring-blue-200'
                : isDisabled
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : isToday
                ? 'bg-orange-100 text-orange-600 border-2 border-orange-300 hover:bg-orange-200'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 shadow-sm hover:shadow-md'
            }
          `}
        >
          {day}
        </button>
      );
    }
    
    return days;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className={`bg-white rounded-2xl shadow-lg border border-gray-200 p-6 ${className}`}>
      {/* Month Toggle */}
      <div className="flex items-center justify-center mb-6">
        <div className="bg-gray-100 rounded-xl p-1 flex">
          <button
            onClick={() => setViewMode('current')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
              viewMode === 'current'
                ? 'bg-white text-blue-600 shadow-md'
                : 'text-gray-600 hover:text-blue-600'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setViewMode('next')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
              viewMode === 'next'
                ? 'bg-white text-blue-600 shadow-md'
                : 'text-gray-600 hover:text-blue-600'
            }`}
          >
            Next Month
          </button>
        </div>
      </div>

      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
            <p className="text-sm text-gray-600">
              {viewMode === 'current' ? 'Current Month' : 'Next Month'}
            </p>
          </div>
        </div>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {dayNames.map((day) => (
          <div key={day} className="h-8 flex items-center justify-center">
            <span className="text-sm font-semibold text-gray-600">{day}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {renderCalendar(currentMonth)}
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-orange-100 border-2 border-orange-300 rounded"></div>
          <span className="text-gray-600">Today</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded"></div>
          <span className="text-gray-600">Selected</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-gray-100 rounded"></div>
          <span className="text-gray-600">Unavailable</span>
        </div>
      </div>
    </div>
  );
};

export default ModernCalendar;