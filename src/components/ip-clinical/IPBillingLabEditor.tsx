'use client';

import React, { useState } from 'react';
import { Edit2, Save, X, Plus, Trash2 } from 'lucide-react';

interface LabTest {
  test_name: string;
  test_cost: number;
}

interface LabOrder {
  order_number: string;
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
      test_cost: 0
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
        <div className="space-y-4">
          {labOrders.map((order, orderIdx) => (
            <div key={orderIdx} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex justify-between items-center p-3 bg-teal-50">
                <div>
                  <h3 className="font-semibold text-gray-900">Order #{order.order_number}</h3>
                  <p className="text-sm text-gray-600">{new Date(order.order_date).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">
                    {order.tests.length} test{order.tests.length !== 1 ? 's' : ''}
                  </span>
                  <span className="font-bold text-blue-600">
                    {formatCurrency(calculateOrderTotal(order))}
                  </span>
                  {isEditing && (
                    <button
                      onClick={() => handleAddTest(orderIdx)}
                      className="flex items-center gap-1 px-3 py-1 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      Add Test
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Test Name</th>
                      <th className="px-4 py-2 text-right">Cost</th>
                      {isEditing && <th className="px-4 py-2 text-center">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {order.tests.map((test, testIdx) => (
                      <tr key={testIdx} className="border-t">
                        <td className="px-4 py-2">
                          {isEditing && editingOrderIndex === orderIdx && editingTestIndex === testIdx ? (
                            <input
                              type="text"
                              value={test.test_name}
                              onChange={(e) => handleUpdateTest(orderIdx, testIdx, 'test_name', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="Test name"
                            />
                          ) : (
                            <span className="font-medium text-gray-900">{test.test_name || 'Unnamed Test'}</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {isEditing && editingOrderIndex === orderIdx && editingTestIndex === testIdx ? (
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={test.test_cost}
                              onChange={(e) => handleUpdateTest(orderIdx, testIdx, 'test_cost', e.target.value)}
                              className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                              placeholder="0.00"
                            />
                          ) : (
                            <span className="font-semibold text-gray-900">{formatCurrency(test.test_cost)}</span>
                          )}
                        </td>
                        {isEditing && (
                          <td className="px-4 py-2 text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => handleEditTest(orderIdx, testIdx)}
                                className="text-blue-600 hover:text-blue-800 transition-colors"
                                title="Edit test"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTest(orderIdx, testIdx)}
                                className="text-red-600 hover:text-red-800 transition-colors"
                                title="Delete test"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-bold">
                      <td className="px-4 py-2 text-right">Order Total:</td>
                      <td className="px-4 py-2 text-right text-blue-600">{formatCurrency(calculateOrderTotal(order))}</td>
                      {isEditing && <td></td>}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lab Total Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold text-gray-700">Total Laboratory Charges:</span>
          <span className="text-2xl font-bold text-blue-600">{formatCurrency(calculateLabTotal())}</span>
        </div>
      </div>
    </div>
  );
}
