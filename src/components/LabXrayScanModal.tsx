'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Beaker, Camera, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LabXrayScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  onOrderCreated: () => void;
  onTestsSelected?: (tests: SelectedTest[]) => void;
}

interface LabTest {
  id: string;
  test_name: string;
  category: string;
  test_cost: number;
}

interface XrayTest {
  id: string;
  test_name: string;
  modality: string;
  test_cost: number;
}

interface ScanTest {
  id: string;
  scan_name: string;
  category: string;
  test_cost: number;
}

interface SelectedTest {
  id: string;
  name: string;
  type: 'lab' | 'xray' | 'scan';
  category: string;
  price: number;
}

export default function LabXrayScanModal({ 
  isOpen, 
  onClose, 
  patientId, 
  patientName, 
  onOrderCreated,
  onTestsSelected 
}: LabXrayScanModalProps) {
  const [activeTab, setActiveTab] = useState<'lab' | 'xray' | 'scan'>('lab');
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [xrayTests, setXrayTests] = useState<XrayTest[]>([]);
  const [scanTests, setScanTests] = useState<ScanTest[]>([]);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchLabTests();
      fetchXrayTests();
      fetchScanTests();
    }
  }, [isOpen]);

  const fetchLabTests = async () => {
    try {
      const { data, error } = await supabase
        .from('lab_test_catalog')
        .select('id, test_name, category, test_cost')
        .eq('is_active', true)
        .order('test_name');
      
      if (error) throw error;
      setLabTests(data || []);
    } catch (err: any) {
      console.error('Error fetching lab tests:', err);
    }
  };

  const fetchXrayTests = async () => {
    try {
      const { data, error } = await supabase
        .from('radiology_test_catalog')
        .select('id, test_name, modality, test_cost')
        .eq('is_active', true)
        .order('test_name');
      
      if (error) throw error;
      setXrayTests(data || []);
    } catch (err: any) {
      console.error('Error fetching x-ray tests:', err);
    }
  };

  const fetchScanTests = async () => {
    try {
      const { data, error } = await supabase
        .from('scan_test_catalog')
        .select('id, scan_name, category, test_cost')
        .eq('is_active', true)
        .order('scan_name');
      
      if (error) throw error;
      setScanTests(data || []);
    } catch (err: any) {
      console.error('Error fetching scan tests:', err);
    }
  };

  const handleTestToggle = (testId: string) => {
    setSelectedTests(prev => 
      prev.includes(testId) 
        ? prev.filter(id => id !== testId)
        : [...prev, testId]
    );
  };

  const handleCreateOrder = async () => {
    if (selectedTests.length === 0) {
      setError('Please select at least one test');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Collect selected test data to pass back to parent
      const selectedTestsData: SelectedTest[] = [];
      
      if (activeTab === 'lab') {
        for (const testId of selectedTests) {
          const test = labTests.find(t => t.id === testId);
          if (test) {
            selectedTestsData.push({
              id: test.id,
              name: test.test_name,
              type: 'lab',
              category: test.category,
              price: test.test_cost
            });
          }
        }
      } else if (activeTab === 'xray') {
        for (const testId of selectedTests) {
          const test = xrayTests.find(t => t.id === testId);
          if (test) {
            selectedTestsData.push({
              id: test.id,
              name: test.test_name,
              type: 'xray',
              category: test.modality,
              price: test.test_cost
            });
          }
        }
      } else if (activeTab === 'scan') {
        for (const testId of selectedTests) {
          const test = scanTests.find(t => t.id === testId);
          if (test) {
            selectedTestsData.push({
              id: test.id,
              name: test.scan_name,
              type: 'scan',
              category: test.category,
              price: test.test_cost
            });
          }
        }
      }

      // Get patient UUID
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('id')
        .eq('patient_id', patientId)
        .single();

      if (patientError) throw patientError;

      const patientUuid = patientData.id;

      if (activeTab === 'lab') {
        // Create lab order
        for (const testId of selectedTests) {
          const test = labTests.find(t => t.id === testId);
          if (test) {
            await supabase
              .from('lab_test_orders')
              .insert({
                patient_id: patientUuid,
                test_catalog_id: test.id,
                clinical_indication: 'Ordered from prescription form',
                status: 'pending',
                ordered_date: new Date().toISOString()
              });
          }
        }
      } else if (activeTab === 'xray') {
        // Create x-ray order
        for (const testId of selectedTests) {
          const test = xrayTests.find(t => t.id === testId);
          if (test) {
            await supabase
              .from('radiology_test_orders')
              .insert({
                patient_id: patientUuid,
                test_catalog_id: test.id,
                clinical_indication: 'Ordered from prescription form',
                status: 'pending',
                ordered_date: new Date().toISOString()
              });
          }
        }
      } else if (activeTab === 'scan') {
        // Create scan order
        for (const testId of selectedTests) {
          const test = scanTests.find(t => t.id === testId);
          if (test) {
            await supabase
              .from('scan_test_orders')
              .insert({
                patient_id: patientUuid,
                test_catalog_id: test.id,
                clinical_indication: 'Ordered from prescription form',
                status: 'pending',
                ordered_date: new Date().toISOString()
              });
          }
        }
      }

      // Pass selected tests back to parent component
      if (onTestsSelected && selectedTestsData.length > 0) {
        onTestsSelected(selectedTestsData);
      }

      onOrderCreated();
      onClose();
      setSelectedTests([]);
    } catch (err: any) {
      console.error('Error creating order:', err);
      setError(err.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredTests = () => {
    let tests: any[] = [];
    
    if (activeTab === 'lab') {
      tests = labTests.map(test => ({
        id: test.id,
        name: test.test_name,
        category: test.category,
        price: test.test_cost
      }));
    } else if (activeTab === 'xray') {
      tests = xrayTests.map(test => ({
        id: test.id,
        name: test.test_name,
        category: test.modality,
        price: test.test_cost
      }));
    } else if (activeTab === 'scan') {
      tests = scanTests.map(test => ({
        id: test.id,
        name: test.scan_name,
        category: test.category,
        price: test.test_cost
      }));
    }

    if (searchTerm) {
      return tests.filter(test => 
        test.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        test.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return tests;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Order Lab/X-ray/Scan</h2>
              <p className="text-gray-600 mt-1">Patient: {patientName} • ID: {patientId}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('lab')}
            className={`flex-1 py-3 px-4 font-medium transition-colors ${
              activeTab === 'lab'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Beaker className="h-4 w-4 inline mr-2" />
            Lab Tests
          </button>
          <button
            onClick={() => setActiveTab('xray')}
            className={`flex-1 py-3 px-4 font-medium transition-colors ${
              activeTab === 'xray'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Camera className="h-4 w-4 inline mr-2" />
            X-ray
          </button>
          <button
            onClick={() => setActiveTab('scan')}
            className={`flex-1 py-3 px-4 font-medium transition-colors ${
              activeTab === 'scan'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Activity className="h-4 w-4 inline mr-2" />
            Scans
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Search */}
          <div className="mb-6">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search ${activeTab === 'lab' ? 'lab tests' : activeTab === 'xray' ? 'x-ray tests' : 'scan tests'}...`}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Tests List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {getFilteredTests().map((test) => (
              <div
                key={test.id}
                className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  id={test.id}
                  checked={selectedTests.includes(test.id)}
                  onChange={() => handleTestToggle(test.id)}
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="flex-1">
                  <label htmlFor={test.id} className="font-medium text-gray-900 cursor-pointer">
                    {test.name}
                  </label>
                  <p className="text-sm text-gray-600">{test.category}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">₹{test.price || 0}</p>
                </div>
              </div>
            ))}
          </div>

          {getFilteredTests().length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No tests found</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedTests.length} test{selectedTests.length !== 1 ? 's' : ''} selected
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOrder}
                disabled={selectedTests.length === 0 || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Create Order
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
