'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Upload, ArrowLeft } from 'lucide-react';

const PatientManagementPage = () => {
  const router = useRouter();

  const options = [
    {
      id: 'upload-patients',
      title: 'Upload Patient Data',
      description: 'Import patient records from Excel file',
      icon: Upload,
      color: 'from-blue-500 to-cyan-500',
      href: '/settings/patient-management/upload'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
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
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <Upload className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Patient Management</h1>
              <p className="text-gray-600">Manage patient records and data imports</p>
            </div>
          </div>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {options.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                onClick={() => router.push(option.href)}
                className="group relative bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-left overflow-hidden"
              >
                <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${option.color} opacity-10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`} />
                
                <div className="relative z-10">
                  <div className={`w-12 h-12 bg-gradient-to-br ${option.color} rounded-xl flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {option.title}
                  </h3>
                  
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {option.description}
                  </p>
                </div>

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

export default PatientManagementPage;
