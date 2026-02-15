'use client';
import React, { useState, useEffect } from 'react';
import { X, Calculator, FileText, Clock, Bed, Plus, Trash2, Save, AlertCircle, User, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import BillingService from '../services/billingService';

interface Patient {
  id: string;
  patient_id: string;
  name: string;
  phone: string;
  bed_id?: string | null;
  admission_date?: string | null;
  department_ward?: string;
  room_number?: string;
  bed_allocation_id?: string | null;
}

interface LocalBillingItem {
  id: string;
  category: string;
  service_name: string;
  quantity: number;
  unit_rate: number;
  total_amount: number;
  service_date: string;
  notes?: string;
}

interface LocalFeeCategory {
  id: string;
  name: string;
  description: string;
}

interface LocalFeeRate {
  id: string;
  category_id: string;
  service_name: string;
  rate_per_unit: number;
  unit_type: string;
}

interface DischargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: any;
  onDischargeSuccess: () => void;
}

interface AdditionalService {
  service_name: string;
  quantity: number;
  unit_rate: number;
  fee_rate_id?: string;
  notes?: string;
}

const DischargeModal: React.FC<DischargeModalProps> = ({
  isOpen,
  onClose,
  patient,
  onDischargeSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [dischargeDate, setDischargeDate] = useState(new Date().toISOString().slice(0, 16));
  const [dischargeNotes, setDischargeNotes] = useState('');
  const [roomCharges, setRoomCharges] = useState({
    days: 0,
    dailyRate: 0,
    totalCharges: 0,
    bedType: ''
  });
  const [additionalServices, setAdditionalServices] = useState<AdditionalService[]>([]);
  const [feeCategories, setFeeCategories] = useState<LocalFeeCategory[]>([]);
  const [feeRates, setFeeRates] = useState<LocalFeeRate[]>([]);
  const [taxPercentage, setTaxPercentage] = useState(0);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [billTotals, setBillTotals] = useState({
    subtotal: 0,
    taxAmount: 0,
    discountAmount: 0,
    totalAmount: 0
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadFeeData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && patient) {
      calculateBilling();
    }
  }, [isOpen, patient, dischargeDate, additionalServices, taxPercentage, discountPercentage]);

  const loadFeeData = async () => {
    try {
      const [categories, rates] = await Promise.all([
        BillingService.getFeeCategories(),
        BillingService.getAllFeeRates()
      ]);

      // Convert to local format for compatibility
      setFeeCategories(categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        description: cat.description || ''
      })));

      setFeeRates(rates.map(rate => ({
        id: rate.id,
        category_id: rate.category_id,
        service_name: rate.service_name,
        rate_per_unit: rate.rate_per_unit,
        unit_type: rate.unit_type
      })));
    } catch (error) {
      console.error('Error loading fee data:', error);
      setError('Failed to load fee data');
    }
  };

  const calculateBilling = async () => {
    if (!patient?.bed_allocation) return;

    try {
      // Calculate room charges using BillingService
      const charges = await BillingService.calculateRoomCharges(
        patient.bed_allocation.bed_id,
        patient.bed_allocation.admission_date,
        dischargeDate
      );

      setRoomCharges(charges);

      // Prepare all billing items for calculation
      const allItems = [
        {
          patient_admission_id: '',
          service_name: charges.bedType,
          quantity: charges.days,
          unit_rate: charges.dailyRate,
          service_date: new Date().toISOString().split('T')[0],
          notes: `Room charges for ${charges.days} days`
        },
        ...additionalServices.map(service => ({
          patient_admission_id: '',
          service_name: service.service_name,
          quantity: service.quantity,
          unit_rate: service.unit_rate,
          fee_rate_id: service.fee_rate_id,
          service_date: new Date().toISOString().split('T')[0],
          notes: service.notes
        }))
      ];

      // Calculate totals using BillingService
      const totals = BillingService.calculateBillTotals(allItems, taxPercentage, discountPercentage);
      setBillTotals(totals);

    } catch (error) {
      console.error('Error calculating billing:', error);
      setError('Failed to calculate billing');
    }
  };

  const addAdditionalService = () => {
    const newService: AdditionalService = {
      service_name: '',
      quantity: 1,
      unit_rate: 0,
      notes: ''
    };
    setAdditionalServices([...additionalServices, newService]);
  };

  const updateAdditionalService = (index: number, field: keyof AdditionalService, value: any) => {
    setAdditionalServices(services =>
      services.map((service, i) =>
        i === index ? { ...service, [field]: value } : service
      )
    );
  };

  const removeAdditionalService = (index: number) => {
    setAdditionalServices(services => services.filter((_, i) => i !== index));
  };

  const handleServiceSelection = (index: number, serviceId: string) => {
    const selectedRate = feeRates.find(rate => rate.id === serviceId);
    if (selectedRate) {
      updateAdditionalService(index, 'service_name', selectedRate.service_name);
      updateAdditionalService(index, 'unit_rate', selectedRate.rate_per_unit);
      updateAdditionalService(index, 'fee_rate_id', selectedRate.id);
    }
  };

  const handleDischarge = async () => {
    if (!patient.bed_id) {
      setError('Patient is not currently admitted');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const dischargeDateTime = new Date(dischargeDate);
      const { totalAmount } = billTotals;

      // First, get the bed allocation ID for this patient
      const { data: bedAllocation, error: allocationError } = await supabase
        .from('bed_allocations')
        .select('id')
        .eq('patient_id', patient.id)
        .eq('bed_id', patient.bed_id)
        .is('discharge_date', null)
        .single();

      if (allocationError || !bedAllocation) {
        throw new Error('Could not find active bed allocation for patient');
      }

      // Update bed allocation with discharge date
      const { error: bedError } = await supabase
        .from('bed_allocations')
        .update({
          discharge_date: dischargeDateTime.toISOString(),
          status: 'discharged',
          total_charges: totalAmount,
          updated_at: new Date().toISOString()
        })
        .eq('patient_id', patient.id)
        .eq('bed_id', patient.bed_id)
        .is('discharge_date', null);

      if (bedError) throw bedError;

      // Use BillingService to handle discharge
      const additionalBillingItems = additionalServices.map(service => ({
        patient_admission_id: '',
        service_name: service.service_name,
        quantity: service.quantity,
        unit_rate: service.unit_rate,
        fee_rate_id: service.fee_rate_id,
        service_date: new Date().toISOString().split('T')[0],
        notes: service.notes
      }));

      await BillingService.processDischarge(
        bedAllocation.id,
        dischargeDateTime.toISOString(),
        dischargeNotes,
        additionalBillingItems,
        taxPercentage,
        discountPercentage
      );

      // Update bed status to available
      const { error: bedStatusError } = await supabase
        .from('beds')
        .update({ status: 'available' })
        .eq('id', patient.bed_id);

      if (bedStatusError) throw bedStatusError;

      // Update patient admission status in patients table
      const { error: patientUpdateError } = await supabase
        .from('patients')
        .update({ is_admitted: false })
        .eq('id', patient.id);

      if (patientUpdateError) {
        console.error('Error updating patient admission flag:', patientUpdateError);
      }

      onDischargeSuccess();
      onClose();
    } catch (error) {
      console.error('Error discharging patient:', error);
      setError('Failed to discharge patient. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-red-100 p-2 rounded-xl">
              <FileText className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Discharge Patient</h2>
              <p className="text-sm text-gray-600">{patient.name} - {patient.patient_id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* Patient Info */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Patient Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center">
                <User className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-gray-600">Name:</span>
                <span className="ml-2 font-medium">{patient.name}</span>
              </div>
              <div className="flex items-center">
                <Bed className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-gray-600">Room:</span>
                <span className="ml-2 font-medium">{patient.department_ward} - {patient.room_number}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-gray-600">Admitted:</span>
                <span className="ml-2 font-medium">
                  {patient.admission_date ? new Date(patient.admission_date).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-gray-600">Stay Duration:</span>
                <span className="ml-2 font-medium">{roomCharges.days} days</span>
              </div>
            </div>
          </div>

          {/* Discharge Details */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Discharge Date & Time
            </label>
            <input
              type="datetime-local"
              value={dischargeDate}
              onChange={(e) => setDischargeDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Room Charges */}
          <div className="bg-blue-50 rounded-xl p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Room Charges</h3>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Bed Type:</span>
                <p className="font-medium">{roomCharges.bedType}</p>
              </div>
              <div>
                <span className="text-gray-600">Days:</span>
                <p className="font-medium">{roomCharges.days}</p>
              </div>
              <div>
                <span className="text-gray-600">Daily Rate:</span>
                <p className="font-medium">₹{roomCharges.dailyRate}</p>
              </div>
              <div>
                <span className="text-gray-600">Total:</span>
                <p className="font-medium text-blue-600">₹{roomCharges.totalCharges}</p>
              </div>
            </div>
          </div>

          {/* Additional Services */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Additional Services</h3>
              <button
                onClick={addAdditionalService}
                className="flex items-center bg-orange-500 text-white px-3 py-2 rounded-xl text-sm hover:bg-orange-600 transition-colors"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Service
              </button>
            </div>

            <div className="space-y-3">
              {additionalServices.map((service, index) => (
                <div key={index} className="bg-gray-50 rounded-xl p-4">
                  <div className="grid grid-cols-5 gap-3 items-end">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Service</label>
                      <select
                        value={service.service_name}
                        onChange={(e) => {
                          const selectedRate = feeRates.find(rate => rate.service_name === e.target.value);
                          if (selectedRate) {
                            handleServiceSelection(index, selectedRate.id);
                          }
                        }}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-orange-500"
                      >
                        <option value="">Select Service</option>
                        {feeRates.map(rate => (
                          <option key={rate.id} value={rate.service_name}>{rate.service_name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={service.quantity}
                        onChange={(e) => updateAdditionalService(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Unit Rate (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={service.unit_rate}
                        onChange={(e) => updateAdditionalService(index, 'unit_rate', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Total (₹)</label>
                      <input
                        type="text"
                        value={(service.quantity * service.unit_rate).toFixed(0)}
                        readOnly
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg bg-gray-100"
                      />
                    </div>
                    <div>
                      <button
                        onClick={() => removeAdditionalService(index)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Billing Summary */}
          <div className="bg-orange-50 rounded-xl p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Billing Summary</h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tax (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={taxPercentage}
                  onChange={(e) => setTaxPercentage(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Discount (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={discountPercentage}
                  onChange={(e) => setDiscountPercentage(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">₹{billTotals.subtotal.toFixed(0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax ({taxPercentage}%):</span>
                <span className="font-medium">₹{billTotals.taxAmount.toFixed(0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Discount ({discountPercentage}%):</span>
                <span className="font-medium text-green-600">-₹{billTotals.discountAmount.toFixed(0)}</span>
              </div>
              <div className="border-t border-gray-300 pt-2">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Amount:</span>
                  <span className="text-orange-600">₹{billTotals.totalAmount.toFixed(0)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Discharge Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Discharge Notes (Optional)
            </label>
            <textarea
              value={dischargeNotes}
              onChange={(e) => setDischargeNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Enter any discharge notes or instructions..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDischarge}
            disabled={loading}
            className="flex items-center bg-red-500 text-white px-6 py-2 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Discharge Patient
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DischargeModal;