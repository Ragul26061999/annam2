'use client';

import React, { useState } from 'react';
import { Edit2, Save, X, Plus, Trash2 } from 'lucide-react';

interface LabTest {
  test_name: string;
  test_cost: number;
  status: 'paid' | 'pending' | 'partial';
}

interface LabOrder {
  order_number: string;
  bill_number: string;
  order_date: string;
  tests: LabTest[];
}

interface IPBillingLabEditorProps {
  labOrders: LabOrder[];
  onSave: (updatedLabOrders: LabOrder[]) => Promise<void>;
  isEditable?: boolean;
}

export default function IPBillingLabEditor({
  labOrders: initialLabOrders,
  onSave,
  isEditable = true
}: IPBillingLabEditorProps) {
  const [labOrders, setLabOrders] = useState<LabOrder[]>(initialLabOrders);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingOrderIndex, setEditingOrderIndex] = useState<number | null>(null);
  const [editingTestIndex, setEditingTestIndex] = useState<number | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const handleEditTest = (orderIndex: number, testIndex: number) => {
    setEditingOrderIndex(orderIndex);
    setEditingTestIndex(testIndex);
    setIsEditing(true);
  };

  const handleUpdateTest = (orderIndex: number, testIndex: number, field: keyof LabTest, value: any) => {
    const updatedOrders = [...labOrders];
    const test = { ...updatedOrders[orderIndex].tests[testIndex] };
    
    if (field === 'test_cost') {
      test[field] = parseFloat(value) || 0;
    } else {
      test[field] = value;
    }
    
    updatedOrders[orderIndex].tests[testIndex] = test;
    setLabOrders(updatedOrders);
  };

  const handleDeleteTest = (orderIndex: number, testIndex: number) => {
    if (confirm('Are you sure you want to delete this test?')) {
      const updatedOrders = [...labOrders];
      updatedOrders[orderIndex].tests.splice(testIndex, 1);
      
      // Remove order if no tests left
      if (updatedOrders[orderIndex].tests.length === 0) {
        updatedOrders.splice(orderIndex, 1);
      }
      
      setLabOrders(updatedOrders);
    }
  };

  const handleAddTest = (orderIndex: number) => {
    const updatedOrders = [...labOrders];
    const newTest: LabTest = {
      test_name: '',
      test_cost: 0,
      status: 'pending'
    };
    
    updatedOrders[orderIndex].tests.push(newTest);
    setLabOrders(updatedOrders);
    setEditingOrderIndex(orderIndex);
    setEditingTestIndex(updatedOrders[orderIndex].tests.length - 1);
    setIsEditing(true);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await onSave(labOrders);
      setIsEditing(false);
      setEditingOrderIndex(null);
      setEditingTestIndex(null);
      alert('Lab tests saved successfully!');
    } catch (error) {
      console.error('Error saving lab tests:', error);
      alert('Failed to save lab tests. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setLabOrders(initialLabOrders);
    setIsEditing(false);
    setEditingOrderIndex(null);
    setEditingTestIndex(null);
  };

  const calculateOrderTotal = (order: LabOrder) => {
    return order.tests.reduce((sum, test) => sum + test.test_cost, 0);
  };

  const calculateLabTotal = () => {
    return labOrders.reduce((sum, order) => sum + calculateOrderTotal(order), 0);
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Laboratory Tests</h2>
          <p className="text-sm text-gray-500 mt-1">
            {labOrders.length} order{labOrders.length !== 1 ? 's' : ''} • {labOrders.reduce((sum, order) => sum + order.tests.length, 0)} test{labOrders.reduce((sum, order) => sum + order.tests.length, 0) !== 1 ? 's' : ''}
          </p>
        </div>
        {isEditable && (
          <div className="flex gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit2 className="h-4 w-4" />
                Edit Tests
              </button>
            ) : (
              <>
                <button
                  onClick={handleSaveAll}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save All'}
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {labOrders.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No laboratory tests found for this IP stay</p>
        </div>
      ) : (
        <div className="space-y-3">
          {labOrders.map((order, orderIdx) => (
            <div key={orderIdx} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
              <div className="flex justify-between items-center p-4 bg-white">
                <div className="flex items-center gap-6 flex-1">
                  {/* Bill Number */}
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-teal-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-teal-700">#</span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Bill</p>
                      <p className="font-semibold text-gray-900">{order.bill_number}</p>
                    </div>
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Date</p>
                      <p className="font-medium text-gray-900">
                        {new Date(order.order_date).toLocaleDateString('en-IN', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric' 
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Tests */}
                  <div className="flex-1 max-w-md">
                    <p className="text-xs text-gray-500 uppercase mb-1">Tests</p>
                    <div className="flex flex-wrap gap-2">
                      {order.tests.map((test, testIdx) => (
                        <div key={testIdx} className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded text-sm">
                          {isEditing && editingOrderIndex === orderIdx && editingTestIndex === testIdx ? (
                            <input
                              type="text"
                              value={test.test_name}
                              onChange={(e) => handleUpdateTest(orderIdx, testIdx, 'test_name', e.target.value)}
                              className="w-24 px-1 py-0.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-teal-500 focus:border-transparent"
                              placeholder="Test name"
                            />
                          ) : (
                            <span className="font-medium text-gray-700 text-xs">{test.test_name || 'Unnamed Test'}</span>
                          )}
                          {isEditing && editingOrderIndex === orderIdx && editingTestIndex === testIdx ? (
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={test.test_cost}
                              onChange={(e) => handleUpdateTest(orderIdx, testIdx, 'test_cost', e.target.value)}
                              className="w-16 px-1 py-0.5 border border-gray-300 rounded text-xs text-right focus:ring-1 focus:ring-teal-500 focus:border-transparent"
                              placeholder="0.00"
                            />
                          ) : (
                            <span className="text-blue-600 font-semibold text-xs">{formatCurrency(test.test_cost)}</span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            test.status === 'paid' ? 'bg-green-100 text-green-800' :
                            test.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {test.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Test Count */}
                  <div className="text-center">
                    <p className="text-xs text-gray-500 uppercase">Count</p>
                    <div className="bg-teal-100 px-3 py-1 rounded-full inline-block mt-1">
                      <span className="text-sm font-bold text-teal-800">
                        {order.tests.length} test{order.tests.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Order Total and Actions */}
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase">Total</p>
                    <p className="text-xl font-bold text-blue-600">{formatCurrency(calculateOrderTotal(order))}</p>
                  </div>
                  {isEditing && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAddTest(orderIdx)}
                        className="flex items-center gap-1 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
                        title="Add Test"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      {order.tests.map((test, testIdx) => (
                        <div key={testIdx} className="flex gap-1">
                          <button
                            onClick={() => handleEditTest(orderIdx, testIdx)}
                            className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                            title="Edit test"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteTest(orderIdx, testIdx)}
                            className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                            title="Delete test"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lab Total Summary */}
      <div className="mt-6 p-4 bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl border border-teal-200">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-lg font-semibold text-gray-700">Total Laboratory Charges:</span>
            <p className="text-sm text-gray-500 mt-1">
              {labOrders.length} order{labOrders.length !== 1 ? 's' : ''} • {labOrders.reduce((sum, order) => sum + order.tests.length, 0)} test{labOrders.reduce((sum, order) => sum + order.tests.length, 0) !== 1 ? 's' : ''}
            </p>
          </div>
          <span className="text-2xl font-bold text-blue-600">{formatCurrency(calculateLabTotal())}</span>
        </div>
      </div>
    </div>
  );
}
