'use client';

import { useState, useEffect, useCallback } from 'react';
import { Pencil, Trash2, Settings, Plus, X, RefreshCw, AlertCircle, Package } from 'lucide-react';
import { api } from '@/lib/api-client';

interface CupTypeItem {
  id: string;
  name: string;
  price?: number;
  isActive?: boolean;
}

interface SeriesOption {
  id: string;
  name: string;
  isActive?: boolean;
}

interface CupPriceConfig {
  enabled: boolean;
  price: number;
}

interface SeriesCupRule {
  id: string;
  seriesId: string;
  seriesName: string;
  cupPrices: Record<string, CupPriceConfig>;
}

const STORAGE_KEY = 'teh_baling_cup_rules';

export default function CupsPage() {
  const [cupList, setCupList] = useState<CupTypeItem[]>([]);
  const [seriesOptions, setSeriesOptions] = useState<SeriesOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [submittingCup, setSubmittingCup] = useState(false);
  const [togglingCupId, setTogglingCupId] = useState<string | null>(null);

  // Aturan Harga & Ketersediaan Cup per Series Teh (LocalStorage / State)
  const [rules, setRules] = useState<SeriesCupRule[]>([]);

  // Modal State untuk Master Ukuran Cup (Tambah & Edit - Murni Nama Cup)
  const [showCupModal, setShowCupModal] = useState(false);
  const [editingCupId, setEditingCupId] = useState<string | null>(null);
  const [cupNameInput, setCupNameInput] = useState('');
  const [cupIsActive, setCupIsActive] = useState(true);
  const [cupError, setCupError] = useState<string | null>(null);

  // Modal State untuk Aturan Harga Cup per Series Teh
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('');
  const [modalCupPrices, setModalCupPrices] = useState<Record<string, CupPriceConfig>>({});
  const [ruleError, setRuleError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [cupRes, seriesRes] = await Promise.all([
      api.get<CupTypeItem[]>('/cup-types?all=true'),
      api.get<SeriesOption[]>('/tea-series?all=true'),
    ]);

    if (cupRes.success && cupRes.data) {
      setCupList(cupRes.data);
    }
    if (seriesRes.success && seriesRes.data) {
      setSeriesOptions(seriesRes.data);
      if (seriesRes.data.length > 0 && !selectedSeriesId) {
        setSelectedSeriesId(seriesRes.data[0].id);
      }
    }
    setLoading(false);
  }, [selectedSeriesId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load and sync rules with LocalStorage and series
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedRulesStr = localStorage.getItem(STORAGE_KEY);
    if (savedRulesStr) {
      try {
        const parsed = JSON.parse(savedRulesStr) as SeriesCupRule[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRules(parsed);
          return;
        }
      } catch {
        // invalid json, fallback
      }
    }

    if (seriesOptions.length > 0 && cupList.length > 0 && rules.length === 0) {
      // Initialize default rules per series
      const initialRules: SeriesCupRule[] = seriesOptions.map((s, idx) => {
        const cupPrices: Record<string, CupPriceConfig> = {};
        cupList.forEach((c) => {
          let defaultPrice = 10000;
          const cName = c.name.toLowerCase();
          if (cName.includes('kecil') || cName.includes('reguler')) defaultPrice = 5000;
          else if (cName.includes('medium') || cName.includes('sedang')) defaultPrice = 8000;
          else if (cName.includes('big') || cName.includes('besar')) defaultPrice = 10000;
          else if (cName.includes('jumbo')) defaultPrice = 12000;

          cupPrices[c.id] = { enabled: true, price: defaultPrice + idx * 2000 };
        });
        return {
          id: `rule_${s.id}`,
          seriesId: s.id,
          seriesName: s.name,
          cupPrices,
        };
      });
      setRules(initialRules);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialRules));
    }
  }, [seriesOptions, cupList, rules.length]);

  // Helper to persist rules
  const savePersistedRules = (newRules: SeriesCupRule[]) => {
    setRules(newRules);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newRules));
    }
  };

  // Direct Inline Matrix Price / Status Update (Dynamic)
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const handleInlineCupPriceChange = (seriesId: string, seriesName: string, cupId: string, priceVal: number) => {
    setRules((prev) => {
      const existing = prev.find((r) => r.seriesId === seriesId) || {
        id: `rule_${seriesId}`,
        seriesId,
        seriesName,
        cupPrices: {},
      };

      const prevConfig = existing.cupPrices[cupId] || { enabled: true, price: 10000 };
      const updatedConfig = {
        ...prevConfig,
        price: isNaN(priceVal) ? 0 : priceVal,
      };

      const updatedRules = prev.some((r) => r.seriesId === seriesId)
        ? prev.map((r) => (r.seriesId === seriesId ? { ...r, seriesName, cupPrices: { ...r.cupPrices, [cupId]: updatedConfig } } : r))
        : [...prev, { ...existing, seriesName, cupPrices: { ...existing.cupPrices, [cupId]: updatedConfig } }];

      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRules));
      }
      return updatedRules;
    });

    setSaveStatus('✓ Perubahan harga tersimpan');
    setTimeout(() => setSaveStatus(null), 2000);
  };

  const handleInlineCupToggle = (seriesId: string, seriesName: string, cupId: string, enabled: boolean) => {
    setRules((prev) => {
      const existing = prev.find((r) => r.seriesId === seriesId) || {
        id: `rule_${seriesId}`,
        seriesId,
        seriesName,
        cupPrices: {},
      };

      const prevConfig = existing.cupPrices[cupId] || { enabled: false, price: 10000 };
      const updatedConfig = {
        ...prevConfig,
        enabled,
      };

      const updatedRules = prev.some((r) => r.seriesId === seriesId)
        ? prev.map((r) => (r.seriesId === seriesId ? { ...r, seriesName, cupPrices: { ...r.cupPrices, [cupId]: updatedConfig } } : r))
        : [...prev, { ...existing, seriesName, cupPrices: { ...existing.cupPrices, [cupId]: updatedConfig } }];

      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRules));
      }
      return updatedRules;
    });

    setSaveStatus('✓ Status cup tersimpan');
    setTimeout(() => setSaveStatus(null), 2000);
  };

  // ---------------------------------------------------------------------------
  // Handlers untuk Master Ukuran Cup (Murni Nama Cup Tanpa Harga)
  // ---------------------------------------------------------------------------
  const handleOpenAddCup = () => {
    setEditingCupId(null);
    setCupNameInput('');
    setCupIsActive(true);
    setCupError(null);
    setShowCupModal(true);
  };

  const handleOpenEditCup = (cup: CupTypeItem) => {
    setEditingCupId(cup.id);
    setCupNameInput(cup.name);
    setCupIsActive(cup.isActive !== false);
    setCupError(null);
    setShowCupModal(true);
  };

  const handleToggleCupStatus = async (cup: CupTypeItem) => {
    const newStatus = cup.isActive === false ? true : false;
    setTogglingCupId(cup.id);
    const res = await api.patch(`/cup-types/${cup.id}`, {
      isActive: newStatus,
    });
    setTogglingCupId(null);

    if (res.success) {
      setCupList((prev) =>
        prev.map((c) => (c.id === cup.id ? { ...c, isActive: newStatus } : c))
      );
    } else {
      alert(res.error?.message || 'Gagal mengubah status aktif ukuran cup');
    }
  };

  const handleSaveCup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cupNameInput.trim()) {
      setCupError('Nama ukuran cup wajib diisi');
      return;
    }

    setSubmittingCup(true);
    setCupError(null);

    if (editingCupId) {
      // Edit Cup (PATCH)
      const res = await api.patch<CupTypeItem>(`/cup-types/${editingCupId}`, {
        name: cupNameInput.trim(),
        price: 0,
        isActive: cupIsActive,
      });
      setSubmittingCup(false);

      if (res.success && res.data) {
        setCupList((prev) =>
          prev.map((c) =>
            c.id === editingCupId
              ? { ...c, name: cupNameInput.trim(), isActive: cupIsActive }
              : c
          )
        );
        setShowCupModal(false);
      } else {
        setCupError(res.error?.message || 'Gagal mengubah ukuran cup');
      }
    } else {
      // Tambah Cup Baru (POST)
      const res = await api.post<CupTypeItem>('/cup-types', {
        name: cupNameInput.trim(),
        price: 0,
      });

      setSubmittingCup(false);

      if (res.success && res.data) {
        const newCup = res.data;
        setCupList((prev) => [...prev, newCup]);

        // Tambah config ke seluruh rules
        const updatedRules = rules.map((r) => ({
          ...r,
          cupPrices: {
            ...r.cupPrices,
            [newCup.id]: { enabled: true, price: 10000 },
          },
        }));
        savePersistedRules(updatedRules);

        setCupNameInput('');
        setCupIsActive(true);
        setShowCupModal(false);
      } else {
        setCupError(res.error?.message || 'Gagal menyimpan ukuran cup');
      }
    }
  };

  const handleDeleteCup = async (cupId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus varian ukuran cup ini?')) return;
    const res = await api.delete(`/cup-types/${cupId}`);
    if (res.success) {
      setCupList((prev) => prev.filter((c) => c.id !== cupId));
      const updatedRules = rules.map((r) => {
        const updated = { ...r.cupPrices };
        delete updated[cupId];
        return { ...r, cupPrices: updated };
      });
      savePersistedRules(updatedRules);
    } else {
      alert(res.error?.message || 'Gagal menghapus ukuran cup');
    }
  };

  const activeCups = cupList.filter((c) => c.isActive !== false);
  const activeSeriesOptions = seriesOptions.filter((s) => s.isActive !== false);

  // ---------------------------------------------------------------------------
  // Handlers untuk Rule Harga per Series Modal
  // ---------------------------------------------------------------------------
  const handleOpenAddRule = () => {
    const availableSeries = activeSeriesOptions.length > 0 ? activeSeriesOptions : seriesOptions;
    if (availableSeries.length === 0) {
      alert('Belum ada series teh. Tambahkan series terlebih dahulu.');
      return;
    }
    if (activeCups.length === 0) {
      alert('Belum ada ukuran cup yang aktif. Aktifkan minimal 1 ukuran cup terlebih dahulu.');
      return;
    }
    setEditingRuleId(null);
    setSelectedSeriesId(availableSeries[0].id);

    const initialConfig: Record<string, CupPriceConfig> = {};
    activeCups.forEach((c) => {
      let defaultP = 10000;
      const cName = c.name.toLowerCase();
      if (cName.includes('kecil') || cName.includes('reguler')) defaultP = 5000;
      else if (cName.includes('medium') || cName.includes('sedang')) defaultP = 8000;
      else if (cName.includes('big') || cName.includes('besar')) defaultP = 10000;
      else if (cName.includes('jumbo')) defaultP = 12000;

      initialConfig[c.id] = { enabled: true, price: defaultP };
    });
    setModalCupPrices(initialConfig);
    setRuleError(null);
    setShowRuleModal(true);
  };

  const handleOpenEditRule = (rule: SeriesCupRule) => {
    setEditingRuleId(rule.id);
    setSelectedSeriesId(rule.seriesId);

    const updatedConfig: Record<string, CupPriceConfig> = {};
    activeCups.forEach((c) => {
      if (rule.cupPrices[c.id]) {
        updatedConfig[c.id] = { ...rule.cupPrices[c.id] };
      } else {
        let defaultP = 10000;
        const cName = c.name.toLowerCase();
        if (cName.includes('kecil') || cName.includes('reguler')) defaultP = 5000;
        else if (cName.includes('medium') || cName.includes('sedang')) defaultP = 8000;
        else if (cName.includes('big') || cName.includes('besar')) defaultP = 10000;
        else if (cName.includes('jumbo')) defaultP = 12000;

        updatedConfig[c.id] = { enabled: false, price: defaultP };
      }
    });
    setModalCupPrices(updatedConfig);
    setRuleError(null);
    setShowRuleModal(true);
  };

  const handleToggleCupPrice = (cupId: string, enabled: boolean) => {
    setModalCupPrices((prev) => ({
      ...prev,
      [cupId]: {
        ...(prev[cupId] || { price: 10000 }),
        enabled,
      },
    }));
  };

  const handlePriceChange = (cupId: string, priceStr: string) => {
    const parsed = parseInt(priceStr, 10);
    setModalCupPrices((prev) => ({
      ...prev,
      [cupId]: {
        ...(prev[cupId] || { enabled: true }),
        price: isNaN(parsed) ? 0 : parsed,
      },
    }));
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    const seriesObj = seriesOptions.find((s) => s.id === selectedSeriesId);
    if (!seriesObj) {
      setRuleError('Series teh wajib dipilih dari dropdown');
      return;
    }

    const hasEnabled = Object.values(modalCupPrices).some((cp) => cp.enabled);
    if (!hasEnabled) {
      setRuleError('Pilih minimal 1 ukuran cup yang aktif untuk series ini');
      return;
    }

    let updated: SeriesCupRule[];
    if (editingRuleId) {
      updated = rules.map((r) =>
        r.id === editingRuleId
          ? {
              ...r,
              seriesId: selectedSeriesId,
              seriesName: seriesObj.name,
              cupPrices: modalCupPrices,
            }
          : r
      );
    } else {
      updated = [
        ...rules.filter((r) => r.seriesId !== selectedSeriesId),
        {
          id: `r_${Date.now()}`,
          seriesId: selectedSeriesId,
          seriesName: seriesObj.name,
          cupPrices: modalCupPrices,
        },
      ];
    }

    savePersistedRules(updated);
    setShowRuleModal(false);
    setEditingRuleId(null);
    setRuleError(null);
  };

  const handleDeleteRule = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus aturan harga series ini?')) {
      const updated = rules.filter((r) => r.id !== id);
      savePersistedRules(updated);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manajemen Ukuran Cup & Penetapan Harga</h1>
          <p className="text-sm text-slate-500">
            Kelola master ukuran cup dan tentukan harga dinamis per kategori series teh
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            data-testid="add-cup-btn"
            onClick={handleOpenAddCup}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Tambah Ukuran Cup
          </button>
        </div>
      </div>

      {/* Modal Tambah / Edit Master Cup (Murni Nama Cup Tanpa Input Harga) */}
      {showCupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={handleSaveCup} className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">
              {editingCupId ? 'Edit Nama Ukuran Cup' : 'Tambah Ukuran Cup Baru'}
            </h2>

            {cupError && (
              <div data-testid="cup-error" className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-sm text-red-700 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{cupError}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700">Nama Ukuran Cup *</label>
              <input
                data-testid="cup-name-input"
                type="text"
                value={cupNameInput}
                onChange={(e) => setCupNameInput(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
                placeholder="misal: Cup Jumbo (1 Liter)"
                required
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Harga jual untuk cup ini diatur secara fleksibel pada tabel Matriks Harga per Series di bawah.
              </p>
            </div>

            {editingCupId && (
              <div className="pt-1">
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition">
                  <input
                    type="checkbox"
                    checked={cupIsActive}
                    onChange={(e) => setCupIsActive(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="text-sm font-semibold text-slate-800">Status Aktif Ukuran Cup</span>
                    <p className="text-xs text-slate-500">Non-aktifkan jika ukuran cup ini sementara tidak digunakan di outlet.</p>
                  </div>
                </label>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCupModal(false)}
                disabled={submittingCup}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submittingCup}
                data-testid="cup-save-btn"
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {submittingCup ? 'Menyimpan...' : editingCupId ? 'Update' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Edit / Tambah Aturan Harga & Ukuran Cup per Series */}
      {showRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={handleSaveRule} className="w-full max-w-lg space-y-5 rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-lg font-bold text-slate-900">
                {editingRuleId ? 'Edit Aturan Harga & Ukuran Cup' : 'Tambah Aturan Series Baru'}
              </h2>
              <button type="button" onClick={() => setShowRuleModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {ruleError && <p className="text-sm text-red-600 font-medium">{ruleError}</p>}

            <div>
              <label className="block text-sm font-semibold text-slate-700">Pilih Series Teh (Kategori)</label>
              <select
                value={selectedSeriesId}
                onChange={(e) => setSelectedSeriesId(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 focus:border-emerald-500 focus:outline-none"
              >
                {seriesOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.isActive === false ? '(Non-Aktif)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700">
                Ketersediaan Cup & Harga Jual per Series (IDR):
              </label>

              <div className="space-y-3 max-h-64 overflow-y-auto border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                {activeCups.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">Belum ada ukuran cup yang aktif.</p>
                ) : (
                  activeCups.map((cup) => {
                    const config = modalCupPrices[cup.id] || { enabled: false, price: 10000 };
                    return (
                      <div
                        key={cup.id}
                        className={`flex items-center justify-between gap-4 p-3 rounded-lg border transition ${
                          config.enabled ? 'bg-white border-emerald-200 shadow-sm' : 'bg-slate-100/70 border-slate-200 opacity-60'
                        }`}
                      >
                        <label className="flex items-center gap-3 cursor-pointer text-sm font-semibold text-slate-800">
                          <input
                            type="checkbox"
                            checked={config.enabled}
                            onChange={(e) => handleToggleCupPrice(cup.id, e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>{cup.name}</span>
                        </label>

                        {config.enabled ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-500">Harga (Rp):</span>
                            <input
                              type="number"
                              value={config.price || ''}
                              onChange={(e) => handlePriceChange(cup.id, e.target.value)}
                              className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm font-bold text-emerald-700 focus:border-emerald-500 focus:outline-none text-right"
                              placeholder="10000"
                            />
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-slate-400 italic">Tidak Tersedia</span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowRuleModal(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                {editingRuleId ? 'Update Aturan Harga' : 'Simpan Aturan Harga'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SECTION 1: Master Ukuran Cup List (Tanpa Harga) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-700" />
            <h2 className="text-lg font-bold text-slate-900">Varian Master Ukuran Cup</h2>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {cupList.length} Ukuran Terdaftar ({activeCups.length} Aktif)
          </span>
        </div>

        {loading && cupList.length === 0 ? (
          <div className="flex items-center justify-center gap-2 p-8 bg-white border border-slate-200 rounded-xl">
            <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
            <span className="text-sm text-slate-500">Memuat ukuran cup dari database...</span>
          </div>
        ) : cupList.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 bg-white border border-slate-200 rounded-xl">
            Belum ada varian ukuran cup di database. Klik tombol &quot;+ Tambah Ukuran Cup&quot; di atas.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
            {cupList.map((cup) => {
              const active = cup.isActive !== false;
              return (
                <div
                  key={cup.id}
                  className={`rounded-xl border bg-white p-4 shadow-sm flex flex-col justify-between gap-3 transition ${
                    active ? 'border-slate-200 hover:border-slate-300' : 'border-slate-200 bg-slate-50/70 opacity-80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{cup.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate max-w-[120px]">
                        ID: {cup.id.slice(0, 8)}...
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleCupStatus(cup)}
                      disabled={togglingCupId === cup.id}
                      title={active ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'}
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold transition border ${
                        active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {active ? 'Aktif' : 'Non-Aktif'}
                    </button>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleOpenEditCup(cup)}
                      className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 hover:text-emerald-700 transition"
                      title="Edit Nama & Status Ukuran Cup"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteCup(cup.id)}
                      className="flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition"
                      title="Hapus Ukuran Cup"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: Matriks Harga Cup Spesifik per Series Teh (Fully Dynamic & Inline) */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-emerald-700" />
              <h2 className="text-lg font-bold text-slate-900">
                Matriks Harga Cup Dinamis per Series Teh (Live Matrix Editor)
              </h2>
              {saveStatus && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 animate-pulse">
                  {saveStatus}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Edit harga jual dan ketersediaan cup langsung di tabel matriks di bawah ini. Semua perubahan tersinkronisasi otomatis.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAddRule}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Atur via Modal
            </button>
          </div>
        </div>

        {/* Tabel Matriks Harga Dinamis */}
        <p className="text-[11px] text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 sm:hidden flex items-center gap-1.5 font-medium mb-2">
          👉 <span>Geser tabel ke samping untuk melihat seluruh ukuran cup aktif</span>
        </p>
        <div className="overflow-x-auto w-full max-w-full block rounded-lg border border-slate-200">
          <table className="w-full min-w-[700px] text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3 font-bold text-slate-800 whitespace-nowrap min-w-[200px]">
                  Kategori / Series Teh
                </th>
                {activeCups.length === 0 ? (
                  <th className="px-4 py-3 text-center text-slate-400 italic">
                    Belum ada ukuran cup aktif
                  </th>
                ) : (
                  activeCups.map((cup) => (
                    <th key={cup.id} className="px-4 py-3 text-center font-bold text-slate-800 whitespace-nowrap min-w-[160px]">
                      <div className="flex flex-col items-center gap-0.5">
                        <span>{cup.name}</span>
                        <span className="text-[10px] font-normal text-slate-400 capitalize">Ukuran Aktif</span>
                      </div>
                    </th>
                  ))
                )}
                <th className="px-6 py-3 text-right font-bold text-slate-800 whitespace-nowrap">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {activeSeriesOptions.length === 0 ? (
                <tr>
                  <td colSpan={activeCups.length + 2} className="px-6 py-8 text-center text-slate-500">
                    Belum ada series teh yang aktif. Silakan tambahkan atau aktifkan series di menu Series Teh.
                  </td>
                </tr>
              ) : (
                activeSeriesOptions.map((series) => {
                  const rule = rules.find((r) => r.seriesId === series.id);
                  const effectiveRule: SeriesCupRule = rule || {
                    id: `rule_${series.id}`,
                    seriesId: series.id,
                    seriesName: series.name,
                    cupPrices: {},
                  };

                  return (
                    <tr key={series.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-6 py-4 font-bold text-slate-900 align-middle">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900">{series.name}</span>
                          <span className="text-[11px] font-semibold text-emerald-700">Series Aktif</span>
                        </div>
                      </td>

                      {activeCups.map((cup) => {
                        const config = effectiveRule.cupPrices[cup.id] ?? {
                          enabled: true,
                          price: 10000,
                        };
                        const isEnabled = config.enabled !== false;

                        return (
                          <td key={cup.id} className="px-3 py-3 text-center align-middle">
                            <div className={`p-2.5 rounded-lg border transition ${
                              isEnabled ? 'bg-white border-emerald-200 shadow-xs' : 'bg-slate-50 border-slate-200 opacity-60'
                            }`}>
                              {/* Toggle Checkbox */}
                              <div className="flex items-center justify-between gap-1 mb-2">
                                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={isEnabled}
                                    onChange={(e) => handleInlineCupToggle(series.id, series.name, cup.id, e.target.checked)}
                                    className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                  />
                                  <span className="text-[11px]">{isEnabled ? 'Tersedia' : 'Nonaktif'}</span>
                                </label>
                              </div>

                              {/* Numeric Price Input */}
                              {isEnabled ? (
                                <div className="relative flex items-center">
                                  <span className="absolute left-2 text-xs font-bold text-emerald-700 select-none">Rp</span>
                                  <input
                                    type="number"
                                    step={500}
                                    value={config.price || ''}
                                    onChange={(e) =>
                                      handleInlineCupPriceChange(
                                        series.id,
                                        series.name,
                                        cup.id,
                                        parseInt(e.target.value, 10)
                                      )
                                    }
                                    className="w-full rounded-md border border-slate-300 pl-8 pr-2 py-1 text-xs font-bold text-emerald-800 text-right focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                    placeholder="10000"
                                  />
                                </div>
                              ) : (
                                <div className="text-[11px] text-slate-400 italic py-1 text-center">
                                  Tidak Dijual
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      <td className="px-6 py-4 text-right align-middle whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditRule(effectiveRule)}
                            className="flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                            title="Atur via Modal"
                          >
                            <Pencil className="h-3.5 w-3.5 text-slate-500" />
                            Modal
                          </button>
                          {rule && (
                            <button
                              onClick={() => handleDeleteRule(rule.id)}
                              className="flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                              title="Reset Aturan Harga"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}