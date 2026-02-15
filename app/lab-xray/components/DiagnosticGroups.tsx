'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Save, Trash2, Search, X } from 'lucide-react';
import {
  createDiagnosticGroup,
  createDiagnosticGroupItem,
  deleteDiagnosticGroup,
  deleteDiagnosticGroupItem,
  getDiagnosticGroupItems,
  getDiagnosticGroups,
  updateDiagnosticGroup,
  updateDiagnosticGroupItem,
} from '../../../src/lib/labXrayService';
import { getLabTestCatalog, getRadiologyTestCatalog, getScanTestCatalog } from '../../../src/lib/labXrayService';

type ServiceType = 'lab' | 'radiology' | 'scan' | 'xray';

type Group = {
  id: string;
  name: string;
  category: string;
  is_active: boolean;
  service_types?: ServiceType[];
  created_at?: string;
  updated_at?: string;
};

type GroupItem = {
  id: string;
  group_id: string;
  service_type: ServiceType;
  catalog_id: string;
  default_selected: boolean;
  sort_order: number;
  item_name_snapshot?: string;
  created_at?: string;
  updated_at?: string;
};

function safeStr(v: any) {
  return String(v ?? '');
}

export default function DiagnosticGroups() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const selectedGroup = useMemo(() => groups.find(g => g.id === selectedGroupId) || null, [groups, selectedGroupId]);

  const [items, setItems] = useState<GroupItem[]>([]);

  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupCategory, setNewGroupCategory] = useState<'Lab' | 'Radiology' | 'Scan' | 'Mixed'>('Lab');
  const [newServiceTypes, setNewServiceTypes] = useState<ServiceType[]>(['lab']);

  const [catalogServiceType, setCatalogServiceType] = useState<ServiceType>('lab');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogLoading, setCatalogLoading] = useState(false);

  const [labCatalog, setLabCatalog] = useState<any[]>([]);
  const [radCatalog, setRadCatalog] = useState<any[]>([]);
  const [scanCatalog, setScanCatalog] = useState<any[]>([]);

  const loadGroups = async () => {
    const data = await getDiagnosticGroups();
    setGroups(data || []);
    if (!selectedGroupId && data?.length) setSelectedGroupId(data[0].id);
  };

  const loadItems = async (groupId: string) => {
    const data = await getDiagnosticGroupItems(groupId);
    setItems((data || []).sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)));
  };

  const loadCatalog = async (serviceType: ServiceType) => {
    setCatalogLoading(true);
    try {
      if (serviceType === 'lab') {
        const data = await getLabTestCatalog();
        setLabCatalog(data || []);
      } else if (serviceType === 'radiology' || serviceType === 'xray') {
        const data = await getRadiologyTestCatalog();
        setRadCatalog(data || []);
      } else {
        const data = await getScanTestCatalog();
        setScanCatalog(data || []);
      }
    } finally {
      setCatalogLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await loadGroups();
      } catch (e: any) {
        setError(e?.message || 'Failed to load groups');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedGroupId) return;
    loadItems(selectedGroupId).catch(() => {
      setItems([]);
    });
  }, [selectedGroupId]);

  useEffect(() => {
    loadCatalog(catalogServiceType).catch(() => {
      if (catalogServiceType === 'lab') setLabCatalog([]);
      if (catalogServiceType === 'radiology' || catalogServiceType === 'xray') setRadCatalog([]);
      if (catalogServiceType === 'scan') setScanCatalog([]);
    });
  }, [catalogServiceType]);

  useEffect(() => {
    // Preload for item-name rendering
    loadCatalog('lab').catch(() => setLabCatalog([]));
    loadCatalog('radiology').catch(() => setRadCatalog([]));
    loadCatalog('scan').catch(() => setScanCatalog([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const catalogNameAndCost = (serviceType: ServiceType, catalogId: string): { name: string; cost: number | null } => {
    if (!catalogId) return { name: 'Unknown', cost: null };

    if (serviceType === 'lab') {
      const row = labCatalog.find((x: any) => x.id === catalogId);
      return {
        name: row?.test_name || catalogId,
        cost: typeof row?.test_cost === 'number' ? row.test_cost : (row?.test_cost != null ? Number(row.test_cost) : null),
      };
    }

    if (serviceType === 'scan') {
      const row = scanCatalog.find((x: any) => x.id === catalogId);
      return {
        name: row?.scan_name || catalogId,
        cost: typeof row?.test_cost === 'number' ? row.test_cost : (row?.test_cost != null ? Number(row.test_cost) : null),
      };
    }

    // radiology / xray uses same catalog table
    const row = radCatalog.find((x: any) => x.id === catalogId);
    return {
      name: row?.test_name || catalogId,
      cost: typeof row?.test_cost === 'number' ? row.test_cost : (row?.test_cost != null ? Number(row.test_cost) : null),
    };
  };

  const filteredGroups = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return groups;
    return groups.filter(g => g.name.toLowerCase().includes(term) || g.category.toLowerCase().includes(term));
  }, [groups, search]);

  const catalogList = useMemo(() => {
    const term = catalogSearch.trim().toLowerCase();
    const src = catalogServiceType === 'lab' ? labCatalog : (catalogServiceType === 'scan' ? scanCatalog : radCatalog);

    const mapped = (src || []).map((row: any) => {
      if (catalogServiceType === 'lab') {
        return {
          id: row.id,
          name: row.test_name,
          group: row.category,
          cost: row.test_cost,
        };
      }
      if (catalogServiceType === 'scan') {
        return {
          id: row.id,
          name: row.scan_name,
          group: row.category,
          cost: row.test_cost,
        };
      }
      return {
        id: row.id,
        name: row.test_name,
        group: row.modality,
        cost: row.test_cost,
      };
    });

    if (!term) return mapped;
    return mapped.filter((c: any) =>
      safeStr(c.name).toLowerCase().includes(term) ||
      safeStr(c.group).toLowerCase().includes(term)
    );
  }, [catalogSearch, catalogServiceType, labCatalog, radCatalog, scanCatalog]);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      setError('Group name is required');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const created = await createDiagnosticGroup({
        name: newGroupName.trim(),
        category: newGroupCategory,
        service_types: newServiceTypes,
      });
      setShowCreate(false);
      setNewGroupName('');
      setNewGroupCategory('Lab');
      setNewServiceTypes(['lab']);
      await loadGroups();
      if (created?.id) setSelectedGroupId(created.id);
    } catch (e: any) {
      setError(e?.message || 'Failed to create group');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (g: Group) => {
    setSaving(true);
    setError(null);
    try {
      await updateDiagnosticGroup(g.id, { is_active: !g.is_active });
      await loadGroups();
    } catch (e: any) {
      setError(e?.message || 'Failed to update group');
    } finally {
      setSaving(false);
    }
  };

  const handleRenameGroup = async (g: Group, name: string, category: string) => {
    setSaving(true);
    setError(null);
    try {
      await updateDiagnosticGroup(g.id, { name, category });
      await loadGroups();
    } catch (e: any) {
      setError(e?.message || 'Failed to update group');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async (g: Group) => {
    const ok = window.confirm(`Delete group "${g.name}"? This will remove all items inside it.`);
    if (!ok) return;

    setSaving(true);
    setError(null);
    try {
      await deleteDiagnosticGroup(g.id);
      await loadGroups();
      if (selectedGroupId === g.id) setSelectedGroupId(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to delete group');
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = async (catalogId: string, displayName: string) => {
    if (!selectedGroupId) return;

    const exists = items.some(i => i.service_type === catalogServiceType && i.catalog_id === catalogId);
    if (exists) {
      setError('This item already exists in the group');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const nextSort = items.length ? Math.max(...items.map(i => Number(i.sort_order || 0))) + 1 : 0;
      await createDiagnosticGroupItem({
        group_id: selectedGroupId,
        service_type: catalogServiceType,
        catalog_id: catalogId,
        default_selected: true,
        sort_order: nextSort,
      });
      await loadItems(selectedGroupId);
    } catch (e: any) {
      setError(e?.message || 'Failed to add item');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDefaultSelected = async (item: GroupItem) => {
    setSaving(true);
    setError(null);
    try {
      await updateDiagnosticGroupItem(item.id, { default_selected: !item.default_selected });
      if (selectedGroupId) await loadItems(selectedGroupId);
    } catch (e: any) {
      setError(e?.message || 'Failed to update item');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (item: GroupItem) => {
    const ok = window.confirm('Remove this item from the group?');
    if (!ok) return;

    setSaving(true);
    setError(null);
    try {
      await deleteDiagnosticGroupItem(item.id);
      if (selectedGroupId) await loadItems(selectedGroupId);
    } catch (e: any) {
      setError(e?.message || 'Failed to remove item');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="text-gray-500 text-sm">Loading groups…</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="font-extrabold text-gray-900">Diagnostic Groups</div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-black"
          >
            <Plus size={16} />
            New
          </button>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search groups…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 outline-none text-sm"
          />
        </div>

        {error && (
          <div className="mb-3 text-sm text-red-600 font-semibold">{error}</div>
        )}

        <div className="space-y-2 max-h-[60vh] overflow-auto pr-1">
          {filteredGroups.map(g => (
            <button
              key={g.id}
              onClick={() => setSelectedGroupId(g.id)}
              className={`w-full text-left p-3 rounded-xl border transition-all ${selectedGroupId === g.id ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:bg-gray-50'}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-gray-900">{g.name}</div>
                  <div className="text-xs text-gray-500">{g.category} • {g.is_active ? 'Active' : 'Inactive'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleToggleActive(g); }}
                    className={`text-[10px] font-black px-2 py-1 rounded-full ${g.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}
                    title="Toggle active"
                  >
                    {g.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                  <span
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteGroup(g); }}
                    className="text-[10px] font-black px-2 py-1 rounded-full bg-red-50 text-red-700"
                    title="Delete"
                  >
                    DEL
                  </span>
                </div>
              </div>
            </button>
          ))}

          {filteredGroups.length === 0 && (
            <div className="text-sm text-gray-500">No groups found.</div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 xl:col-span-2">
        {!selectedGroup ? (
          <div className="text-gray-500 text-sm">Select a group to manage items.</div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="text-xs text-gray-500">Selected Group</div>
                <div className="text-xl font-extrabold text-gray-900">{selectedGroup.name}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={saving}
                  onClick={() => handleToggleActive(selectedGroup)}
                  className="px-3 py-2 rounded-xl bg-gray-100 text-gray-900 text-sm font-bold hover:bg-gray-200 disabled:opacity-60"
                >
                  {selectedGroup.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>

            <GroupMetaEditor
              key={selectedGroup.id}
              group={selectedGroup}
              saving={saving}
              onSave={handleRenameGroup}
            />

            <div className="border-t border-gray-200 pt-4">
              <div className="font-extrabold text-gray-900 mb-3">Items</div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <select
                  value={catalogServiceType}
                  onChange={e => setCatalogServiceType(e.target.value as ServiceType)}
                  className="px-3 py-2.5 rounded-xl bg-gray-50 outline-none text-sm font-semibold"
                >
                  <option value="lab">Lab</option>
                  <option value="radiology">Radiology</option>
                  <option value="scan">Scan</option>
                  <option value="xray">X-Ray</option>
                </select>
                <div className="md:col-span-2 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    value={catalogSearch}
                    onChange={e => setCatalogSearch(e.target.value)}
                    placeholder="Search catalog to add…"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 outline-none text-sm"
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl border border-gray-200 p-3 max-h-56 overflow-auto">
                {catalogLoading ? (
                  <div className="text-sm text-gray-500">Loading catalog…</div>
                ) : (
                  <div className="space-y-2">
                    {catalogList.slice(0, 40).map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between gap-3 bg-white rounded-lg p-2 border border-gray-200">
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-gray-900 truncate">{c.name}</div>
                          <div className="text-xs text-gray-500 truncate">{c.group}</div>
                        </div>
                        <button
                          disabled={saving || !selectedGroup.is_active}
                          onClick={() => handleAddItem(c.id, c.name)}
                          className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-extrabold hover:bg-black disabled:opacity-60"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                    {catalogList.length === 0 && (
                      <div className="text-sm text-gray-500">No catalog items.</div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-2">
                {items.map((it) => (
                  <div key={it.id} className="flex items-center justify-between gap-3 bg-white rounded-xl p-3 border border-gray-200">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-gray-900 truncate">
                        {catalogNameAndCost(it.service_type, it.catalog_id).name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {it.service_type.toUpperCase()}
                        {' • '}
                        Default: {it.default_selected ? 'Yes' : 'No'}
                        {catalogNameAndCost(it.service_type, it.catalog_id).cost != null
                          ? ` • ₹${Number(catalogNameAndCost(it.service_type, it.catalog_id).cost).toFixed(0)}`
                          : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={saving}
                        onClick={() => handleToggleDefaultSelected(it)}
                        className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-900 text-xs font-extrabold hover:bg-gray-200 disabled:opacity-60"
                        title="Toggle default selected"
                      >
                        {it.default_selected ? 'Default ON' : 'Default OFF'}
                      </button>
                      <button
                        disabled={saving}
                        onClick={() => handleDeleteItem(it)}
                        className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-extrabold hover:bg-red-100 disabled:opacity-60"
                        title="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}

                {items.length === 0 && (
                  <div className="text-sm text-gray-500">No items in this group yet.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-lg p-5">
            <div className="flex items-center justify-between">
              <div className="font-extrabold text-gray-900">Create Group</div>
              <button onClick={() => setShowCreate(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <div className="text-xs font-bold text-gray-500 mb-1">Name</div>
                <input
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 outline-none"
                  placeholder="e.g., Fever Panel"
                />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-500 mb-1">Category</div>
                <select
                  value={newGroupCategory}
                  onChange={e => setNewGroupCategory(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 outline-none"
                >
                  <option value="Lab">Lab</option>
                  <option value="Radiology">Radiology</option>
                  <option value="Scan">Scan</option>
                  <option value="Mixed">Mixed</option>
                </select>
              </div>

              <div>
                <div className="text-xs font-bold text-gray-500 mb-2">Service Types</div>
                <div className="grid grid-cols-2 gap-2">
                  {(['lab', 'xray', 'scan', 'radiology'] as ServiceType[]).map((t) => {
                    const checked = newServiceTypes.includes(t);
                    return (
                      <label key={t} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? Array.from(new Set([...newServiceTypes, t]))
                              : newServiceTypes.filter(x => x !== t);
                            setNewServiceTypes(next.length ? next : ['lab']);
                          }}
                        />
                        <span className="text-sm font-bold text-gray-800">{t.toUpperCase()}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="text-[11px] text-gray-500 mt-2">
                  Doctors can pick a group and then unselect individual tests later.
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                disabled={saving}
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-xl bg-gray-100 text-gray-900 font-bold hover:bg-gray-200 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                onClick={handleCreateGroup}
                className="px-4 py-2 rounded-xl bg-gray-900 text-white font-bold hover:bg-black disabled:opacity-60 inline-flex items-center gap-2"
              >
                <Save size={16} />
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GroupMetaEditor({
  group,
  saving,
  onSave,
}: {
  group: Group;
  saving: boolean;
  onSave: (g: Group, name: string, category: string) => Promise<void>;
}) {
  const [name, setName] = useState(group.name);
  const [category, setCategory] = useState(group.category);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setName(group.name);
    setCategory(group.category);
    setDirty(false);
  }, [group.id]);

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <div className="text-xs font-bold text-gray-500 mb-1">Group Name</div>
          <input
            value={name}
            onChange={e => { setName(e.target.value); setDirty(true); }}
            className="w-full px-3 py-2.5 rounded-xl bg-white border border-gray-200 outline-none"
          />
        </div>
        <div>
          <div className="text-xs font-bold text-gray-500 mb-1">Category</div>
          <input
            value={category}
            onChange={e => { setCategory(e.target.value); setDirty(true); }}
            className="w-full px-3 py-2.5 rounded-xl bg-white border border-gray-200 outline-none"
          />
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <button
          disabled={saving || !dirty || !name.trim()}
          onClick={() => onSave(group, name.trim(), category.trim() || 'Lab')}
          className="px-4 py-2 rounded-xl bg-gray-900 text-white font-bold hover:bg-black disabled:opacity-60 inline-flex items-center gap-2"
        >
          <Save size={16} />
          Save
        </button>
      </div>
    </div>
  );
}
