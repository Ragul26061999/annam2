'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { Target, Plus, Search, X, Pill, Package, ArrowRight, Filter, Calendar, BarChart3, CheckCircle, Bell, ArrowRightLeft, ArrowLeft, Eye, Info } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { getComprehensiveMedicineData, getBatchPurchaseHistory, getBatchStockStats } from '@/src/lib/pharmacyService';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface MovedMedicine {
  id: string;
  medicine_id: string;
  medicine_name: string;
  moved_quantity: number;
  original_quantity: number;
  moved_from: string;
  moved_to: string;
  moved_by: string;
  moved_at: string;
  reason: string;
  batch_number: string;
  manufacturer: string;
  mrp: number;
}

interface IntentMedicine {
  id: string;
  intent_type: string;
  medication_id: string;
  medication_name: string;
  batch_number: string;
  quantity: number;
  mrp: number;
  created_at: string;
  combination?: string;
  dosage_type?: string;
  manufacturer?: string;
  medicine_status?: string;
  expiry_date?: string;
}

interface Medication {
  id: string;
  name: string;
  generic_name: string;
  manufacturer: string;
  total_stock: number;
  available_stock: number;
  mrp: number;
  status: string;
  category?: string;
}

function IntentPageInner() {
  const [selectedIntentType, setSelectedIntentType] = useState('injection room');
  const [intentMedicines, setIntentMedicines] = useState<IntentMedicine[]>([]);
  const [allIntentMedicines, setAllIntentMedicines] = useState<IntentMedicine[]>([]);
  const [allMedicines, setAllMedicines] = useState<Medication[]>([]);
  const [showBuyMedicineModal, setShowBuyMedicineModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [buyMedicineData, setBuyMedicineData] = useState({
    name: '',
    manufacturer: '',
    category: '',
    quantity: 1,
    mrp: 0,
    batch_number: '',
    expiry_date: ''
  });
  const [medicineSearchTerm, setMedicineSearchTerm] = useState('');
  const [showMedicineDropdown, setShowMedicineDropdown] = useState(false);
  const [selectedMedicineFromIntent, setSelectedMedicineFromIntent] = useState<IntentMedicine | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEditMedicine, setSelectedEditMedicine] = useState<IntentMedicine | null>(null);
  const [editQuantity, setEditQuantity] = useState(1);
  const [movedMedicines, setMovedMedicines] = useState<MovedMedicine[]>([]);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [selectedMoveMedicine, setSelectedMoveMedicine] = useState<IntentMedicine | null>(null);
  const [moveQuantity, setMoveQuantity] = useState(1);
  const [showBellNotifications, setShowBellNotifications] = useState(false);
  const [zeroQuantityAlerts, setZeroQuantityAlerts] = useState<IntentMedicine[]>([]);
  const [showMedicineDetail, setShowMedicineDetail] = useState(false);
  const [selectedMedicineDetail, setSelectedMedicineDetail] = useState<IntentMedicine | null>(null);
  const [comprehensiveMedicineData, setComprehensiveMedicineData] = useState<any | null>(null);
  const [loadingMedicineDetail, setLoadingMedicineDetail] = useState(false);
  const [batchStatsMap, setBatchStatsMap] = useState<Record<string, { remainingUnits: number; soldUnitsThisMonth: number; purchasedUnitsThisMonth: number }>>({});

  const loadAllMedicines = async () => {
    try {
      console.log('Loading medicines from database...');
      const { data, error } = await supabase
        .from('medications')
        .select('id, name, manufacturer, category, unit, combination, available_stock, total_stock, mrp, status')
        .eq('status', 'active')
        .order('name');

      if (error) {
        console.error('Supabase query error:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw new Error(`Database query failed: ${error.message}`);
      }

      console.log(`Successfully loaded ${data?.length || 0} medicines`);
      setAllMedicines((data as unknown as Medication[]) || []);
    } catch (error: any) {
      console.error('Error loading medicines:', {
        error: error,
        message: error?.message || 'Unknown error',
        stack: error?.stack,
        type: typeof error
      });

      // Show user-friendly error message
      alert(`Failed to load medicines: ${error?.message || 'Please check your connection and try again.'}`);
    }
  };

  // Load all intent medicines across all departments
  const loadAllIntentMedicines = async () => {
    try {
      console.log('Loading intent medicines from database...');
      const { data, error } = await supabase
        .from('intent_medicines')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase query error for intent_medicines:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw new Error(`Database query failed: ${error.message}`);
      }

      console.log(`Successfully loaded ${data?.length || 0} intent medicines`);
      setAllIntentMedicines(data || []);
    } catch (error: any) {
      console.error('Error loading intent medicines:', {
        error: error,
        message: error?.message || 'Unknown error',
        stack: error?.stack,
        type: typeof error
      });

      // Show user-friendly error message
      alert(`Failed to load intent medicines: ${error?.message || 'Please check your connection and try again.'}`);
    }
  };

  // Get medicines for current intent type
  const getCurrentIntentMedicines = () => {
    return allIntentMedicines.filter(med => med.intent_type === selectedIntentType);
  };

  // Search across all intent sections and show locations
  const searchAcrossAllSections = (searchTerm: string) => {
    if (!searchTerm.trim()) return [];

    const matchingMedicines = allIntentMedicines.filter(med =>
      med.medication_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      med.combination?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      med.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Group by medicine name and show sections
    const groupedByMedicine = matchingMedicines.reduce((acc: any, med) => {
      const key = med.medication_name;
      if (!acc[key]) {
        acc[key] = {
          name: med.medication_name,
          sections: [],
          medicine: med
        };
      }
      if (!acc[key].sections.includes(med.intent_type)) {
        acc[key].sections.push(med.intent_type);
      }
      return acc;
    }, {});

    return Object.values(groupedByMedicine);
  };

  // Load moved medicines history
  const loadMovedMedicines = async () => {
    try {
      const { data, error } = await supabase
        .from('moved_medicines')
        .select('*')
        .order('moved_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading moved medicines:', error);
        // If table doesn't exist, create it
        if (error.code === 'PGRST116') {
          console.log('moved_medicines table does not exist, will create on first move');
          setMovedMedicines([]);
          return;
        }
        throw error;
      }

      setMovedMedicines(data || []);
    } catch (error) {
      console.error('Error loading moved medicines:', error);
      setMovedMedicines([]);
    }
  };

  // Check for zero quantity medicines
  const checkZeroQuantityMedicines = () => {
    const zeroQtyMedicines = allIntentMedicines.filter(med => med.quantity === 0);
    setZeroQuantityAlerts(zeroQtyMedicines);
  };

  // Move medicine function
  const moveMedicine = async () => {
    if (!selectedMoveMedicine || moveQuantity <= 0 || moveQuantity > selectedMoveMedicine.quantity) {
      alert('Invalid move quantity');
      return;
    }

    setLoading(true);
    try {
      const newQuantity = selectedMoveMedicine.quantity - moveQuantity;
      
      // Update intent medicine quantity
      const { error: updateError } = await supabase
        .from('intent_medicines')
        .update({ quantity: newQuantity })
        .eq('id', selectedMoveMedicine.id);

      if (updateError) throw updateError;

      // Record the move in moved_medicines table
      const moveRecord = {
        medicine_id: selectedMoveMedicine.medication_id,
        medicine_name: selectedMoveMedicine.medication_name,
        moved_quantity: moveQuantity,
        original_quantity: selectedMoveMedicine.quantity,
        moved_from: selectedMoveMedicine.intent_type,
        moved_to: 'updated stock medicine',
        moved_by: 'System',
        moved_at: new Date().toISOString(),
        reason: 'Quantity reduction',
        batch_number: selectedMoveMedicine.batch_number,
        manufacturer: selectedMoveMedicine.manufacturer || '',
        mrp: selectedMoveMedicine.mrp
      };

      const { error: moveError } = await supabase
        .from('moved_medicines')
        .insert(moveRecord);

      if (moveError) {
        // If table doesn't exist, create it
        if (moveError.code === 'PGRST116') {
          console.log('Creating moved_medicines table...');
          // Table creation would need to be done via migration
          console.warn('Please create moved_medicines table with appropriate schema');
        } else {
          throw moveError;
        }
      }

      // If quantity becomes 0, move to updated stock medicine
      if (newQuantity === 0) {
        const { error: moveError } = await supabase
          .from('intent_medicines')
          .update({ intent_type: 'updated stock medicine' })
          .eq('id', selectedMoveMedicine.id);

        if (moveError) throw moveError;
      }

      // Refresh data
      await fetchIntentMedicines();
      await loadAllIntentMedicines();
      await loadMovedMedicines();
      checkZeroQuantityMedicines();

      // Reset modal
      setShowMoveModal(false);
      setSelectedMoveMedicine(null);
      setMoveQuantity(1);

      alert(`Successfully moved ${moveQuantity} units of ${selectedMoveMedicine.medication_name}`);
    } catch (error) {
      console.error('Error moving medicine:', error);
      alert('Error moving medicine. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openMoveModal = (medicine: IntentMedicine) => {
    setSelectedMoveMedicine(medicine);
    setMoveQuantity(1);
    setShowMoveModal(true);
  };

  const intentTypes = [
    { key: 'injection room', label: 'Injection Room', icon: '💉' },
    { key: 'icu', label: 'ICU', icon: '🏥' },
    { key: 'casual', label: 'Casual', icon: '⚕️' },
    { key: 'nicu', label: 'NICU', icon: '👶' },
    { key: 'labour word', label: 'Labour Word', icon: '🤰' },
    { key: 'miones', label: 'Miones', icon: '🔬' },
    { key: 'major ot', label: 'Major OT', icon: '🔪' },
    { key: 'updated stock medicine', label: 'Updated Stock Medicine', icon: '📦' }
  ];

  // Fetch intent medicines for selected type
  useEffect(() => {
    fetchIntentMedicines();
  }, [selectedIntentType]);

  // Fetch all available medicines
  useEffect(() => {
    fetchAllMedicines();
    loadMovedMedicines();
  }, []);

  // Check for zero quantity medicines when data changes
  useEffect(() => {
    checkZeroQuantityMedicines();
  }, [allIntentMedicines]);

  const fetchIntentMedicines = async () => {
    try {
      const { data, error } = await supabase
        .from('intent_medicines')
        .select('*')
        .eq('intent_type', selectedIntentType)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIntentMedicines(data || []);
    } catch (error) {
      console.error('Error fetching intent medicines:', error);
    }
  };

  const fetchAllMedicines = async () => {
    try {
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('status', 'active')
        .gt('available_stock', 0)
        .order('name');

      if (error) throw error;
      setAllMedicines(data || []);
    } catch (error) {
      console.error('Error fetching medicines:', error);
    }
  };

  const buyMedicine = async () => {
    // Enhanced validation
    const errors = [];

    if (!buyMedicineData.name.trim()) {
      errors.push('Medicine name is required');
    }

    if (!buyMedicineData.manufacturer.trim()) {
      errors.push('Manufacturer is required');
    }

    if (buyMedicineData.quantity <= 0) {
      errors.push('Quantity must be greater than 0');
    }

    if (buyMedicineData.mrp <= 0) {
      errors.push('MRP must be greater than 0');
    }

    if (buyMedicineData.name.trim().length < 2) {
      errors.push('Medicine name must be at least 2 characters long');
    }

    if (buyMedicineData.manufacturer.trim().length < 2) {
      errors.push('Manufacturer name must be at least 2 characters long');
    }

    if (errors.length > 0) {
      alert(`Please fix the following errors:\n\n${errors.join('\n')}`);
      return;
    }

    setLoading(true);
    try {
      // Check if medicine already exists (case-insensitive)
      const { data: existingMedicine, error: checkError } = await supabase
        .from('medications')
        .select('id, name, manufacturer, available_stock, total_stock, mrp, category')
        .eq('name', buyMedicineData.name.trim())
        .eq('manufacturer', buyMedicineData.manufacturer.trim())
        .eq('status', 'active')
        .single();

      let successMessage = '';
      let medicineId = '';

      if (existingMedicine) {
        // Update existing medicine stock and potentially other fields
        const newAvailableStock = existingMedicine.available_stock + buyMedicineData.quantity;
        const newTotalStock = existingMedicine.total_stock + buyMedicineData.quantity;

        const { error: updateError } = await supabase
          .from('medications')
          .update({
            available_stock: newAvailableStock,
            total_stock: newTotalStock,
            mrp: buyMedicineData.mrp, // Update MRP if changed
            category: buyMedicineData.category || existingMedicine.category || 'General'
          })
          .eq('id', existingMedicine.id);

        if (updateError) throw updateError;

        medicineId = existingMedicine.id;
        successMessage = `Stock updated for "${buyMedicineData.name}" by ${buyMedicineData.manufacturer}. New stock: ${newAvailableStock}`;
      } else {
        // Create new medicine with comprehensive data
        const newMedicineData = {
          name: buyMedicineData.name.trim(),
          manufacturer: buyMedicineData.manufacturer.trim(),
          category: buyMedicineData.category || 'General',
          available_stock: buyMedicineData.quantity,
          total_stock: buyMedicineData.quantity,
          mrp: buyMedicineData.mrp,
          status: 'active',
          unit: 'Tablet',
          combination: '',
          batch_number: buyMedicineData.batch_number || 'AUTO',
          expiry_date: buyMedicineData.expiry_date || null
        };

        const { data: newMedicine, error: insertError } = await supabase
          .from('medications')
          .insert(newMedicineData)
          .select('id')
          .single();

        if (insertError) throw insertError;

        medicineId = newMedicine.id;
        successMessage = `New medicine "${buyMedicineData.name}" added to inventory with ${buyMedicineData.quantity} units`;
      }

      // Refresh data to show updated inventory
      await fetchAllMedicines();

      // Reset form with success feedback
      setShowBuyMedicineModal(false);
      setBuyMedicineData({
        name: '',
        manufacturer: '',
        category: '',
        quantity: 1,
        mrp: 0,
        batch_number: '',
        expiry_date: ''
      });
      setMedicineSearchTerm('');
      setSelectedMedicineFromIntent(null);
      setShowMedicineDropdown(false);

      // Show success message
      alert(`✅ ${successMessage}`);

    } catch (error: any) {
      console.error('Error buying medicine:', error);

      // Provide user-friendly error messages
      let errorMessage = 'Error purchasing medicine. Please try again.';

      if (error?.message) {
        if (error.message.includes('duplicate key')) {
          errorMessage = 'This medicine already exists with the same name and manufacturer.';
        } else if (error.message.includes('permission')) {
          errorMessage = 'You do not have permission to add medicines.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        }
      }

      alert(`❌ ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteIntentMedicine = async (medicine: IntentMedicine) => {
    if (!confirm('Are you sure you want to remove this medicine from the department?')) {
      return;
    }

    setLoading(true);
    try {
      // Remove from intent_medicines table
      const { error: deleteError } = await supabase
        .from('intent_medicines')
        .delete()
        .eq('id', medicine.id);

      if (deleteError) throw deleteError;

      // Restore stock to medications table
      // First get current stock values
      const { data: currentMed } = await supabase
        .from('medications')
        .select('available_stock, total_stock')
        .eq('id', medicine.medication_id)
        .single();

      if (currentMed) {
        const { error: updateError } = await supabase
          .from('medications')
          .update({
            available_stock: (currentMed.available_stock || 0) + medicine.quantity,
            total_stock: (currentMed.total_stock || 0) + medicine.quantity
          })
          .eq('id', medicine.medication_id);

        if (updateError) throw updateError;
      }

      // Refresh data
      await fetchIntentMedicines();
      await fetchAllMedicines();

      alert('Medicine removed successfully!');
    } catch (error) {
      console.error('Error removing medicine:', error);
      alert('Error removing medicine. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const editIntentMedicine = async () => {
    if (!selectedEditMedicine || editQuantity <= 0) return;

    setLoading(true);
    try {
      const quantityDifference = editQuantity - selectedEditMedicine.quantity;

      // Update intent_medicines table
      const { error: updateIntentError } = await supabase
        .from('intent_medicines')
        .update({ quantity: editQuantity })
        .eq('id', selectedEditMedicine.id);

      if (updateIntentError) throw updateIntentError;

      // Update medication stock (subtract the difference if positive, add if negative)
      if (quantityDifference !== 0) {
        // First get current stock values
        const { data: currentMed } = await supabase
          .from('medications')
          .select('available_stock, total_stock')
          .eq('id', selectedEditMedicine.medication_id)
          .single();

        if (currentMed) {
          const stockChange = -quantityDifference; // If we increase intent quantity, we decrease available stock
          const { error: updateStockError } = await supabase
            .from('medications')
            .update({
              available_stock: (currentMed.available_stock || 0) + stockChange,
              total_stock: (currentMed.total_stock || 0) + stockChange
            })
            .eq('id', selectedEditMedicine.medication_id);

          if (updateStockError) throw updateStockError;
        }
      }

      // Refresh data
      await fetchIntentMedicines();
      await fetchAllMedicines();

      // Reset modal
      setShowEditModal(false);
      setSelectedEditMedicine(null);
      setEditQuantity(1);

      alert('Medicine updated successfully!');
    } catch (error) {
      console.error('Error updating medicine:', error);
      alert('Error updating medicine. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (medicine: IntentMedicine) => {
    setSelectedEditMedicine(medicine);
    setEditQuantity(medicine.quantity);
    setShowEditModal(true);
  };

  const filteredMedicines = intentMedicines.filter(med =>
    med.medication_name.toLowerCase().includes(searchTerm.toLowerCase())
  ).filter(med => {
    // Apply type filter
    if (filterType === 'recent') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return new Date(med.created_at) >= oneWeekAgo;
    } else if (filterType === 'high-value') {
      return med.quantity * med.mrp > 1000;
    } else if (filterType === 'low-stock') {
      return med.quantity < 10;
    }
    return true;
  }).filter(med => {
    // Apply date range filter
    if (dateRange === 'today') {
      const today = new Date().toDateString();
      return new Date(med.created_at).toDateString() === today;
    } else if (dateRange === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return new Date(med.created_at) >= oneWeekAgo;
    } else if (dateRange === 'month') {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      return new Date(med.created_at) >= oneMonthAgo;
    }
    return true;
  });

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (value.trim()) {
      const results = searchAcrossAllSections(value);
      setSearchResults(results);
      setShowSearchResults(true);
    } else {
      setShowSearchResults(false);
      setSearchResults([]);
    }
  };

  useEffect(() => {
    loadAllMedicines();
    loadAllIntentMedicines();
  }, []);

  const getFilteredIntentMedicines = () => {
    if (!medicineSearchTerm.trim()) return [];
    return intentMedicines.filter(med =>
      med.medication_name.toLowerCase().includes(medicineSearchTerm.toLowerCase())
    );
  };

  const selectMedicineFromIntent = (medicine: IntentMedicine) => {
    setBuyMedicineData(prev => ({
      ...prev,
      name: medicine.medication_name,
      manufacturer: medicine.manufacturer || '',
      mrp: medicine.mrp
    }));
    setSelectedMedicineFromIntent(medicine);
    setMedicineSearchTerm(medicine.medication_name);
    setShowMedicineDropdown(false);
  };

  const getExpiringSoonCount = () => {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    return intentMedicines.filter(med => {
      if (!med.expiry_date) return false;
      const expiryDate = new Date(med.expiry_date);
      return expiryDate >= today && expiryDate <= thirtyDaysFromNow;
    }).length;
  };

  const getExpiredCount = () => {
    const today = new Date();
    return intentMedicines.filter(med => {
      if (!med.expiry_date) return false;
      const expiryDate = new Date(med.expiry_date);
      return expiryDate < today;
    }).length;
  };

  const clearMedicineSelection = () => {
    setSelectedMedicineFromIntent(null);
    setMedicineSearchTerm('');
    setBuyMedicineData(prev => ({
      ...prev,
      name: '',
      manufacturer: '',
      mrp: 0,
      category: ''
    }));
  };

  const isExpiringSoon = (expiryDate: string) => {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const expiry = new Date(expiryDate);
    return expiry >= new Date() && expiry <= thirtyDaysFromNow;
  };

  const openMedicineDetail = async (medicine: IntentMedicine) => {
    try {
      setLoadingMedicineDetail(true);
      setSelectedMedicineDetail(medicine);
      setShowMedicineDetail(true);

      // Load comprehensive medicine data using service
      const comprehensiveData = await getComprehensiveMedicineData(medicine.medication_id);
      setComprehensiveMedicineData(comprehensiveData);

      // Load batch statistics for all batches
      if (comprehensiveData?.batches) {
        const batchNumbers = comprehensiveData.batches.map((batch: any) => batch.batch_number).filter(Boolean);
        const statsPromises = batchNumbers.map(async (batchNumber: string) => {
          try {
            const stats = await getBatchStockStats(batchNumber);
            return { [batchNumber]: stats };
          } catch (e) {
            console.error('Failed to load batch stats for', batchNumber, e);
            return { [batchNumber]: { remainingUnits: 0, soldUnitsThisMonth: 0, purchasedUnitsThisMonth: 0 } };
          }
        });

        const statsResults = await Promise.all(statsPromises);
        const statsMap = statsResults.reduce((acc, curr) => ({ ...acc, ...curr }), {});
        setBatchStatsMap(statsMap);
      }
    } catch (error) {
      console.error('Error loading medicine details:', error);
      alert('Failed to load medicine details. Please try again.');
    } finally {
      setLoadingMedicineDetail(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 shadow-xl">
        <div className="max-w-full px-8 py-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-lg">
                  <Target className="w-9 h-9 text-white" />
                </div>
                <div className="flex items-center gap-4">
                <button
                  onClick={() => window.history.back()}
                  className="flex items-center gap-2 px-3 py-2 text-white hover:bg-white/20 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-4xl font-bold text-white tracking-tight leading-tight">Intent Medicine Management</h1>
                  <p className="text-purple-100 text-base mt-2">Streamlined medicine distribution across hospital departments</p>
                </div>
              </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4"> 
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBellNotifications(true)}
                  className="group relative px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-3"
                >
                  <Bell className="w-6 h-6 group-hover:animate-pulse transition-transform duration-300" />
                  Notifications
                  {zeroQuantityAlerts.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
                      {zeroQuantityAlerts.length}
                    </span>
                  )}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-600/20 to-red-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
                </button>
                <button
                  onClick={() => setShowReportsModal(true)}
                  className="group relative px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-3"
                >
                  <BarChart3 className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
                  Reports
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-600/20 to-indigo-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-full px-8 py-10 space-y-10">

      {/* Enhanced Filters Section */}
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-200/50 p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Filter className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Advanced Filters</h3>
              <p className="text-sm text-slate-500">Search and filter medicines across all departments</p>
            </div>
          </div>
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterType('all');
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-all duration-200 flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Clear Filters
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search medicines across all departments..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-200"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex gap-3">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="pl-10 pr-8 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/50 backdrop-blur-sm appearance-none cursor-pointer transition-all duration-200"
              >
                <option value="all">All Medicines</option>
                <option value="recent">Recently Added</option>
                <option value="high-value">High Value</option>
                <option value="low-stock">Low Stock</option>
              </select>
            </div>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="pl-10 pr-8 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/50 backdrop-blur-sm appearance-none cursor-pointer transition-all duration-200"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Intent Type Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex items-center justify-between">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {intentTypes.map((intent) => (
              <button
                key={intent.key}
                onClick={() => setSelectedIntentType(intent.key)}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${selectedIntentType === intent.key
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="inline mr-2">{intent.icon}</span>
                {intent.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-100/50 p-6 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Pill className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{intentMedicines.length}</p>
                <p className="text-sm font-medium text-slate-600">Medicines</p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-100/50 p-6 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">
                  {new Set(intentMedicines.map(med => med.batch_number)).size}
                </p>
                <p className="text-sm font-medium text-slate-600">Total Batches</p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-100/50 p-6 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">!</span>
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">
                  {intentMedicines.filter(med => med.quantity < 10).length}
                </p>
                <p className="text-sm font-medium text-slate-600">Low Stock</p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-100/50 p-6 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">⚠️</span>
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{getExpiringSoonCount()}</p>
                <p className="text-sm font-medium text-slate-600">Expiring Soon</p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-100/50 p-6 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">✗</span>
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{getExpiredCount()}</p>
                <p className="text-sm font-medium text-slate-600">Expired</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Results */}
      {showSearchResults && searchResults.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-600" />
              Search Results ({searchResults.length} medicines found)
            </h3>
            <button
              onClick={() => {
                setShowSearchResults(false);
                setSearchTerm('');
                setSearchResults([]);
              }}
              className="text-slate-500 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-3">
            {searchResults.map((result: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-medium text-slate-900">{result.name}</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.sections.map((section: string) => (
                        <span key={section} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {section.split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    Available in {result.sections.length} department{result.sections.length > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  {result.sections.map((section: string) => (
                    <button
                      key={section}
                      onClick={() => {
                        setSelectedIntentType(section);
                        setShowSearchResults(false);
                        setSearchTerm('');
                        setSearchResults([]);
                      }}
                      className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                    >
                      View in {section.split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced Medicines Table */}
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-200/50 overflow-hidden">
        <div className="p-6 border-b border-gray-200/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Pill className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Medicines in Department</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {selectedIntentType.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} • {filteredMedicines.length} items
                </p>
              </div>
            </div>
          </div>
        </div>

        {filteredMedicines.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500 text-lg font-medium mb-2">No medicines found</p>
            <p className="text-slate-400 text-sm mb-6">
              Click "Buy Medicine" to add medicines to inventory
            </p>
            <button
              onClick={() => setShowBuyMedicineModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
            >
              <Package className="w-5 h-5" />
              Buy Medicine
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Medicine Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Combination
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Dosage Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Manufacturer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Batch
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredMedicines.map((medicine, index) => (
                  <tr 
                    key={medicine.id} 
                    className={`hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 cursor-pointer transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                    onClick={() => openMedicineDetail(medicine)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center">
                          <Pill className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-slate-900">
                            {medicine.medication_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900 font-medium">
                        {medicine.combination || '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full">
                        {medicine.dosage_type || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">
                        {medicine.manufacturer || '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-slate-900 mr-2">
                          {medicine.quantity}
                        </div>
                        {medicine.quantity < 10 && (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                            Low
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900 font-mono">
                        {medicine.batch_number}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                        medicine.medicine_status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {medicine.medicine_status || 'active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          className="text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 px-2 py-1 rounded-md transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(medicine);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="text-green-600 hover:text-green-900 hover:bg-green-50 px-2 py-1 rounded-md transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            openMoveModal(medicine);
                          }}
                        >
                          Move
                        </button>
                        <button
                          className="text-red-600 hover:text-red-900 hover:bg-red-50 px-2 py-1 rounded-md transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteIntentMedicine(medicine);
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-slate-900">
                        ₹{medicine.mrp.toFixed(0)}
                      </div>
                      <div className="text-xs text-slate-500">
                        Total: ₹{(medicine.quantity * medicine.mrp).toFixed(0)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>

      {/* Move Modal */}
      {showMoveModal && selectedMoveMedicine && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <ArrowRightLeft className="w-6 h-6 text-green-600" />
                Move Medicine
              </h3>
              <button
                onClick={() => setShowMoveModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-slate-900 mb-2">
                  {selectedMoveMedicine.medication_name}
                </h4>
                <p className="text-sm text-slate-600">
                  Current quantity: {selectedMoveMedicine.quantity}
                </p>
                <p className="text-sm text-slate-600">
                  From: {selectedMoveMedicine.intent_type}
                </p>
                <p className="text-sm text-slate-600">
                  To: Updated Stock Medicine
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Quantity to Move
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedMoveMedicine.quantity}
                  value={moveQuantity}
                  onChange={(e) => setMoveQuantity(Math.min(selectedMoveMedicine.quantity, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter quantity to move"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Remaining quantity: {selectedMoveMedicine.quantity - moveQuantity}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowMoveModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={moveMedicine}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-medium rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Moving...
                    </div>
                  ) : (
                    'Move Medicine'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedEditMedicine && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Edit Medicine Quantity</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-slate-900 mb-2">
                  {selectedEditMedicine.medication_name}
                </h4>
                <p className="text-sm text-slate-600">
                  Current quantity: {selectedEditMedicine.quantity}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  New Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter quantity"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={editIntentMedicine}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </div>
                  ) : (
                    'Update'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Buy Medicine Modal */}
      {showBuyMedicineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-6 h-6 text-purple-600" />
                Buy Medicine
              </h3>
              <button
                onClick={() => setShowBuyMedicineModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Medicine Name *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={medicineSearchTerm}
                      onChange={(e) => {
                        setMedicineSearchTerm(e.target.value);
                        if (e.target.value !== buyMedicineData.name) {
                          setSelectedMedicineFromIntent(null);
                          setBuyMedicineData(prev => ({
                            ...prev,
                            name: e.target.value,
                            manufacturer: '',
                            mrp: 0,
                            category: ''
                          }));
                        }
                        setShowMedicineDropdown(e.target.value.trim() !== '');
                      }}
                      onFocus={() => setShowMedicineDropdown(medicineSearchTerm.trim() !== '')}
                      onBlur={() => {
                        // Delay hiding dropdown to allow clicks on options
                        setTimeout(() => setShowMedicineDropdown(false), 200);
                      }}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Search medicine in intent..."
                    />
                    {medicineSearchTerm && (
                      <button
                        type="button"
                        onClick={clearMedicineSelection}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    {showMedicineDropdown && getFilteredIntentMedicines().length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {getFilteredIntentMedicines().map((medicine) => (
                          <div
                            key={medicine.id}
                            onClick={() => selectMedicineFromIntent(medicine)}
                            className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0"
                          >
                            <div className="font-medium text-slate-900">{medicine.medication_name}</div>
                            <div className="text-sm text-slate-600">
                              {medicine.manufacturer || 'No manufacturer'} • ₹{medicine.mrp} • Qty: {medicine.quantity}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedMedicineFromIntent && (
                    <div className="mt-2 text-sm text-green-600 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Auto-filled from intent medicine
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Manufacturer *
                  </label>
                  <input
                    type="text"
                    value={buyMedicineData.manufacturer}
                    onChange={(e) => setBuyMedicineData(prev => ({ ...prev, manufacturer: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter manufacturer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Category
                </label>
                <select
                  value={buyMedicineData.category}
                  onChange={(e) => setBuyMedicineData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Select Category</option>
                  <option value="Antibiotics">Antibiotics</option>
                  <option value="Pain Killers">Pain Killers</option>
                  <option value="Vitamins">Vitamins</option>
                  <option value="Cardiac">Cardiac</option>
                  <option value="Diabetes">Diabetes</option>
                  <option value="Respiratory">Respiratory</option>
                  <option value="Gastrointestinal">Gastrointestinal</option>
                  <option value="Dermatology">Dermatology</option>
                  <option value="Neurology">Neurology</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={buyMedicineData.quantity}
                    onChange={(e) => setBuyMedicineData(prev => ({ ...prev, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter quantity"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    MRP (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={buyMedicineData.mrp}
                    onChange={(e) => setBuyMedicineData(prev => ({ ...prev, mrp: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter MRP"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Batch Number
                  </label>
                  <input
                    type="text"
                    value={buyMedicineData.batch_number}
                    onChange={(e) => setBuyMedicineData(prev => ({ ...prev, batch_number: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="AUTO (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={buyMedicineData.expiry_date}
                    onChange={(e) => setBuyMedicineData(prev => ({ ...prev, expiry_date: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reports Modal */}
      {showReportsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-7xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-blue-600" />
                Buy Medicine Reports
              </h3>
              <button
                onClick={() => setShowReportsModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-50 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-slate-900 mb-4">Medicine Inventory Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <Package className="w-8 h-8 text-green-600" />
                      <div>
                        <p className="text-2xl font-bold text-slate-900">{allMedicines.length}</p>
                        <p className="text-sm text-slate-600">Total Medicines</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <Package className="w-8 h-8 text-blue-600" />
                      <div>
                        <p className="text-2xl font-bold text-slate-900">
                          {allMedicines.reduce((sum, med) => sum + med.available_stock, 0)}
                        </p>
                        <p className="text-sm text-slate-600">Total Stock</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <Package className="w-8 h-8 text-purple-600" />
                      <div>
                        <p className="text-2xl font-bold text-slate-900">
                          ₹{allMedicines.reduce((sum, med) => sum + (med.available_stock * med.mrp), 0).toLocaleString()}
                        </p>
                        <p className="text-sm text-slate-600">Total Value</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                  <h4 className="text-lg font-semibold text-slate-900">Moved Medicines History</h4>
                  <p className="text-sm text-slate-600 mt-1">Recent medicine movements and transfers</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Medicine</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">From</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">To</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Quantity</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {movedMedicines.slice(0, 10).map((move) => (
                        <tr key={move.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                            {move.medicine_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {move.moved_from}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {move.moved_to}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                            {move.moved_quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {new Date(move.moved_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {move.reason}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {movedMedicines.length === 0 && (
                  <div className="p-12 text-center">
                    <ArrowRightLeft className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-500">No medicine movements recorded</p>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Medicine Detail Modal */}
      {showMedicineDetail && selectedMedicineDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-7xl w-full max-h-[95vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6 shadow-lg">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-3xl font-bold text-white tracking-tight">{selectedMedicineDetail.medication_name}</h2>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold shadow-sm bg-purple-600 text-white">
                      {selectedMedicineDetail.intent_type.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </span>
                  </div>

                  {/* Medicine Info Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm mb-4">
                    <div>
                      <div className="text-slate-300 text-xs font-medium mb-1">Batch</div>
                      <div className="text-white font-semibold">{selectedMedicineDetail.batch_number}</div>
                    </div>
                    <div>
                      <div className="text-slate-300 text-xs font-medium mb-1">Dosage Type</div>
                      <div className="text-white font-semibold">{selectedMedicineDetail.dosage_type || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-slate-300 text-xs font-medium mb-1">Manufacturer</div>
                      <div className="text-white font-semibold">{selectedMedicineDetail.manufacturer || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-slate-300 text-xs font-medium mb-1">Combination</div>
                      <div className="text-white font-semibold">{selectedMedicineDetail.combination || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-slate-300 text-xs font-medium mb-1">Dept. Stock</div>
                      <div className="text-white font-semibold">{selectedMedicineDetail.quantity}</div>
                    </div>
                    <div>
                      <div className="text-slate-300 text-xs font-medium mb-1">MRP</div>
                      <div className="text-white font-semibold">₹{selectedMedicineDetail.mrp.toFixed(2)}</div>
                    </div>
                  </div>

                  {/* Stock Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-20">
                      <div className="text-slate-300 text-xs font-medium mb-2">Department Stock</div>
                      <div className="text-2xl font-bold text-white">{selectedMedicineDetail.quantity}</div>
                      <div className="text-slate-300 text-xs mt-1">units available</div>
                    </div>
                    <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-20">
                      <div className="text-slate-300 text-xs font-medium mb-2">Total Batches</div>
                      <div className="text-2xl font-bold text-blue-300">{comprehensiveMedicineData?.batches?.length || 0}</div>
                      <div className="text-slate-300 text-xs mt-1">in inventory</div>
                    </div>
                    <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-20">
                      <div className="text-slate-300 text-xs font-medium mb-2">Total Value</div>
                      <div className="text-2xl font-bold text-green-300">₹{(selectedMedicineDetail.quantity * selectedMedicineDetail.mrp).toFixed(0)}</div>
                      <div className="text-slate-300 text-xs mt-1">department value</div>
                    </div>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => {
                    setShowMedicineDetail(false)
                    setSelectedMedicineDetail(null)
                    setComprehensiveMedicineData(null)
                    setBatchStatsMap({})
                  }}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors ml-4"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(95vh-200px)]">
              {loadingMedicineDetail ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading medicine details...</p>
                </div>
              ) : !comprehensiveMedicineData?.batches || comprehensiveMedicineData.batches.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg mb-2">No batch information available</p>
                  <p className="text-sm">This medicine might not have detailed inventory records</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    Batch-wise Inventory Details
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {comprehensiveMedicineData.batches.map((batch: any) => {
                      const isExpired = new Date(batch.expiry_date) < new Date()
                      const expSoon = isExpiringSoon(batch.expiry_date)
                      const batchStats = batchStatsMap[batch.batch_number]
                      const remaining = batch.current_quantity || batch.quantity || 0

                      return (
                        <div key={batch.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                          {/* Batch Header */}
                          <div className="p-4 border-b border-gray-100">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-lg font-semibold text-gray-900">{batch.batch_number}</h4>
                                <p className="text-sm text-gray-500">Supplier: {batch.supplier_name || batch.supplier || 'N/A'}</p>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                isExpired ? 'bg-red-100 text-red-800' :
                                expSoon ? 'bg-orange-100 text-orange-800' :
                                remaining <= 10 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {isExpired ? 'Expired' : expSoon ? 'Expiring Soon' : remaining <= 10 ? 'Low Stock' : 'Active'}
                              </span>
                            </div>
                          </div>

                          {/* Batch Details */}
                          <div className="p-4 space-y-4">
                            {/* Quantity */}
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="text-xs text-gray-500 uppercase tracking-wide">Current Stock</div>
                              <div className="text-xl font-bold text-gray-900">{remaining}</div>
                              <div className="text-xs text-gray-500">
                                Received: {batch.received_quantity || batch.original_quantity || 'N/A'}
                              </div>
                              {batchStats && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Sold this month: {batchStats.soldUnitsThisMonth || 0}
                                </div>
                              )}
                            </div>

                            {/* Dates */}
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Manufacturing:</span>
                                <span className="text-sm font-medium">{new Date(batch.manufacturing_date).toLocaleDateString()}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Expiry:</span>
                                <span className={`text-sm font-medium ${isExpired ? 'text-red-600' : expSoon ? 'text-orange-600' : 'text-gray-900'}`}>
                                  {new Date(batch.expiry_date).toLocaleDateString()}
                                </span>
                              </div>
                            </div>

                            {/* Pricing */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                                <div className="text-xs text-blue-600 uppercase tracking-wide font-medium">Purchase Price</div>
                                <div className="text-sm font-semibold text-blue-700">₹{Number(batch.purchase_price || 0).toFixed(2)}</div>
                              </div>
                              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                                <div className="text-xs text-green-600 uppercase tracking-wide font-medium">Selling Price</div>
                                <div className="text-sm font-semibold text-green-700">₹{Number(batch.selling_price || 0).toFixed(2)}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bell Notifications Modal */}
      {showBellNotifications && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Bell className="w-6 h-6 text-orange-600" />
                Notifications
              </h3>
              <button
                onClick={() => setShowBellNotifications(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {zeroQuantityAlerts.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-red-900 mb-4 flex items-center gap-2">
                    <span className="text-red-600">⚠️</span>
                    Zero Quantity Medicines
                  </h4>
                  <p className="text-sm text-red-700 mb-4">
                    The following medicines have reached zero quantity and have been moved to "Updated Stock Medicine":
                  </p>
                  <div className="space-y-3">
                    {zeroQuantityAlerts.map((medicine, index) => (
                      <div key={medicine.id} className="bg-white rounded-lg p-4 border border-red-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="font-medium text-slate-900">{medicine.medication_name}</h5>
                            <p className="text-sm text-slate-600">
                              {medicine.manufacturer || 'Unknown manufacturer'} • Batch: {medicine.batch_number}
                            </p>
                            <p className="text-sm text-slate-600">
                              Originally from: {medicine.intent_type}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Out of Stock
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {zeroQuantityAlerts.length === 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-green-900 mb-2">All Good!</h4>
                  <p className="text-sm text-green-700">
                    No medicines with zero quantity. All departments have sufficient stock.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function IntentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <IntentPageInner />
    </Suspense>
  );
}
