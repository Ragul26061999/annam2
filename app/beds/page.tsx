'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bed, 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  UserPlus, 
  UserMinus, 
  CheckCircle,
  TrendingUp,
  Users,
  Building,
  MoreVertical,
  Calendar,
  Activity,
  Heart,
  ArrowRightLeft,
  AlertTriangle,
  X,
  Trash2,
  Edit
} from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { deleteBed } from '@/src/lib/bedAllocationService';
import BedTransferModal from '@/src/components/BedTransferModal';
import AddBedModal from '@/src/components/AddBedModal';
import EditBedModal from '@/src/components/EditBedModal';

interface BedData {
  id: string;
  bed_number: string;
  room_number: string;
  bed_type: string;
  floor_number: number;
  status: string;
  features: string[];
  daily_rate: string;
  department_name: string;
  department_id: string;
  patient_id: string | null;
  patient_name: string | null;
  patient_hospital_id: string | null;
  admission_date: string | null;
  discharge_date: string | null;
}

interface BedStats {
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  maintenanceBeds: number;
  icuBeds: number;
  generalBeds: number;
  occupancyRate: number;
}

export default function BedsPage() {
  const [beds, setBeds] = useState<BedData[]>([]);
  const [stats, setStats] = useState<BedStats>({
    totalBeds: 0,
    occupiedBeds: 0,
    availableBeds: 0,
    maintenanceBeds: 0,
    icuBeds: 0,
    generalBeds: 0,
    occupancyRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // New state for search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWard, setSelectedWard] = useState('All Wards');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAddBedModal, setShowAddBedModal] = useState(false);
  const [showEditBedModal, setShowEditBedModal] = useState(false);
  const [selectedBed, setSelectedBed] = useState<BedData | null>(null);
  const [viewMode, setViewMode] = useState<'beds' | 'rooms'>('beds');

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [bedToDelete, setBedToDelete] = useState<BedData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Dropdown state
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const fetchBedData = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, get bed statistics
      const { data: bedStats, error: statsError } = await supabase
        .from('beds')
        .select('status, bed_type');

      if (statsError) {
        console.error('Error fetching bed stats:', statsError);
        throw new Error(`Failed to fetch bed statistics: ${statsError.message}`);
      }

      // Calculate statistics with proper null checks
      const totalBeds = bedStats?.length || 0;
      const occupiedBeds = bedStats?.filter((bed: { status?: string | null; bed_type?: string | null }) => bed?.status === 'occupied').length || 0;
      const availableBeds = bedStats?.filter((bed: { status?: string | null; bed_type?: string | null }) => bed?.status === 'available').length || 0;
      const maintenanceBeds = bedStats?.filter((bed: { status?: string | null; bed_type?: string | null }) => bed?.status === 'maintenance').length || 0;
      const icuBeds = bedStats?.filter((bed: { status?: string | null; bed_type?: string | null }) => bed?.bed_type === 'icu').length || 0;
      const generalBeds = bedStats?.filter((bed: { status?: string | null; bed_type?: string | null }) => bed?.bed_type === 'general').length || 0;
      const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

      setStats({
        totalBeds,
        occupiedBeds,
        availableBeds,
        maintenanceBeds,
        icuBeds,
        generalBeds,
        occupancyRate
      });

      // Get detailed bed data with patient information
      const { data: bedData, error: bedError } = await supabase
        .from('beds')
        .select(`
          *,
          departments(name),
          bed_allocations!left(
            patient_id,
            admission_date,
            discharge_date,
            status,
            patients(
              id,
              name,
              patient_id
            )
          )
        `);

      if (bedError) {
        console.error('Error fetching bed data:', bedError);
        throw new Error(`Failed to fetch bed data: ${bedError.message}`);
      }

      // Transform the data with comprehensive null checks
      const transformedBeds: BedData[] = bedData?.map((bed: any) => {
        // Safely handle bed_allocations array
        const allocations = Array.isArray(bed.bed_allocations) ? bed.bed_allocations : [];
        
        // Find active allocation with null checks
        const activeAllocation = allocations.find((allocation: any) => 
          allocation && allocation.status === 'active'
        );
        
        // Fix inconsistent bed status - if bed shows occupied but has no active allocation, mark as available
        const correctedStatus = (bed?.status === 'occupied' && !activeAllocation) ? 'available' : (bed?.status || 'available');
        
        return {
          id: bed?.id || '',
          bed_number: bed?.bed_number || '',
          room_number: bed?.room_number || '',
          bed_type: bed?.bed_type || 'general',
          floor_number: bed?.floor_number || 1,
          status: correctedStatus,
          features: Array.isArray(bed?.features) ? bed.features : [],
          daily_rate: bed?.daily_rate?.toString() || '0',
          department_name: bed?.departments?.name || 'Unknown',
          department_id: bed?.department_id || '',
          patient_id: activeAllocation?.patients?.id || null,
          patient_name: activeAllocation?.patients?.name || null,
          patient_hospital_id: activeAllocation?.patients?.patient_id || null,
          admission_date: activeAllocation?.admission_date || null,
          discharge_date: activeAllocation?.discharge_date || null,
        };
      }) || [];

      setBeds(transformedBeds);
    } catch (error) {
      console.error('Error fetching bed data:', error);
      let errorMessage = 'Unknown error occurred';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error);
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      setError(`Failed to load bed data: ${errorMessage}`);
      
      // Set empty data on error to prevent undefined state
      setBeds([]);
      setStats({
        totalBeds: 0,
        occupiedBeds: 0,
        availableBeds: 0,
        maintenanceBeds: 0,
        icuBeds: 0,
        generalBeds: 0,
        occupancyRate: 0
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBedData();
  }, []);

  // Filter beds based on search and filter criteria
  const filteredBeds = beds.filter(bed => {
    const matchesSearch = searchTerm === '' || 
      bed.bed_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bed.department_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (bed.patient_name && bed.patient_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesWard = selectedWard === 'All Wards' || 
      bed.department_name.toLowerCase().includes(selectedWard.toLowerCase());
    
    const matchesStatus = selectedStatus === 'All Status' || 
      bed.status.toLowerCase() === selectedStatus.toLowerCase();
    
    return matchesSearch && matchesWard && matchesStatus;
  });

  const handleAssignBed = (bed: BedData) => {
    setSelectedBed(bed);
    setShowAssignModal(true);
  };

  const handleDischargeBed = (bed: BedData) => {
    setSelectedBed(bed);
    setShowDischargeModal(true);
  };

  const handleTransferBed = (bed: BedData) => {
    setSelectedBed(bed);
    setShowTransferModal(true);
  };

  const handleEditBed = (bed: BedData) => {
    setSelectedBed(bed);
    setShowEditBedModal(true);
  };

  const handleDeleteBed = (bed: BedData) => {
    setBedToDelete(bed);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!bedToDelete) return;

    setIsDeleting(true);
    try {
      await deleteBed(bedToDelete.id);
      await fetchBedData();
      alert(`Bed ${bedToDelete.bed_number} has been permanently deleted from the system.`);
    } catch (error) {
      console.error('Error deleting bed:', error);
      alert('Failed to delete bed. Please check if the bed has active patient allocation and try again.');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
      setBedToDelete(null);
    }
  };

  const toggleDropdown = (bedId: string) => {
    setOpenDropdownId(openDropdownId === bedId ? null : bedId);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setOpenDropdownId(null);
      }
    };

    if (openDropdownId) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdownId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading bed data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md">
            <p className="text-red-600 mb-4">{error}</p>
            <button 
              onClick={fetchBedData}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bed Management</h1>
          <p className="text-gray-600 mt-1">Monitor and manage hospital bed allocations</p>
        </div>
        <button 
          onClick={() => setShowAddBedModal(true)}
          className="mt-4 sm:mt-0 bg-orange-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-orange-700 transition-colors flex items-center"
        >
          <Plus size={16} className="mr-2" />
          Add New Bed
        </button>
      </div>

      {/* View Mode Tabs */}
      <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-100 inline-flex">
        <button
          onClick={() => setViewMode('beds')}
          className={`px-6 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
            viewMode === 'beds'
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-200'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Bed size={16} />
            View Beds
          </div>
        </button>
        <button
          onClick={() => setViewMode('rooms')}
          className={`px-6 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
            viewMode === 'rooms'
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-200'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Building size={16} />
            View Rooms
          </div>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Beds</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalBeds}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Bed className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex items-center mt-4 text-sm">
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600 font-medium">+2.5%</span>
            <span className="text-gray-500 ml-1">vs last month</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Occupied</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.occupiedBeds}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-xl flex items-center justify-center">
              <Users className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex items-center mt-4 text-sm">
            <span className="text-red-600 font-medium">{stats.occupancyRate}%</span>
            <span className="text-gray-500 ml-1">occupancy rate</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Available</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.availableBeds}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex items-center mt-4 text-sm">
            <span className="text-green-600 font-medium">{Math.round((stats.availableBeds / stats.totalBeds) * 100)}%</span>
            <span className="text-gray-500 ml-1">availability</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Maintenance</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.maintenanceBeds}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center">
              <Building className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex items-center mt-4 text-sm">
            <Activity className="h-4 w-4 text-yellow-500 mr-1" />
            <span className="text-yellow-600 font-medium">Under repair</span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search beds by number, ward, or patient..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div className="flex gap-2">
            <button className="flex items-center px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <Filter size={16} className="mr-2" />
              Filter
            </button>
            <select 
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option>All Wards</option>
              <option>ICU</option>
              <option>General Ward</option>
              <option>Emergency</option>
              <option>Maternity</option>
              <option>Pediatrics</option>
            </select>
            <select 
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option>All Status</option>
              <option>Occupied</option>
              <option>Available</option>
              <option>Maintenance</option>
              <option>Cleaning</option>
            </select>
          </div>
        </div>
      </div>

      {/* Beds Grid - Dynamic rendering based on actual data */}
      {viewMode === 'beds' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredBeds.map((bed) => (
          <div key={bed.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className={`w-12 h-12 ${getBedGradient(bed.bed_type)} rounded-xl flex items-center justify-center text-white font-bold text-sm`}>
                  {bed.bed_number}
                </div>
                <div className="ml-3">
                  <h3 className="font-semibold text-gray-900">{bed.bed_type.charAt(0).toUpperCase() + bed.bed_type.slice(1)} Bed {bed.bed_number}</h3>
                  <p className="text-sm text-gray-500">{bed.department_name} • Room {bed.room_number}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getBedStatusColor(bed.status)}`}>
                  {bed.status.charAt(0).toUpperCase() + bed.status.slice(1)}
                </span>
                <div className="dropdown-container relative">
                  <button 
                    onClick={() => toggleDropdown(bed.id)}
                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <MoreVertical size={16} className="text-gray-500" />
                  </button>
                  
                  {openDropdownId === bed.id && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 dropdown-container">
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setSelectedBed(bed);
                            setShowAssignModal(true);
                            setOpenDropdownId(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                        >
                          <UserPlus size={14} />
                          Assign Patient
                        </button>
                        <button
                          onClick={() => {
                            handleEditBed(bed);
                            setOpenDropdownId(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                        >
                          <Edit size={14} />
                          Edit Bed
                        </button>
                        <button
                          onClick={() => {
                            handleTransferBed(bed);
                            setOpenDropdownId(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                          disabled={bed.status !== 'occupied'}
                        >
                          <ArrowRightLeft size={14} />
                          Transfer Patient
                        </button>
                        <button
                          onClick={() => {
                            handleDischargeBed(bed);
                            setOpenDropdownId(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                          disabled={bed.status !== 'occupied'}
                        >
                          <UserMinus size={14} />
                          Discharge Patient
                        </button>
                        <div className="border-t border-gray-200 my-1"></div>
                        <button
                          onClick={() => {
                            handleDeleteBed(bed);
                            setOpenDropdownId(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          disabled={bed.status !== 'available'}
                        >
                          <Trash2 size={14} />
                          Delete Bed
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {bed.status === 'occupied' && bed.patient_name ? (
              // Occupied bed with patient info
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                      {getPatientInitials(bed.patient_name)}
                    </div>
                    <div className="ml-2">
                      <p className="font-medium text-gray-900 text-sm">{bed.patient_name}</p>
                      <p className="text-xs text-gray-500">{bed.patient_hospital_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-green-600">Admitted</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Admitted:</span>
                  <span className="font-medium text-gray-900">{formatDate(bed.admission_date || '')}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Daily Rate:</span>
                  <span className="font-medium text-gray-900">₹{bed.daily_rate}</span>
                </div>
              </div>
            ) : (
              // Available bed
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <CheckCircle className="h-12 w-12 text-blue-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-900">
                      {bed.status === 'available' ? 'Ready for Admission' : 'Under Maintenance'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {bed.status === 'available' ? 'Cleaned and sanitized' : 'Maintenance in progress'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Daily Rate:</span>
                  <span className="font-medium text-gray-900">₹{bed.daily_rate}</span>
                </div>
              </div>
            )}

            <div className={`${getBedStatusBg(bed.status)} rounded-xl p-3 mb-4`}>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-xs font-medium ${getBedStatusTextColor(bed.status)}`}>Bed Status</p>
                <span className={`text-xs ${getBedStatusAccentColor(bed.status)}`}>
                  {bed.status.charAt(0).toUpperCase() + bed.status.slice(1)}
                </span>
              </div>
              <p className={`text-sm ${getBedStatusDarkColor(bed.status)}`}>
                {bed.status === 'occupied' ? 'Patient currently admitted' : 
                 bed.status === 'available' ? 'Available for immediate assignment' : 
                 'Under maintenance - not available'}
              </p>
            </div>

            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center bg-orange-50 text-orange-600 py-2 px-3 rounded-xl text-sm font-medium hover:bg-orange-100 transition-colors">
                <Eye size={14} className="mr-1" />
                View
              </button>
              {bed.status === 'occupied' ? (
                <>
                  <button 
                    onClick={() => handleTransferBed(bed)}
                    className="flex-1 flex items-center justify-center bg-purple-50 text-purple-700 py-2 px-3 rounded-xl text-sm font-medium hover:bg-purple-100 transition-colors">
                    <ArrowRightLeft size={14} className="mr-1" />
                    Transfer
                  </button>
                  <button 
                    onClick={() => handleDischargeBed(bed)}
                    className="flex-1 flex items-center justify-center bg-gray-50 text-gray-700 py-2 px-3 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors">
                    <UserMinus size={14} className="mr-1" />
                    Discharge
                  </button>
                </>
              ) : bed.status === 'available' ? (
                <button 
                  onClick={() => handleAssignBed(bed)}
                  className="flex-1 flex items-center justify-center bg-blue-50 text-blue-700 py-2 px-3 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors">
                  <UserPlus size={14} className="mr-1" />
                  Assign
                </button>
              ) : (
                <button className="flex-1 flex items-center justify-center bg-yellow-50 text-yellow-700 py-2 px-3 rounded-xl text-sm font-medium hover:bg-yellow-100 transition-colors">
                  <Calendar size={14} className="mr-1" />
                  Schedule
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      ) : (
        /* Rooms View */
        <div className="space-y-6">
          {(() => {
            // Group beds by room
            const roomsMap = filteredBeds.reduce((acc, bed) => {
              const roomKey = `${bed.room_number} (Floor ${bed.floor_number})`;
              if (!acc[roomKey]) {
                acc[roomKey] = [];
              }
              acc[roomKey].push(bed);
              return acc;
            }, {} as Record<string, BedData[]>);

            return Object.entries(roomsMap).map(([roomKey, roomBeds]) => (
              <div key={roomKey} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-white p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{roomKey}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {roomBeds.length} bed{roomBeds.length !== 1 ? 's' : ''} • {roomBeds[0]?.department_name || 'Unknown Department'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">
                          {roomBeds.filter(b => b.status === 'available').length}
                        </p>
                        <p className="text-xs text-gray-500">Available</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-red-600">
                          {roomBeds.filter(b => b.status === 'occupied').length}
                        </p>
                        <p className="text-xs text-gray-500">Occupied</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {roomBeds.map((bed) => (
                      <div key={bed.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 ${getBedGradient(bed.bed_type)} rounded-lg flex items-center justify-center text-white font-bold text-xs`}>
                              {bed.bed_number}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">{bed.bed_type}</p>
                              <p className="text-xs text-gray-500">Bed {bed.bed_number}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getBedStatusColor(bed.status)}`}>
                            {bed.status.charAt(0).toUpperCase() + bed.status.slice(1)}
                          </span>
                        </div>
                        
                        {bed.status === 'occupied' && bed.patient_name ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                {bed.patient_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{bed.patient_name}</p>
                                <p className="text-xs text-gray-500">{bed.patient_hospital_id}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleTransferBed(bed)}
                                className="flex-1 flex items-center justify-center bg-purple-50 text-purple-700 py-1 px-2 rounded-lg text-xs font-medium hover:bg-purple-100 transition-colors"
                              >
                                Transfer
                              </button>
                              <button 
                                onClick={() => handleDischargeBed(bed)}
                                className="flex-1 flex items-center justify-center bg-gray-50 text-gray-700 py-1 px-2 rounded-lg text-xs font-medium hover:bg-gray-100 transition-colors"
                              >
                                Discharge
                              </button>
                            </div>
                          </div>
                        ) : bed.status === 'available' ? (
                          <button 
                            onClick={() => handleAssignBed(bed)}
                            className="w-full flex items-center justify-center bg-blue-50 text-blue-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                          >
                            Assign Patient
                          </button>
                        ) : (
                          <div className="flex items-center justify-center py-2">
                            <span className="text-xs text-gray-500">
                              {bed.status === 'maintenance' ? 'Under Maintenance' : 'Cleaning in Progress'}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ));
          })()}
        </div>
      )}

      {/* Load More */}
      <div className="flex justify-center">
        <button className="bg-white border border-gray-200 text-gray-700 px-6 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors">
          Load More Beds
        </button>
      </div>

      {/* Bed Transfer Modal */}
      {showTransferModal && selectedBed && selectedBed.patient_name && (
        <BedTransferModal
          isOpen={showTransferModal}
          onClose={() => {
            setShowTransferModal(false);
            setSelectedBed(null);
          }}
          currentBed={{
            id: selectedBed.id,
            bed_number: selectedBed.bed_number,
            room_number: selectedBed.room_number,
            bed_type: selectedBed.bed_type,
            patient_name: selectedBed.patient_name,
            patient_hospital_id: selectedBed.patient_hospital_id || 'N/A'
          }}
          onSuccess={() => {
            fetchBedData();
            setShowTransferModal(false);
            setSelectedBed(null);
          }}
        />
      )}

      {/* Add Bed Modal */}
      <AddBedModal
        isOpen={showAddBedModal}
        onClose={() => {
          setShowAddBedModal(false);
        }}
        onSuccess={() => {
          fetchBedData();
          setShowAddBedModal(false);
        }}
      />

      {/* Edit Bed Modal */}
      {selectedBed && (
        <EditBedModal
          isOpen={showEditBedModal}
          onClose={() => {
            setShowEditBedModal(false);
            setSelectedBed(null);
          }}
          onSuccess={() => {
            fetchBedData();
            setShowEditBedModal(false);
            setSelectedBed(null);
          }}
          bed={{
            id: selectedBed.id,
            bed_number: selectedBed.bed_number,
            room_number: selectedBed.room_number,
            floor_number: selectedBed.floor_number,
            bed_type: selectedBed.bed_type,
            daily_rate: parseFloat(selectedBed.daily_rate),
            department_id: selectedBed.department_id || '',
            features: selectedBed.features,
            status: selectedBed.status
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && bedToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Delete Bed</h2>
              </div>
              <button
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setBedToDelete(null);
                }}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={isDeleting}
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete this bed? <strong className="text-red-600">This action cannot be undone and will permanently remove the bed from the system.</strong>
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-medium text-red-900 mb-1">Bed Details:</p>
                <p className="text-sm text-red-800">
                  <strong>Bed Number:</strong> {bedToDelete.bed_number}
                </p>
                <p className="text-sm text-red-800">
                  <strong>Room:</strong> {bedToDelete.room_number}
                </p>
                <p className="text-sm text-red-800">
                  <strong>Type:</strong> {bedToDelete.bed_type}
                </p>
                <p className="text-sm text-red-800">
                  <strong>Status:</strong> {bedToDelete.status}
                </p>
              </div>
              <div className="mt-3 bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                <p className="text-xs text-yellow-800 flex items-center gap-2">
                  <AlertTriangle size={14} />
                  <strong>Warning:</strong> Only beds without active patient allocations can be deleted.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setBedToDelete(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete Bed
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const getBedGradient = (bedType: string) => {
  switch (bedType.toLowerCase()) {
    case 'icu':
      return 'bg-gradient-to-r from-red-500 to-red-600';
    case 'general':
      return 'bg-gradient-to-r from-blue-500 to-blue-600';
    case 'emergency':
      return 'bg-gradient-to-r from-orange-500 to-orange-600';
    case 'maternity':
      return 'bg-gradient-to-r from-pink-500 to-pink-600';
    case 'pediatrics':
      return 'bg-gradient-to-r from-purple-500 to-purple-600';
    default:
      return 'bg-gradient-to-r from-gray-500 to-gray-600';
  }
};

const getBedStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'occupied':
      return 'bg-red-100 text-red-800';
    case 'available':
      return 'bg-green-100 text-green-800';
    case 'maintenance':
      return 'bg-yellow-100 text-yellow-800';
    case 'cleaning':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getBedStatusBg = (status: string) => {
  switch (status.toLowerCase()) {
    case 'occupied':
      return 'bg-red-50';
    case 'available':
      return 'bg-green-50';
    case 'maintenance':
      return 'bg-yellow-50';
    case 'cleaning':
      return 'bg-blue-50';
    default:
      return 'bg-gray-50';
  }
};

const getBedStatusTextColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'occupied':
      return 'text-red-600';
    case 'available':
      return 'text-green-600';
    case 'maintenance':
      return 'text-yellow-600';
    case 'cleaning':
      return 'text-blue-600';
    default:
      return 'text-gray-600';
  }
};

const getBedStatusAccentColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'occupied':
      return 'text-red-500';
    case 'available':
      return 'text-green-500';
    case 'maintenance':
      return 'text-yellow-500';
    case 'cleaning':
      return 'text-blue-500';
    default:
      return 'text-gray-500';
  }
};

const getBedStatusDarkColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'occupied':
      return 'text-red-700';
    case 'available':
      return 'text-green-700';
    case 'maintenance':
      return 'text-yellow-700';
    case 'cleaning':
      return 'text-blue-700';
    default:
      return 'text-gray-700';
  }
};

const getPatientInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  
  return date.toLocaleDateString();
};