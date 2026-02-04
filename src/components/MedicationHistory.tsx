'use client';

import React, { useState, useEffect } from 'react';
import { 
  Pill, 
  Calendar, 
  Clock, 
  User, 
  Package, 
  ShoppingCart, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  Plus,
  Search,
  Filter,
  Syringe
} from 'lucide-react';
import { getPatientMedicationHistory, type MedicationHistory } from '../lib/pharmacyService';

interface MedicationHistoryProps {
  patientId: string;
}

export default function MedicationHistory({ patientId }: MedicationHistoryProps) {
  const [medicationHistory, setMedicationHistory] = useState<MedicationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'prescribed' | 'dispensed'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadMedicationHistory();
  }, [patientId]);

  const loadMedicationHistory = async () => {
    try {
      setLoading(true);
      const history = await getPatientMedicationHistory(patientId);
      setMedicationHistory(history);
    } catch (err) {
      setError('Failed to load medication history');
      console.error('Error loading medication history:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = medicationHistory.filter(item => {
    const matchesFilter = filter === 'all' || 
      (filter === 'prescribed' && !item.dispensed_date) ||
      (filter === 'dispensed' && item.dispensed_date);
    
    const matchesSearch = !searchTerm || 
      item.medication_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.dosage.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (item: MedicationHistory) => {
    if (item.dispensed_date) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    return <Clock className="h-5 w-5 text-yellow-500" />;
  };

  const getStatusText = (item: MedicationHistory) => {
    if (item.dispensed_date) {
      return 'Dispensed';
    }
    return 'Prescribed';
  };

  const getStatusColor = (item: MedicationHistory) => {
    if (item.dispensed_date) {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  };

  const getMedicationTypeIcon = (item: MedicationHistory) => {
    const dosageForm = item.dosage_form?.toLowerCase() || '';
    
    // Check if it's an injection
    if (dosageForm.includes('injection') || 
        dosageForm.includes('inject') || 
        dosageForm.includes('iv') || 
        dosageForm.includes('im') || 
        dosageForm.includes('sc') || 
        dosageForm.includes('vial') || 
        dosageForm.includes('ampoule')) {
      return <Syringe className="h-4 w-4 text-purple-600" />;
    }
    
    // Default to pill for oral medications and others
    return <Pill className="h-4 w-4 text-blue-600" />;
  };

  const getMedicationTypeIconColor = (item: MedicationHistory) => {
    const dosageForm = item.dosage_form?.toLowerCase() || '';
    
    // Check if it's an injection
    if (dosageForm.includes('injection') || 
        dosageForm.includes('inject') || 
        dosageForm.includes('iv') || 
        dosageForm.includes('im') || 
        dosageForm.includes('sc') || 
        dosageForm.includes('vial') || 
        dosageForm.includes('ampoule')) {
      return 'bg-purple-100';
    }
    
    // Default to blue for oral medications and others
    return 'bg-blue-100';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <span className="ml-3 text-gray-600">Loading medication history...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Pill className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Medication History</h3>
            <p className="text-sm text-gray-600">Prescribed and dispensed medications</p>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search medications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-orange-100 text-orange-700 border border-orange-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('prescribed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'prescribed'
                ? 'bg-orange-100 text-orange-700 border border-orange-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Prescribed
          </button>
          <button
            onClick={() => setFilter('dispensed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'dispensed'
                ? 'bg-orange-100 text-orange-700 border border-orange-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Dispensed
          </button>
        </div>
      </div>

      {/* Medication List */}
      {filteredHistory.length === 0 ? (
        <div className="text-center py-12">
          <Pill className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No medications found</h3>
          <p className="text-gray-600">
            {searchTerm || filter !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'No medications have been prescribed for this patient yet.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredHistory.map((item, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 ${getMedicationTypeIconColor(item)} rounded-lg`}>
                      {getMedicationTypeIcon(item)}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{item.medication_name}</h4>
                      <p className="text-sm text-gray-600">{item.dosage}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>Prescribed: {formatDate(item.prescribed_date)}</span>
                    </div>
                    
                    {item.dispensed_date && (
                      <div className="flex items-center text-sm text-gray-600">
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        <span>Dispensed: {formatDate(item.dispensed_date)}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center text-sm text-gray-600">
                      <User className="h-4 w-4 mr-2" />
                      <span>By: {item.prescribed_by}</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-600">
                      <Package className="h-4 w-4 mr-2" />
                      <span>Frequency: {item.frequency}</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>Duration: {item.duration}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  {getStatusIcon(item)}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(item)}`}>
                    {getStatusText(item)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}