import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, ArrowUpRight, Clock, AlertTriangle, Bed as BedIcon, Loader2 } from 'lucide-react';
import { getAllBeds, getBedStats, allocateBed, dischargeBed, transferBed, BedStats, Bed } from '../lib/bedAllocationService';
import { getAllPatients } from '../lib/patientService';
import { getAllDoctorsSimple } from '../lib/doctorService';

const BedManagement: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [bedStats, setBedStats] = useState<BedStats>({
    total: 0,
    available: 0,
    occupied: 0,
    maintenance: 0,
    reserved: 0,
    occupancyRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null);

  useEffect(() => {
    loadBedData();
    loadPatients();
    loadDoctors();
  }, []);

  const loadBedData = async () => {
    try {
      setLoading(true);
      const [bedsData, statsData] = await Promise.all([
        getAllBeds({ limit: 100 }),
        getBedStats()
      ]);
      setBeds(bedsData.beds);
      setBedStats(statsData);
      setError(null);
    } catch (err) {
      console.error('Error loading bed data:', err);
      setError('Failed to load bed data');
    } finally {
      setLoading(false);
    }
  };

  const loadPatients = async () => {
    try {
      const patientsData = await getAllPatients({ limit: 100 });
      setPatients(patientsData.patients);
    } catch (err) {
      console.error('Error loading patients:', err);
    }
  };

  const loadDoctors = async () => {
    try {
      const doctorsData = await getAllDoctorsSimple();
      setDoctors(doctorsData);
    } catch (err) {
      console.error('Error loading doctors:', err);
    }
  };

  const getBedStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'occupied':
        return 'bg-red-50 text-red-600';
      case 'available':
        return 'bg-green-50 text-green-600';
      case 'maintenance':
        return 'bg-orange-50 text-orange-600';
      case 'reserved':
        return 'bg-blue-50 text-blue-600';
      default:
        return 'bg-gray-50 text-gray-600';
    }
  };

  const groupBedsByType = (beds: Bed[]) => {
    return beds.reduce((acc, bed) => {
      const type = bed.bed_type || 'general';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(bed);
      return acc;
    }, {} as Record<string, Bed[]>);
  };

  const filteredBeds = beds.filter(bed => 
    bed.bed_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bed.room_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bed.bed_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedBeds = groupBedsByType(filteredBeds);

  const BedCard = ({ bed }: { bed: Bed }) => {
    const currentAllocation = (bed as any).current_allocation?.find((alloc: any) => alloc.status === 'active');
    
    return (
      <div className="card">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="text-lg font-medium text-gray-900">{bed.bed_number}</span>
            <span className="text-sm text-gray-500 ml-2">Room {bed.room_number}</span>
            <span className={`ml-3 px-2 py-1 rounded-lg text-xs font-medium ${getBedStatusColor(bed.status)}`}>
              {bed.status.charAt(0).toUpperCase() + bed.status.slice(1)}
            </span>
          </div>
          {bed.status === 'occupied' && (
            <button className="text-gray-400 hover:text-orange-400">
              <ArrowUpRight size={20} />
            </button>
          )}
        </div>

        {bed.status === 'occupied' && currentAllocation ? (
          <>
            <div className="space-y-2">
              <p className="font-medium text-gray-900">{currentAllocation.patient?.name || 'Unknown Patient'}</p>
              <p className="text-sm text-gray-500">{currentAllocation.doctor?.user?.name || 'Unknown Doctor'}</p>
              <div className="flex items-center text-xs text-gray-500">
                <Clock size={12} className="mr-1" />
                Admitted {new Date(currentAllocation.admission_date).toLocaleDateString()}
              </div>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button className="btn-secondary text-sm py-1 px-3">Transfer</button>
              <button className="btn-primary text-sm py-1 px-3">Discharge</button>
            </div>
          </>
        ) : bed.status === 'available' ? (
          <button 
            className="btn-primary w-full mt-4"
            onClick={() => {
              setSelectedBed(bed);
              setShowAssignModal(true);
            }}
          >
            Assign Patient
          </button>
        ) : bed.status === 'maintenance' ? (
          <div className="flex items-center mt-4 text-sm text-orange-500">
            <AlertTriangle size={14} className="mr-1" />
            Under maintenance
          </div>
        ) : (
          <div className="flex items-center mt-4 text-sm text-blue-500">
            <Clock size={14} className="mr-1" />
            Reserved
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-gray-900">Bed Management</h1>
        <p className="text-gray-500 mt-1">Monitor and manage hospital bed occupancy</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
            <span className="text-red-800">{error}</span>
            <button
              onClick={loadBedData}
              className="ml-auto px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-500">Total Beds</p>
              <h3 className="text-2xl font-medium text-gray-900 mt-1">{bedStats.total}</h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
              <BedIcon className="text-gray-500" size={20} />
            </div>
          </div>
          <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="bg-gray-500 h-full" style={{ width: '100%' }}></div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-500">Occupied</p>
              <h3 className="text-2xl font-medium text-gray-900 mt-1">{bedStats.occupied}</h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
              <BedIcon className="text-red-500" size={20} />
            </div>
          </div>
          <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="bg-red-500 h-full" style={{ width: `${bedStats.occupancyRate}%` }}></div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-500">Available</p>
              <h3 className="text-2xl font-medium text-gray-900 mt-1">{bedStats.available}</h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <BedIcon className="text-green-500" size={20} />
            </div>
          </div>
          <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="bg-green-500 h-full" style={{ width: `${bedStats.total > 0 ? (bedStats.available / bedStats.total) * 100 : 0}%` }}></div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-500">Maintenance</p>
              <h3 className="text-2xl font-medium text-gray-900 mt-1">{bedStats.maintenance}</h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
              <AlertTriangle className="text-orange-500" size={20} />
            </div>
          </div>
          <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="bg-orange-500 h-full" style={{ width: `${bedStats.total > 0 ? (bedStats.maintenance / bedStats.total) * 100 : 0}%` }}></div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex justify-between items-center">
        <div className="relative w-96">
          <input 
            type="text" 
            placeholder="Search beds..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 bg-gray-100 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-orange-200"
          />
          <Search className="absolute left-3 top-2.5 text-gray-500" size={20} />
        </div>
        <div className="flex space-x-3">
          <button className="btn-secondary flex items-center">
            <Filter size={18} className="mr-2" />
            Filter
          </button>
          <button className="btn-primary flex items-center">
            <Plus size={18} className="mr-2" />
            Add Bed
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          <span className="ml-2 text-gray-600">Loading beds...</span>
        </div>
      ) : (
        <>
          {/* Bed Sections by Type */}
          {Object.entries(groupedBeds).map(([bedType, bedsInType]) => (
            <div key={bedType}>
              <h2 className="text-gray-900 mb-4 capitalize">
                {bedType === 'icu' ? 'Intensive Care Unit' : 
                 bedType === 'general' ? 'General Ward' :
                 bedType === 'emergency' ? 'Emergency Room' :
                 bedType.replace('_', ' ')} ({bedsInType.length})
              </h2>
              <div className="grid grid-cols-4 gap-6">
                {bedsInType.map((bed) => (
                  <BedCard key={bed.id} bed={bed} />
                ))}
              </div>
            </div>
          ))}
          
          {/* No beds message */}
          {filteredBeds.length === 0 && (
            <div className="text-center py-12">
              <BedIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No beds found</h3>
              <p className="text-gray-500">Try adjusting your search criteria.</p>
            </div>
          )}
        </>
      )}

      {/* Assign Patient Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowAssignModal(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-6 pt-5 pb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Assign Patient to Bed</h3>
                  <button 
                    className="text-gray-400 hover:text-gray-500" 
                    onClick={() => setShowAssignModal(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form className="space-y-4">
                  <div>
                    <label htmlFor="patient" className="block text-sm font-medium text-gray-700">Patient</label>
                    <select id="patient" className="input-field mt-1">
                      <option value="">Select Patient</option>
                      {patients.map((patient) => (
                        <option key={patient.id} value={patient.id}>
                          {patient.name} - {patient.patient_id}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="doctor" className="block text-sm font-medium text-gray-700">Attending Doctor</label>
                    <select id="doctor" className="input-field mt-1">
                      <option value="">Select Doctor</option>
                      {doctors.map((doctor) => (
                        <option key={doctor.id} value={doctor.id}>
                          {doctor.user?.name} - {doctor.specialization}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedBed && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Selected Bed</label>
                      <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium">{selectedBed.bed_number}</p>
                        <p className="text-xs text-gray-500">Room {selectedBed.room_number} • {selectedBed.bed_type}</p>
                      </div>
                    </div>
                  )}

                  <div>
                    <label htmlFor="admissionDate" className="block text-sm font-medium text-gray-700">Admission Date</label>
                    <input type="date" id="admissionDate" className="input-field mt-1" />
                  </div>

                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes</label>
                    <textarea 
                      id="notes" 
                      rows={3} 
                      className="input-field mt-1"
                      placeholder="Add any additional notes..."
                    ></textarea>
                  </div>
                </form>
              </div>

              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                <button 
                  className="btn-secondary"
                  onClick={() => setShowAssignModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="btn-primary"
                  onClick={() => setShowAssignModal(false)}
                >
                  Assign Patient
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BedManagement;