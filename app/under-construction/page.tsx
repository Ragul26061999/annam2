'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Construction, Calendar, TrendingUp } from 'lucide-react';

export default function UnderConstructionPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-blue-700 hover:text-blue-800 font-medium transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
        </div>

        {/* Main Content */}
        <div className="text-center py-16 px-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full mb-8 shadow-lg">
            <Construction className="w-12 h-12 text-orange-500" />
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-4">Under Construction</h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            We're currently working on this feature to bring you the best healthcare management experience.
          </p>

          {/* Feature Highlights */}
          <div className="grid md:grid-cols-3 gap-8 mb-12 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Advanced Analytics</h3>
              <p className="text-gray-600 text-sm">
                Comprehensive financial reporting and analytics for better decision making.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Patient Management</h3>
              <p className="text-gray-600 text-sm">
                Enhanced inpatient care coordination and billing management systems.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <Construction className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Coming Soon</h3>
              <p className="text-gray-600 text-sm">
                More features and improvements are on the way to serve you better.
              </p>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-2xl mx-auto mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Development Progress</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">System Architecture</span>
                  <span className="font-medium text-green-600">Complete</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{width: '100%'}}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Core Features</span>
                  <span className="font-medium text-green-600">Complete</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{width: '100%'}}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Advanced Features</span>
                  <span className="font-medium text-orange-600">In Progress</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-orange-500 h-2 rounded-full" style={{width: '65%'}}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Testing & Optimization</span>
                  <span className="font-medium text-blue-600">Coming Soon</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{width: '25%'}}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-6 rounded-2xl border border-orange-200 max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-orange-900 mb-3">Need Assistance?</h3>
            <p className="text-orange-800 mb-4">
              If you need help with existing features or have questions about this development,
              our support team is here to help.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/dashboard"
                className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
              >
                Return to Dashboard
              </Link>
              <button
                onClick={() => window.location.href = 'mailto:support@annam.com'}
                className="px-6 py-3 bg-white hover:bg-orange-50 text-orange-700 border border-orange-300 rounded-lg font-medium transition-colors"
              >
                Contact Support
              </button>
            </div>
          </div>

          {/* Expected Launch */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Expected launch: <span className="font-semibold text-gray-700">Coming Soon</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
