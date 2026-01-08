import React, { useState, useEffect } from 'react';
import { 
  Activity, Plus, Save, X, Thermometer, Heart, 
  Wind, Droplets, Utensils, FileText, TrendingUp
} from 'lucide-react';
import { getIPVitals, createIPVital, IPVital } from '../../lib/ipClinicalService';

interface NurseVitalsProps {
  bedAllocationId: string;
  date?: string; // YYYY-MM-DD
}

export default function NurseVitals({ bedAllocationId, date }: NurseVitalsProps) {
  const [vitals, setVitals] = useState<IPVital[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<Partial<IPVital>>({
    temperature: undefined,
    bp_systolic: undefined,
    bp_diastolic: undefined,
    pulse: undefined,
    respiratory_rate: undefined,
    spo2: undefined,
    sugar_level: undefined,
    sugar_type: 'Random',
    notes: ''
  });

  useEffect(() => {
    loadVitals();
  }, [bedAllocationId, date]);

  const loadVitals = async () => {
    setLoading(true);
    try {
      const data = await getIPVitals(bedAllocationId, date);
      setVitals(data || []);
    } catch (err) {
      console.error('Failed to load vitals', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Use the passed date for the record timestamp if it's today, otherwise use current time?
      // Requirement says "entry only that days records".
      // If user adds a record while viewing a past date, should it be backdated?
      // Usually clinical systems default to NOW, but allow backdating.
      // For simplicity here, let's use NOW if date is today/undefined, or set to noon of that date if it's in the past?
      // Or just use NOW and let the filter hide it if it doesn't match?
      // Better: If date is provided and != today, use that date + current time (or 12:00).
      // Let's stick to simple: Use NOW. If it doesn't appear in the list because of filter, so be it (or warn user).
      // Actually, if I am in "Day 1" view (past), and I add a vital, I probably want it to be for Day 1.
      
      let recordedAt = new Date().toISOString();
      if (date) {
        const today = new Date().toISOString().split('T')[0];
        if (date !== today) {
           const d = new Date();
           recordedAt = `${date}T${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`;
        }
      }

      await createIPVital(bedAllocationId, {
        ...formData,
        recorded_at: recordedAt
      });
      setShowAddForm(false);
      setFormData({
        temperature: undefined,
        bp_systolic: undefined,
        bp_diastolic: undefined,
        pulse: undefined,
        respiratory_rate: undefined,
        spo2: undefined,
        sugar_level: undefined,
        sugar_type: 'Random',
        notes: ''
      });
      loadVitals();
    } catch (err) {
      console.error('Failed to save vitals', err);
    } finally {
      setSaving(false);
    }
  };

  const getVitalColor = (value: number | undefined, type: 'temp' | 'bp' | 'pulse' | 'spo2') => {
    if (!value) return 'text-gray-900';
    // Basic alerting logic (can be refined)
    if (type === 'temp' && value > 100) return 'text-red-600 font-bold';
    if (type === 'spo2' && value < 95) return 'text-red-600 font-bold';
    if (type === 'pulse' && (value < 60 || value > 100)) return 'text-orange-600 font-bold';
    return 'text-gray-900';
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-600" />
          Vitals Monitor
        </h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={16} />
          Record Vitals
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 animate-in slide-in-from-top-4">
          <form onSubmit={handleSubmit}>
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-gray-900">New Vitals Entry</h4>
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Temperature */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                  <Thermometer size={12} /> Temp (°F)
                </label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.temperature || ''}
                  onChange={e => setFormData({...formData, temperature: parseFloat(e.target.value)})}
                  placeholder="98.6"
                />
              </div>

              {/* BP */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                  <Heart size={12} /> BP (mmHg)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Sys"
                    value={formData.bp_systolic || ''}
                    onChange={e => setFormData({...formData, bp_systolic: parseInt(e.target.value)})}
                  />
                  <span className="text-gray-400">/</span>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Dia"
                    value={formData.bp_diastolic || ''}
                    onChange={e => setFormData({...formData, bp_diastolic: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              {/* Pulse */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                  <Activity size={12} /> Pulse (bpm)
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.pulse || ''}
                  onChange={e => setFormData({...formData, pulse: parseInt(e.target.value)})}
                  placeholder="72"
                />
              </div>

              {/* SpO2 */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                  <Wind size={12} /> SpO2 (%)
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.spo2 || ''}
                  onChange={e => setFormData({...formData, spo2: parseInt(e.target.value)})}
                  placeholder="98"
                />
              </div>

              {/* Respiratory Rate */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                  <Wind size={12} /> Resp. Rate
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.respiratory_rate || ''}
                  onChange={e => setFormData({...formData, respiratory_rate: parseInt(e.target.value)})}
                  placeholder="16"
                />
              </div>

              {/* Blood Sugar */}
              <div className="space-y-1 col-span-2">
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                  <Droplets size={12} /> Blood Sugar (mg/dL)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.sugar_level || ''}
                    onChange={e => setFormData({...formData, sugar_level: parseInt(e.target.value)})}
                    placeholder="Level"
                  />
                  <select
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.sugar_type}
                    onChange={e => setFormData({...formData, sugar_type: e.target.value})}
                  >
                    <option value="Random">RBS</option>
                    <option value="Fasting">FBS</option>
                    <option value="PP">PP</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs font-medium text-gray-500 flex items-center gap-1 mb-1">
                <FileText size={12} /> Notes
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                rows={2}
                placeholder="Any additional observations..."
                value={formData.notes || ''}
                onChange={e => setFormData({...formData, notes: e.target.value})}
              ></textarea>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Vitals'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Vitals History Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-3">Time</th>
                <th className="px-6 py-3">Temp</th>
                <th className="px-6 py-3">BP</th>
                <th className="px-6 py-3">Pulse</th>
                <th className="px-6 py-3">SpO2</th>
                <th className="px-6 py-3">Sugar</th>
                <th className="px-6 py-3">Notes</th>
                <th className="px-6 py-3">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">Loading vitals...</td>
                </tr>
              ) : vitals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500 italic">No vitals recorded yet.</td>
                </tr>
              ) : (
                vitals.map((vital) => (
                  <tr key={vital.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 whitespace-nowrap text-gray-600">
                      {new Date(vital.recorded_at).toLocaleDateString()}
                      <span className="block text-xs text-gray-400">
                        {new Date(vital.recorded_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </td>
                    <td className={`px-6 py-3 font-medium ${getVitalColor(vital.temperature, 'temp')}`}>
                      {vital.temperature ? `${vital.temperature}°F` : '-'}
                    </td>
                    <td className="px-6 py-3">
                      {vital.bp_systolic && vital.bp_diastolic ? `${vital.bp_systolic}/${vital.bp_diastolic}` : '-'}
                    </td>
                    <td className={`px-6 py-3 ${getVitalColor(vital.pulse, 'pulse')}`}>
                      {vital.pulse ? `${vital.pulse} bpm` : '-'}
                    </td>
                    <td className={`px-6 py-3 ${getVitalColor(vital.spo2, 'spo2')}`}>
                      {vital.spo2 ? `${vital.spo2}%` : '-'}
                    </td>
                    <td className="px-6 py-3">
                      {vital.sugar_level ? (
                        <span>
                          {vital.sugar_level} <span className="text-xs text-gray-400">({vital.sugar_type})</span>
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-3 text-gray-600 max-w-xs truncate">
                      {vital.notes || '-'}
                    </td>
                    <td className="px-6 py-3 text-gray-500 text-xs">
                      {vital.creator?.name || 'Unknown'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
