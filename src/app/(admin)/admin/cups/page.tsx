'use client';

import { useState } from 'react';
import { formatRupiah } from '@/lib/utils';
import { Pencil, Trash2, Settings, Plus, Check, X } from 'lucide-react';

interface CupTypeItem {
  id: string;
  name: string;
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
  cupPrices: Record<string, CupPriceConfig>; // cupId -> { enabled, price }
}

export default function CupsPage() {
  // Master Ukuran Cup
  const [cupList, setCupList] = useState<CupTypeItem[]>([
    { id: 'c1', name: 'Cup Kecil (12 oz)' },
    { id: 'c2', name: 'Cup Medium (16 oz)' },
    { id: 'c3', name: 'Cup Big (22 oz)' },
    { id: 'c4', name: 'Cup Jumbo (30 oz)' },
  ]);

  // Master Dropdown Options Series Teh
  const seriesOptions: SeriesOption[] = [
    { id: 's1', name: 'Original Tea Series' },
    { id: 's2', name: 'Yakult Series' },
    { id: 's3', name: 'Fruity Series' },
    { id: 's4', name: 'Milk Tea Series' },
  ];

  // Aturan Harga & Ketersediaan Cup per Series Teh
  const [rules, setRules] = useState<SeriesCupRule[]>([
    {
      id: 'r1',
      seriesId: 's1',
      seriesName: 'Original Tea Series',
      cupPrices: {
        c1: { enabled: true, price: 5000 },
        c2: { enabled: true, price: 8000 },
        c3: { enabled: true, price: 12000 },
        c4: { enabled: true, price: 15000 },
      },
    },
    {
      id: 'r2',
      seriesId: 's2',
      seriesName: 'Yakult Series',
      cupPrices: {
        c1: { enabled: false, price: 7000 },
        c2: { enabled: false, price: 10000 },
        c3: { enabled: true, price: 14000 },
        c4: { enabled: true, price: 18000 },
      },
    },
    {
      id: 'r3',
      seriesId: 's3',
      seriesName: 'Fruity Series',
      cupPrices: {
        c1: { enabled: false, price: 6000 },
        c2: { enabled: false, price: 9000 },
        c3: { enabled: true, price: 13000 },
        c4: { enabled: true, price: 16000 },
      },
    },
  ]);

  // Modal State untuk Master Ukuran Cup Baru
  const [showCupModal, setShowCupModal] = useState(false);
  const [cupNameInput, setCupNameInput] = useState('');
  const [cupError, setCupError] = useState<string | null>(null);

  // Modal State untuk Aturan Harga Cup per Series Teh
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('s1');
  const [modalCupPrices, setModalCupPrices] = useState<Record<string, CupPriceConfig>>({});
  const [ruleError, setRuleError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Handlers untuk Master Ukuran Cup
  // ---------------------------------------------------------------------------
  const handleOpenAddCup = () => {
    setCupNameInput('');
    setCupError(null);
    setShowCupModal(true);
  };

  const handleSaveCup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cupNameInput.trim()) {
      setCupError('Nama ukuran cup wajib diisi');
      return;
    }
    const newCupId = `c_${Date.now()}`;
    setCupList((prev) => [...prev, { id: newCupId, name: cupNameInput.trim() }]);

    // Add default price config to all existing rules
    setRules((prev) =>
      prev.map((r) => ({
        ...r,
        cupPrices: {
          ...r.cupPrices,
          [newCupId]: { enabled: true, price: 10000 },
        },
      }))
    );

    setCupNameInput('');
    setShowCupModal(false);
  };

  const handleDeleteCup = (cupId: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus varian ukuran cup ini?')) {
      setCupList((prev) => prev.filter((c) => c.id !== cupId));
      setRules((prev) =>
        prev.map((r) => {
          const updated = { ...r.cupPrices };
          delete updated[cupId];
          return { ...r, cupPrices: updated };
        })
      );
    }
  };

  // ---------------------------------------------------------------------------
  // Handlers untuk Rule Harga per Series
  // ---------------------------------------------------------------------------
  const handleOpenAddRule = () => {
    setEditingRuleId(null);
    setSelectedSeriesId(seriesOptions[0].id);

    // Initialize default prices for each cup
    const initialConfig: Record<string, CupPriceConfig> = {};
    cupList.forEach((c) => {
      initialConfig[c.id] = { enabled: true, price: 10000 };
    });
    setModalCupPrices(initialConfig);
    setRuleError(null);
    setShowRuleModal(true);
  };

  const handleOpenEditRule = (rule: SeriesCupRule) => {
    setEditingRuleId(rule.id);
    setSelectedSeriesId(rule.seriesId);

    // Copy existing prices, ensure all current cups are present
    const updatedConfig: Record<string, CupPriceConfig> = {};
    cupList.forEach((c) => {
      if (rule.cupPrices[c.id]) {
        updatedConfig[c.id] = { ...rule.cupPrices[c.id] };
      } else {
        updatedConfig[c.id] = { enabled: false, price: 10000 };
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
        ...prev[cupId],
        enabled,
      },
    }));
  };

  const handlePriceChange = (cupId: string, priceStr: string) => {
    const parsed = parseInt(priceStr, 10);
    setModalCupPrices((prev) => ({
      ...prev,
      [cupId]: {
        ...prev[cupId],
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

    // Check if at least one cup is enabled
    const hasEnabled = Object.values(modalCupPrices).some((cp) => cp.enabled);
    if (!hasEnabled) {
      setRuleError('Pilih minimal 1 ukuran cup yang aktif untuk series ini');
      return;
    }

    if (editingRuleId) {
      setRules((prev) =>
        prev.map((r) =>
          r.id === editingRuleId
            ? {
                ...r,
                seriesId: selectedSeriesId,
                seriesName: seriesObj.name,
                cupPrices: modalCupPrices,
              }
            : r
        )
      );
    } else {
      setRules((prev) => [
        ...prev,
        {
          id: `r_${Date.now()}`,
          seriesId: selectedSeriesId,
          seriesName: seriesObj.name,
          cupPrices: modalCupPrices,
        },
      ]);
    }

    setShowRuleModal(false);
    setEditingRuleId(null);
    setRuleError(null);
  };

  const handleDeleteRule = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus aturan harga series ini?')) {
      setRules((prev) => prev.filter((r) => r.id !== id));
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manajemen Ukuran Cup & Penetapan Harga</h1>
          <p className="text-sm text-slate-500">
            Atur variasi ukuran cup minuman dan tetapkan harga spesifik per kategori series teh
          </p>
        </div>
        <button
          data-testid="add-cup-btn"
          onClick={handleOpenAddCup}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 transition"
        >
          + Tambah Master Ukuran Cup
        </button>
      </div>

      {/* Modal Tambah Master Cup */}
      {showCupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={handleSaveCup} className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Tambah Master Ukuran Cup Baru</h2>

            {cupError && <p data-testid="cup-error" className="text-sm text-red-600">{cupError}</p>}

            <div>
              <label className="block text-sm font-medium text-slate-700">Nama Ukuran Cup</label>
              <input
                data-testid="cup-name-input"
                type="text"
                value={cupNameInput}
                onChange={(e) => setCupNameInput(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
                placeholder="misal: Cup Monster (32 oz)"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCupModal(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                data-testid="cup-save-btn"
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Edit / Tambah Aturan Harga & Ukuran Cup per Series (Dropdown Series) */}
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

            {/* Dropdown Select dari Master Series */}
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

            {/* Matrix Setting Harga per Ukuran Cup */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700">
                Ketersediaan Cup & Harga Jual (IDR):
              </label>

              <div className="space-y-3 max-h-64 overflow-y-auto border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                {cupList.map((cup) => {
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
                            placeholder="12000"
                          />
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-slate-400 italic">Tidak Tersedia</span>
                      )}
                    </div>
                  );
                })}
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          {cupList.map((cup) => (
            <div key={cup.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">{cup.name}</p>
                <p className="text-xs text-slate-500">ID: {cup.id}</p>
              </div>
              <button
                onClick={() => handleDeleteCup(cup.id)}
                className="rounded-md border border-red-200 p-1.5 text-red-600 hover:bg-red-50"
                title="Hapus Ukuran Cup"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
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
              {rules.map((rule) => (
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}