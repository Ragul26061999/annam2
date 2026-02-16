'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Edit3, Package, ArrowLeft, CheckSquare, Trash2, Loader2, FileSpreadsheet, Users } from 'lucide-react';

const PharmacySettingsPage = () => {
  const router = useRouter();
  const [deletingAll, setDeletingAll] = useState(false);

  const pharmacyOptions = [
    {
      id: 'suppliers',
      title: 'Manage Suppliers',
      description: 'Add, edit and manage pharmacy suppliers',
      icon: Users,
      color: 'from-teal-500 to-cyan-500',
      href: '/settings/pharmacy/suppliers'
    },
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
    },
    {
      id: 'bulk-upload-excel',
      title: 'Bulk Upload (Excel)',
      description: 'Upload Drug Stock Excel file to import medications and batches in one go',
      icon: FileSpreadsheet,
      color: 'from-indigo-500 to-violet-500',
      href: '/settings/pharmacy/bulk-upload-excel'
    },
    {
      id: 'batch-validation',
      title: 'Batch Validation',
      description: 'Validate batch number, count and legacy code',
      icon: CheckSquare,
      color: 'from-amber-500 to-orange-500',
      href: '/batch-validation'
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

        <div className="mt-10 bg-white rounded-2xl shadow-lg border border-red-100 overflow-hidden">
          <div className="p-6 border-b border-red-100">
            <h2 className="text-xl font-bold text-gray-900">Danger Zone</h2>
            <p className="text-gray-600 mt-1">These actions are destructive and cannot be undone.</p>
          </div>

          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="font-semibold text-gray-900">Delete all medications & batches</div>
                <div className="text-sm text-gray-600 mt-1">
                  Permanently deletes all records from <span className="font-mono">medications</span> and <span className="font-mono">medicine_batches</span>.
                </div>
              </div>

              <button
                disabled={deletingAll}
                onClick={async () => {
                  const confirmed = window.prompt("Type DELETE to remove all medications and batches") === 'DELETE';
                  if (!confirmed) return;

                  try {
                    setDeletingAll(true);
                    const res = await fetch('/api/pharmacy/delete-all-medications', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ hard: true })
                    });

                    const json = await res.json().catch(() => ({}));

                    if (!res.ok) {
                      alert(json?.error || 'Failed to delete all medications and batches');
                      return;
                    }

                    alert(`Deleted ${json?.deletedBatches ?? 0} batches and ${json?.deletedMedications ?? 0} medications.`);
                  } catch (e) {
                    console.error(e);
                    alert('Failed to delete all medications and batches');
                  } finally {
                    setDeletingAll(false);
                  }
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {deletingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>{deletingAll ? 'Deleting…' : 'Delete all'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PharmacySettingsPage;
