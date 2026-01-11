'use client';

import React from 'react';
import { 
  BarChart3, 
  Stethoscope, 
  Pill, 
  TestTube, 
  Scan, 
  FileText,
  TrendingUp,
  Receipt
} from 'lucide-react';

interface FinanceNavigationProps {
  activePage?: string;
}

export default function FinanceNavigation({ activePage = 'dashboard' }: FinanceNavigationProps) {
  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Finance Dashboard',
      href: '/finance',
      icon: BarChart3,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      id: 'billing',
      label: 'Billing & Consultations',
      href: '/finance/billing',
      icon: Stethoscope,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      id: 'pharmacy',
      label: 'Pharmacy Transactions',
      href: '/finance/pharmacy',
      icon: Pill,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      id: 'lab',
      label: 'Lab Test Transactions',
      href: '/finance/lab',
      icon: TestTube,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      id: 'radiology',
      label: 'Radiology & Scans',
      href: '/finance/radiology',
      icon: Scan,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      id: 'reports',
      label: 'Financial Reports',
      href: '/finance/reports',
      icon: FileText,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100'
    },
    {
      id: 'other-bills',
      label: 'Other Bills',
      href: '/other-bills',
      icon: Receipt,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100'
    }
  ];

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <TrendingUp className="mr-2" size={20} />
        Finance Navigation
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {navigationItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activePage === item.id;
          
          return (
            <a
              key={item.id}
              href={item.href}
              className={`flex items-center p-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? `${item.bgColor} ${item.color} shadow-sm border-2 border-gray-200`
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700 hover:text-gray-900 border border-gray-200'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isActive ? item.bgColor : 'bg-white'
              }`}>
                <IconComponent size={16} className={isActive ? item.color : 'text-gray-600'} />
              </div>
              <div className="ml-3">
                <p className={`text-sm font-medium ${isActive ? item.color : 'text-gray-700'}`}>
                  {item.label}
                </p>
              </div>
            </a>
          );
        })}
      </div>
      
      <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-200">
        <p className="text-xs text-blue-700">
          <strong>Quick Tip:</strong> Click on any module card in the dashboard to view detailed transactions for that specific department.
        </p>
      </div>
    </div>
  );
}
