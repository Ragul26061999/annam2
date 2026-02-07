'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { Target, Plus, Search, X, Pill, Package, ArrowRight, Filter, Calendar } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
}

function IntentPageInner() {
  const [selectedIntentType, setSelectedIntentType] = useState('injection room');
  const [intentMedicines, setIntentMedicines] = useState<IntentMedicine[]>([]);
  const [allIntentMedicines, setAllIntentMedicines] = useState<IntentMedicine[]>([]);
  const [allMedicines, setAllMedicines] = useState<Medication[]>([]);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMedicine, setSelectedMedicine] = useState<Medication | null>(null);
  const [transferQuantity, setTransferQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Load all medicines (for transfer modal)
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

  const intentTypes = [
    { key: 'injection room', label: 'Injection Room', icon: '💉' },
    { key: 'icu', label: 'ICU', icon: '🏥' },
    { key: 'causath', label: 'Causath', icon: '⚕️' },
    { key: 'nicu', label: 'NICU', icon: '👶' },
    { key: 'labour word', label: 'Labour Word', icon: '🤰' },
    { key: 'miones', label: 'Miones', icon: '🔬' },
    { key: 'major ot', label: 'Major OT', icon: '🔪' }
  ];

  // Fetch intent medicines for selected type
  useEffect(() => {
    fetchIntentMedicines();
  }, [selectedIntentType]);

  // Fetch all available medicines
  useEffect(() => {
    fetchAllMedicines();
  }, []);

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

  const transferMedicine = async () => {
    if (!selectedMedicine || transferQuantity <= 0) return;

    if (transferQuantity > selectedMedicine.available_stock) {
      alert('Insufficient stock available!');
      return;
    }

    setLoading(true);
    try {
      // Add to intent_medicines table
      const { error: insertError } = await supabase
        .from('intent_medicines')
        .insert({
          intent_type: selectedIntentType,
          medication_id: selectedMedicine.id,
          medication_name: selectedMedicine.name,
          batch_number: 'AUTO',
          quantity: transferQuantity,
          mrp: selectedMedicine.mrp
        });

      if (insertError) throw insertError;

      // Update medication stock
      const { error: updateError } = await supabase
        .from('medications')
        .update({
          available_stock: selectedMedicine.available_stock - transferQuantity,
          total_stock: selectedMedicine.total_stock - transferQuantity
        })
        .eq('id', selectedMedicine.id);

      if (updateError) throw updateError;

      // Refresh data
      await fetchIntentMedicines();
      await fetchAllMedicines();

      // Reset modal
      setShowTransferModal(false);
      setSelectedMedicine(null);
      setTransferQuantity(1);
      setSearchTerm('');

      alert('Medicine transferred successfully!');
    } catch (error) {
      console.error('Error transferring medicine:', error);
      alert('Error transferring medicine. Please try again.');
    } finally {
      setLoading(false);
    }
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
                <div>
                  <h1 className="text-4xl font-bold text-white tracking-tight leading-tight">Intent Medicine Management</h1>
                  <p className="text-purple-100 text-base mt-2">Streamlined medicine distribution across hospital departments</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-3 px-5 py-3 bg-white/10 backdrop-blur-sm rounded-2xl text-white shadow-lg">
                <span className="inline-flex items-center rounded-full bg-purple-500/20 px-4 py-2 text-sm font-medium text-purple-100 border border-purple-400/30">
                  <Target className="w-4 h-4 mr-2" />
                  {selectedIntentType.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </span>
              </div>
              <button
                onClick={() => setShowTransferModal(true)}
                className="group relative px-8 py-4 bg-gradient-to-r from-white to-white/90 text-purple-700 font-bold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-3 border border-white/30"
              >
                <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                Transfer Medicine
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-600/10 to-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
              </button>
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
            {searchResults.map((result: any, index) => (
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
              Click "Transfer Medicine" to add medicines to this department
            </p>
            <button
              onClick={() => setShowTransferModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
            >
              <Plus className="w-5 h-5" />
              Transfer Medicine
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
                  <tr key={medicine.id} className={`hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
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
                          onClick={() => {
                            console.log('Edit medicine:', medicine.id);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="text-red-600 hover:text-red-900 hover:bg-red-50 px-2 py-1 rounded-md transition-colors"
                          onClick={() => {
                            if (confirm('Are you sure you want to remove this medicine?')) {
                              console.log('Remove medicine:', medicine.id);
                            }
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-slate-900">
                        ₹{medicine.mrp.toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-500">
                        Total: ₹{(medicine.quantity * medicine.mrp).toFixed(2)}
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
