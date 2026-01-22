'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Edit3, Package, ArrowLeft } from 'lucide-react';

const PharmacySettingsPage = () => {
  const router = useRouter();

  const pharmacyOptions = [
    {
      id: 'upload-medications',
      title: 'Upload Medications',
      description: 'Import medications from CSV file with real-time stats and preview',
      icon: Upload,
      color: 'from-blue-500 to-cyan-500',
      href: '/settings/pharmacy/upload-medications'
    },
    {
      id: 'upload-batches',
      title: 'Upload Batches',
      description: 'Import medication batches from Drug Stock CSV',
      icon: Package,
      color: 'from-green-500 to-emerald-500',
      href: '/settings/pharmacy/upload-batches'
    },
    {
      id: 'edit-medication',
      title: 'Edit Medications',
      description: 'View and manage all medications and their batches',
      icon: Edit3,
      color: 'from-purple-500 to-pink-500',
      href: '/settings/pharmacy/edit-medication'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with Back Button */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/settings')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Settings</span>
          </button>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl shadow-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Pharmacy Management</h1>
              <p className="text-gray-600">Manage medications, batches, and inventory settings</p>
            </div>
          </div>
        </div>

        {/* Options Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pharmacyOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                onClick={() => router.push(option.href)}
                className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-transparent p-8"
              >
                {/* Gradient Background on Hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${option.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                
                {/* Content */}
                <div className="relative">
                  <div className={`inline-flex p-5 bg-gradient-to-br ${option.color} rounded-2xl shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-10 h-10 text-white" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-pink-500 group-hover:to-rose-500 transition-all duration-300">
                    {option.title}
                  </h3>
                  
                  <p className="text-gray-600">
                    {option.description}
                  </p>
                </div>

                {/* Arrow Indicator */}
                <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className={`w-10 h-10 bg-gradient-to-br ${option.color} rounded-full flex items-center justify-center shadow-lg`}>
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PharmacySettingsPage;
