'use client';
import React, { useState } from 'react';
import { Search, ChevronDown, Pill } from 'lucide-react';
import { useRouter } from 'next/navigation';

const TopBar: React.FC = () => {
  const router = useRouter();
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
      {/* Search Bar */}
      <div className="flex-1 max-w-lg">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className={`h-4 w-4 transition-colors duration-200 ${
              searchFocused ? 'text-orange-500' : 'text-gray-400'
            }`} />
          </div>
          <input 
            type="text" 
            placeholder="Search patients, doctors, appointments..." 
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:bg-white transition-all duration-200"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center space-x-3 ml-6">
        {/* Quick Actions */}
        <div className="flex items-center space-x-1">
          {/* Pharmacy */}
          <button 
            onClick={() => router.push('/settings/pharmacy/edit-medication')}
            className="p-2 text-pink-600 hover:text-pink-700 hover:bg-pink-50 rounded-xl transition-all duration-200"
            title="Pharmacy Management"
          >
            <Pill size={18} />
          </button>
        </div>
        
        {/* Divider */}
        <div className="h-6 w-px bg-gray-200"></div>
        
        {/* User Profile */}
        <div className="flex items-center space-x-2 p-1.5 hover:bg-gray-50 rounded-xl transition-all duration-200 cursor-pointer group">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xs shadow-sm">
              DR
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-gray-900">Dr. Selvan</p>
              <p className="text-xs text-gray-500">Chief Doctor (MD)</p>
            </div>
          </div>
          <ChevronDown size={14} className="text-gray-400 group-hover:text-gray-600 transition-colors duration-200" />
        </div>
      </div>
    </header>
  );
};

export default TopBar; 