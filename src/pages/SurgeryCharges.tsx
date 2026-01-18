
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ChevronLeft, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import Link from 'next/link';
import {
  createSurgeryCategory,
  createSurgeryService,
  listSurgeryCategories,
  listSurgeryServices,
  updateSurgeryCategory,
  updateSurgeryService,
  type SurgeryCategory,
  type SurgeryService
} from '../lib/surgeryCatalogService';

export default function SurgeryCharges() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<SurgeryCategory[]>([]);
  const [services, setServices] = useState<SurgeryService[]>([]);

  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [creatingCategory, setCreatingCategory] = useState(false);

  const [newService, setNewService] = useState({
    category_id: '' as string,
    service_code: '',
    service_name: '',
    description: '',
    base_price: 0,
    surgeon_fee: 0,
    anesthesia_fee: 0,
    ot_charges: 0,
    consumables_charges: 0,
    equipment_charges: 0,
    other_charges: 0
  });
  const [creatingService, setCreatingService] = useState(false);

  const [includeInactive, setIncludeInactive] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cats, svcs] = await Promise.all([
        listSurgeryCategories(),
        listSurgeryServices({ includeInactive })
      ]);
      setCategories(cats);
      setServices(svcs);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Failed to load surgery catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeInactive]);

  const categoryOptions = useMemo(() => {
    return categories.filter(c => c.is_active).map(c => ({ id: c.id, name: c.name }));
  }, [categories]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
      Number(amount || 0)
    );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 text-purple-600 animate-spin mb-4" />
          <p className="text-gray-600 font-medium">Loading Surgery Catalog...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="group flex items-center gap-2 text-gray-500 hover:text-purple-600 transition-colors">
            <div className="p-2 rounded-lg bg-white border border-gray-200 group-hover:border-purple-200 transition-all">
              <ChevronLeft size={20} />
            </div>
            <span className="font-bold tracking-tight">Return to Dashboard</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h1 className="text-2xl font-bold text-gray-900">Surgery Management</h1>
            <p className="text-gray-600 mt-1">Manage surgery categories and services with pricing</p>
          </div>

          <div className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-2 text-red-700">
                <AlertCircle size={18} />
                <span className="font-semibold text-sm">{error}</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="text-sm font-semibold text-gray-700">Surgery Master Data</div>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} />
                Show inactive
              </label>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Categories */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Categories</h2>
                    <p className="text-sm text-gray-600">Create and manage surgery categories</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <input
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    placeholder="Category name (e.g., General Surgery)"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                  />
                  <input
                    value={newCategory.description}
                    onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                    placeholder="Description (optional)"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                  />
                  <button
                    type="button"
                    disabled={creatingCategory || !newCategory.name.trim()}
                    onClick={async () => {
                      try {
                        setCreatingCategory(true);
                        await createSurgeryCategory({ name: newCategory.name.trim(), description: newCategory.description.trim() || null });
                        setNewCategory({ name: '', description: '' });
                        await loadAll();
                      } catch (e: any) {
                        console.error(e);
                        setError(e?.message || 'Failed to create category');
                      } finally {
                        setCreatingCategory(false);
                      }
                    }}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Plus size={16} /> Add Category
                  </button>
                </div>

                <div className="mt-4 space-y-2">
                  {categories.length === 0 ? (
                    <div className="text-sm text-gray-500 text-center py-6">No categories yet</div>
                  ) : (
                    categories.map((c) => (
                      <div key={c.id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 truncate">{c.name}</div>
                          {c.description ? <div className="text-xs text-gray-600 truncate">{c.description}</div> : null}
                          {!c.is_active ? <div className="text-xs text-red-600 font-semibold">Inactive</div> : null}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await updateSurgeryCategory(c.id, { is_active: !c.is_active });
                                await loadAll();
                              } catch (e: any) {
                                console.error(e);
                                setError(e?.message || 'Failed to update category');
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold"
                          >
                            {c.is_active ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Services */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Services & Prices</h2>
                    <p className="text-sm text-gray-600">Add surgery services with pricing breakdown</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <select
                    value={newService.category_id}
                    onChange={(e) => setNewService({ ...newService, category_id: e.target.value })}
                    className="px-3 py-2 rounded-lg border border-gray-300 text-sm"
                  >
                    <option value="">Select category (optional)</option>
                    {categoryOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <input
                    value={newService.service_code}
                    onChange={(e) => setNewService({ ...newService, service_code: e.target.value })}
                    placeholder="Code (optional)"
                    className="px-3 py-2 rounded-lg border border-gray-300 text-sm"
                  />
                  <input
                    value={newService.service_name}
                    onChange={(e) => setNewService({ ...newService, service_name: e.target.value })}
                    placeholder="Service name *"
                    className="md:col-span-2 px-3 py-2 rounded-lg border border-gray-300 text-sm"
                  />
                  <input
                    type="number"
                    value={newService.base_price}
                    onChange={(e) => setNewService({ ...newService, base_price: Number(e.target.value || 0) })}
                    placeholder="Base price"
                    className="px-3 py-2 rounded-lg border border-gray-300 text-sm"
                  />
                  <input
                    type="number"
                    value={newService.surgeon_fee}
                    onChange={(e) => setNewService({ ...newService, surgeon_fee: Number(e.target.value || 0) })}
                    placeholder="Surgeon fee"
                    className="px-3 py-2 rounded-lg border border-gray-300 text-sm"
                  />
                  <input
                    type="number"
                    value={newService.anesthesia_fee}
                    onChange={(e) => setNewService({ ...newService, anesthesia_fee: Number(e.target.value || 0) })}
                    placeholder="Anesthesia fee"
                    className="px-3 py-2 rounded-lg border border-gray-300 text-sm"
                  />
                  <input
                    type="number"
                    value={newService.ot_charges}
                    onChange={(e) => setNewService({ ...newService, ot_charges: Number(e.target.value || 0) })}
                    placeholder="OT charges"
                    className="px-3 py-2 rounded-lg border border-gray-300 text-sm"
                  />
                  <input
                    type="number"
                    value={newService.consumables_charges}
                    onChange={(e) => setNewService({ ...newService, consumables_charges: Number(e.target.value || 0) })}
                    placeholder="Consumables"
                    className="px-3 py-2 rounded-lg border border-gray-300 text-sm"
                  />
                  <input
                    type="number"
                    value={newService.equipment_charges}
                    onChange={(e) => setNewService({ ...newService, equipment_charges: Number(e.target.value || 0) })}
                    placeholder="Equipment"
                    className="px-3 py-2 rounded-lg border border-gray-300 text-sm"
                  />
                  <input
                    type="number"
                    value={newService.other_charges}
                    onChange={(e) => setNewService({ ...newService, other_charges: Number(e.target.value || 0) })}
                    placeholder="Other charges"
                    className="px-3 py-2 rounded-lg border border-gray-300 text-sm"
                  />

                  <button
                    type="button"
                    disabled={creatingService || !newService.service_name.trim()}
                    onClick={async () => {
                      try {
                        setCreatingService(true);
                        await createSurgeryService({
                          category_id: newService.category_id || null,
                          service_code: newService.service_code.trim() || null,
                          service_name: newService.service_name.trim(),
                          description: newService.description.trim() || null,
                          base_price: newService.base_price,
                          surgeon_fee: newService.surgeon_fee,
                          anesthesia_fee: newService.anesthesia_fee,
                          ot_charges: newService.ot_charges,
                          consumables_charges: newService.consumables_charges,
                          equipment_charges: newService.equipment_charges,
                          other_charges: newService.other_charges
                        });
                        setNewService({
                          category_id: '',
                          service_code: '',
                          service_name: '',
                          description: '',
                          base_price: 0,
                          surgeon_fee: 0,
                          anesthesia_fee: 0,
                          ot_charges: 0,
                          consumables_charges: 0,
                          equipment_charges: 0,
                          other_charges: 0
                        });
                        await loadAll();
                      } catch (e: any) {
                        console.error(e);
                        setError(e?.message || 'Failed to create service');
                      } finally {
                        setCreatingService(false);
                      }
                    }}
                    className="md:col-span-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Save size={16} /> Save Service
                  </button>
                </div>

                <div className="mt-4 space-y-2">
                  {services.length === 0 ? (
                    <div className="text-sm text-gray-500 text-center py-6">No services yet</div>
                  ) : (
                    services.map((s) => (
                      <div key={s.id} className="bg-white border border-gray-200 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 truncate">{s.service_name}</div>
                            <div className="text-xs text-gray-600 truncate">
                              {s.category?.name ? `Category: ${s.category.name}` : 'No category'}
                              {s.service_code ? ` • Code: ${s.service_code}` : ''}
                            </div>
                            {!s.is_active ? <div className="text-xs text-red-600 font-semibold">Inactive</div> : null}
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-purple-700">{formatCurrency(s.total_price)}</div>
                            <div className="text-[11px] text-gray-500">Total</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs text-gray-700">
                          <div>Base: {formatCurrency(s.base_price)}</div>
                          <div>Surgeon: {formatCurrency(s.surgeon_fee)}</div>
                          <div>Anes: {formatCurrency(s.anesthesia_fee)}</div>
                          <div>OT: {formatCurrency(s.ot_charges)}</div>
                        </div>

                        <div className="flex justify-end gap-2 mt-3">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await updateSurgeryService(s.id, { is_active: !s.is_active });
                                await loadAll();
                              } catch (e: any) {
                                console.error(e);
                                setError(e?.message || 'Failed to update service');
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold"
                          >
                            {s.is_active ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!confirm('Disable this service?')) return;
                              try {
                                await updateSurgeryService(s.id, { is_active: false });
                                await loadAll();
                              } catch (e: any) {
                                console.error(e);
                                setError(e?.message || 'Failed to disable service');
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg border border-red-300 text-red-700 text-xs font-semibold flex items-center gap-1"
                          >
                            <Trash2 size={14} /> Disable
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
