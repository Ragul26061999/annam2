'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Package, Upload, Edit3, Settings as SettingsIcon, Users } from 'lucide-react';

const SettingsPage = () => {
  const router = useRouter();

  const settingsCards = [
    {
      id: 'pharmacy',
      title: 'Pharmacy Management',
      description: 'Manage medications, batches, and inventory',
      icon: Package,
      color: 'from-pink-500 to-rose-500',
      href: '/settings/pharmacy'
    },
    {
      id: 'patient-management',
      title: 'Patient Management',
      description: 'Manage patient records and data imports',
      icon: Users,
      color: 'from-blue-500 to-indigo-500',
      href: '/settings/patient-management'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
              <SettingsIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600">Manage system configurations and preferences</p>
            </div>
          </div>
        </div>

        {/* Settings Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {settingsCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                onClick={() => router.push(card.href)}
                className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-transparent"
              >
                {/* Gradient Background on Hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                
                {/* Content */}
                <div className="relative p-6">
                  <div className={`inline-flex p-4 bg-gradient-to-br ${card.color} rounded-xl shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-pink-500 group-hover:to-rose-500 transition-all duration-300">
                    {card.title}
                  </h3>
                  
                  <p className="text-gray-600 text-sm">
                    {card.description}
                  </p>
                </div>

                {/* Arrow Indicator */}
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-rose-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

export default SettingsPage;
