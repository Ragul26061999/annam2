'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import IPBillingView from '../../../../src/components/ip-clinical/IPBillingView';

export default function IPBillingPage() {
  const params = useParams();
  const router = useRouter();
  const bedAllocationId = params?.id as string;

  if (!bedAllocationId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Request</h2>
          <p className="text-gray-600 mb-4">No bed allocation ID provided</p>
          <Link href="/inpatient">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              Back to Inpatient
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/inpatient">
              <button className="p-2 bg-white text-gray-600 hover:text-gray-900 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
                <ArrowLeft className="h-5 w-5" />
              </button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">IP Billing</h1>
              <p className="text-sm text-gray-600">Comprehensive billing details for inpatient</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <IPBillingView 
          bedAllocationId={bedAllocationId}
          patient={null}
          bedAllocation={null}
        />
      </div>
    </div>
  );
}
