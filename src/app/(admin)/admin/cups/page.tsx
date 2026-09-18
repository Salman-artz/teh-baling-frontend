'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatRupiah } from '@/lib/utils';
import { Pencil, Trash2, Settings, Plus, Check, X, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api-client';

interface CupTypeItem {
  id: string;
  name: string;
  price?: number;
}

interface SeriesOption {
  id: string;
  name: string;
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

  // Aturan Harga & Ketersediaan Cup per Series Teh (LocalStorage / State)
  const [rules, setRules] = useState<SeriesCupRule[]>([]);

  // Modal State untuk Master Ukuran Cup (Tambah & Edit)
  const [showCupModal, setShowCupModal] = useState(false);
  const [editingCupId, setEditingCupId] = useState<string | null>(null);
  const [cupNameInput, setCupNameInput] = useState('');
  const [cupPriceInput, setCupPriceInput] = useState('10000');
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
      api.get<CupTypeItem[]>('/cup-types'),
      api.get<SeriesOption[]>('/tea-series'),
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
      // Initialize default rules from series & cup prices
      const initialRules: SeriesCupRule[] = seriesOptions.map((s, idx) => {
        const cupPrices: Record<string, CupPriceConfig> = {};
        cupList.forEach((c) => {
          const basePrice = c.price || 10000;
          cupPrices[c.id] = { enabled: true, price: basePrice + idx * 2000 };
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

  // ---------------------------------------------------------------------------
  // Handlers untuk Master Ukuran Cup (Tambah & Edit)
  // ---------------------------------------------------------------------------
  const handleOpenAddCup = () => {
    setEditingCupId(null);
    setCupNameInput('');
    setCupPriceInput('10000');
    setCupError(null);
    setShowCupModal(true);
  };

  const handleOpenEditCup = (cup: CupTypeItem) => {
    setEditingCupId(cup.id);
    setCupNameInput(cup.name);
    setCupPriceInput(String(cup.price || 10000));
    setCupError(null);
    setShowCupModal(true);
  };

  const handleSaveCup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cupNameInput.trim()) {
      setCupError('Nama ukuran cup wajib diisi');
      return;
    }

    const priceNum = parseInt(cupPriceInput, 10);
    if (isNaN(priceNum) || priceNum < 0) {
      setCupError('Harga dasar cup harus bernilai positif');
      return;
    }

    setSubmittingCup(true);
    setCupError(null);

    if (editingCupId) {
      // Edit Cup (PATCH)
      const res = await api.patch<CupTypeItem>(`/cup-types/${editingCupId}`, {
        name: cupNameInput.trim(),
        price: priceNum,
      });
      setSubmittingCup(false);

      if (res.success && res.data) {
        setCupList((prev) =>
          prev.map((c) => (c.id === editingCupId ? { ...c, name: cupNameInput.trim(), price: priceNum } : c))
        );
        setShowCupModal(false);
      } else {
        setCupError(res.error?.message || 'Gagal mengubah ukuran cup');
      }
    } else {
      // Tambah Cup Baru (POST)
      const res = await api.post<CupTypeItem>('/cup-types', {
        name: cupNameInput.trim(),
        price: priceNum,
      });

      setSubmittingCup(false);

      if (res.success && res.data) {
        const newCup = res.data;
        setCupList((prev) => [...prev, newCup]);

        // Tambah default price config ke seluruh rules
        const updatedRules = rules.map((r) => ({
          ...r,
          cupPrices: {
            ...r.cupPrices,
            [newCup.id]: { enabled: true, price: priceNum },
          },
        }));
        savePersistedRules(updatedRules);

        setCupNameInput('');
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

  // ---------------------------------------------------------------------------
  // Handlers untuk Rule Harga per Series
  // ---------------------------------------------------------------------------
  const handleOpenAddRule = () => {
    if (seriesOptions.length === 0) {
      alert('Belum ada series teh. Tambahkan series terlebih dahulu.');
      return;
    }
    setEditingRuleId(null);
    setSelectedSeriesId(seriesOptions[0].id);

    const initialConfig: Record<string, CupPriceConfig> = {};
    cupList.forEach((c) => {
      initialConfig[c.id] = { enabled: true, price: c.price || 10000 };
    });
    setModalCupPrices(initialConfig);
    setRuleError(null);
    setShowRuleModal(true);
  };

  const handleOpenEditRule = (rule: SeriesCupRule) => {
    setEditingRuleId(rule.id);
    setSelectedSeriesId(rule.seriesId);

    const updatedConfig: Record<string, CupPriceConfig> = {};
    cupList.forEach((c) => {
      if (rule.cupPrices[c.id]) {
        updatedConfig[c.id] = { ...rule.cupPrices[c.id] };
      } else {
        updatedConfig[c.id] = { enabled: false, price: c.price || 10000 };
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
            Kelola master ukuran cup dan tetapkan harga spesifik per kategori series teh langsung ke database
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
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 transition"
          >
            + Tambah Master Ukuran Cup
          </button>
        </div>
      </div>

      {/* Modal Tambah / Edit Master Cup */}
      {showCupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={handleSaveCup} className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">
              {editingCupId ? 'Edit Master Ukuran Cup' : 'Tambah Master Ukuran Cup Baru'}
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
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Harga Standar Default (Rp) *</label>
              <input
                type="number"
                value={cupPriceInput}
                onChange={(e) => setCupPriceInput(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none font-bold"
                placeholder="10000"
                required
              />
            </div>

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
                {submittingCup ? 'Menyimpan...' : 'Simpan'}
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
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700">
                Ketersediaan Cup & Harga Jual (IDR):
              </label>

              <div className="space-y-3 max-h-64 overflow-y-auto border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                {cupList.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">Belum ada master ukuran cup.</p>
                ) : (
                  cupList.map((cup) => {
                    const config = modalCupPrices[cup.id] || { enabled: false, price: cup.price || 10000 };
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
                              placeholder="12000"
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

      {/* SECTION 1: Master Ukuran Cup List */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Varian Master Ukuran Cup</h2>
        {loading && cupList.length === 0 ? (
          <div className="flex items-center justify-center gap-2 p-8 bg-white border border-slate-200 rounded-xl">
            <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
            <span className="text-sm text-slate-500">Memuat ukuran cup dari database...</span>
          </div>
        ) : cupList.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 bg-white border border-slate-200 rounded-xl">
            Belum ada varian ukuran cup di database. Klik tombol &quot;+ Tambah Master Ukuran Cup&quot; di atas.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
            {cupList.map((cup) => (
              <div key={cup.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 text-sm">{cup.name}</p>
                  <p className="text-xs font-semibold text-emerald-700">{formatRupiah(cup.price || 10000)}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEditCup(cup)}
                    className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 hover:text-emerald-700"
                    title="Edit Ukuran Cup"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCup(cup.id)}
                    className="rounded-md border border-red-200 p-1.5 text-red-600 hover:bg-red-50"
                    title="Hapus Ukuran Cup"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: Matriks Harga Cup Spesifik per Series Teh */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Settings className="h-5 w-5 text-emerald-700" />
              Matriks Harga Cup per Series Teh (Dynamic Series Pricing)
            </h2>
            <p className="text-xs text-slate-500">
              Setiap kategori series teh memiliki ketersediaan ukuran cup dan nominal harga jual spesifik
            </p>
          </div>
          <button
            onClick={handleOpenAddRule}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition shadow-sm"
          >
            <Plus className="h-4 w-4" />
            + Atur Harga Series
          </button>
        </div>

        {/* Tabel Matriks Harga */}
        <p className="text-[11px] text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 sm:hidden flex items-center gap-1.5 font-medium mb-2">
          👉 <span>Geser tabel ke samping untuk melihat seluruh ukuran cup</span>
        </p>
        <div className="overflow-x-auto w-full max-w-full block rounded-lg border border-slate-200">
          <table className="w-full min-w-[650px] text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3 font-semibold text-slate-700 whitespace-nowrap">Kategori / Series Teh</th>
                {cupList.map((cup) => (
                  <th key={cup.id} className="px-4 py-3 text-center font-semibold text-slate-700 whitespace-nowrap">
                    {cup.name}
                  </th>
                ))}
                <th className="px-6 py-3 text-right whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rules.length === 0 ? (
                <tr>
                  <td colSpan={cupList.length + 2} className="px-6 py-8 text-center text-slate-500">
                    Belum ada aturan harga series yang dikonfigurasi.
                  </td>
                </tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50/80">
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {rule.seriesName}
                    </td>
                    {cupList.map((cup) => {
                      const config = rule.cupPrices[cup.id];
                      return (
                        <td key={cup.id} className="px-4 py-4 text-center">
                          {config && config.enabled ? (
                            <div className="inline-flex flex-col items-center">
                              <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200 shadow-2xs">
                                {formatRupiah(config.price)}
                              </span>
                              <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-0.5 mt-0.5">
                                <Check className="h-3 w-3" /> Tersedia
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs font-medium text-slate-400 italic">
                              - Nonaktif
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditRule(rule)}
                          className="flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          <Pencil className="h-3.5 w-3.5 text-slate-500" />
                          Edit Harga
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          Hapus
                        </button>
                      </div>
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