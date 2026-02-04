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
  Syringe,
  Image,
  Eye,
  X
} from 'lucide-react';
import { getPatientPrescriptionGroups, type PrescriptionGroup, type MedicationItem } from '../lib/pharmacyService';

interface MedicationHistoryProps {
  patientId: string;
  refreshTrigger?: number;
}

export default function MedicationHistory({ patientId, refreshTrigger }: MedicationHistoryProps) {
  const [prescriptionGroups, setPrescriptionGroups] = useState<PrescriptionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'prescribed' | 'dispensed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);

  useEffect(() => {
    loadMedicationHistory();
  }, [patientId, refreshTrigger]);

  const loadMedicationHistory = async () => {
    try {
      setLoading(true);
      const groups = await getPatientPrescriptionGroups(patientId);
      setPrescriptionGroups(groups);
    } catch (err) {
      setError('Failed to load medication history');
      console.error('Error loading medication history:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredGroups = prescriptionGroups.filter(group => {
    const matchesFilter = filter === 'all' || 
      (filter === 'prescribed' && group.status === 'prescribed') ||
      (filter === 'dispensed' && group.status === 'dispensed');
    
    const matchesSearch = !searchTerm || 
      group.medications.some(med => 
        med.medication_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        med.dosage.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
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

  const getStatusIcon = (group: PrescriptionGroup) => {
    if (group.status === 'dispensed') {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    return <Clock className="h-5 w-5 text-yellow-500" />;
  };

  const getStatusText = (group: PrescriptionGroup) => {
    if (group.status === 'dispensed') {
      return 'Dispensed';
    }
    return 'Prescribed';
  };

  const getStatusColor = (group: PrescriptionGroup) => {
    if (group.status === 'dispensed') {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  };

  const getMedicationTypeIcon = (item: MedicationItem) => {
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

  const getMedicationTypeIconColor = (item: MedicationItem) => {
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

  const handleViewImage = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  const handleCloseImageModal = () => {
    setSelectedImage(null);
    setShowImageModal(false);
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
      {filteredGroups.length === 0 ? (
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
          {filteredGroups.map((group, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Pill className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">
                          {group.prescription_id ? `Prescription ${group.prescription_id}` : 'Medication Group'}
                        </h4>
                        {group.prescription_image_url && (
                          <button
                            onClick={() => handleViewImage(group.prescription_image_url!)}
                            className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
                            title="View prescription image"
                          >
                            <Image className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {group.medications.length} medication{group.medications.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  
                  {/* Medications List */}
                  <div className="space-y-3 mb-4">
                    {group.medications.map((med, medIndex) => (
                      <div key={medIndex} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className={`p-2 ${getMedicationTypeIconColor(med)} rounded-lg`}>
                          {getMedicationTypeIcon(med)}
                        </div>
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900">{med.medication_name}</h5>
                          <p className="text-sm text-gray-600">{med.dosage}</p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                            <span>Frequency: {med.frequency}</span>
                            <span>Duration: {med.duration}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>
                        {group.status === 'dispensed' ? 'Dispensed' : 'Prescribed'}: {formatDate(group.dispensed_date || group.prescribed_date)}
                      </span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-600">
                      <User className="h-4 w-4 mr-2" />
                      <span>By: {group.prescribed_by || group.dispensed_by}</span>
                    </div>
                    
                    {group.total_amount && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Package className="h-4 w-4 mr-2" />
                        <span>Total: ₹{group.total_amount}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  {getStatusIcon(group)}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(group)}`}>
                    {getStatusText(group)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Prescription Image</h3>
              <button
                onClick={handleCloseImageModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 p-4 overflow-auto">
              <img
                src={selectedImage}
                alt="Prescription"
                className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              />
            </div>
            <div className="p-4 border-t border-gray-200">
              <div className="flex justify-end gap-3">
                <a
                  href={selectedImage}
                  download="prescription.png"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Download Image
                </a>
                <button
                  onClick={handleCloseImageModal}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}