'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, downloadFile } from '@/lib/api-client';
import { getWibDateString } from '@/lib/utils';
import {
  RefreshCw,
  Calendar,
  Plus,
  Pencil,
  Trash2,
  X,
  AlertCircle,
  Truck,
  Store,
  FileSpreadsheet,
  Droplets,
  Search,
} from 'lucide-react';

interface DeliveryRecord {
  id: string;
  staffId?: string;
  boothId: string;
  date: string;
  time: string;
  staffName: string;
  staffEmail?: string;
  boothName: string;
  boothAddress?: string;
  liters: number;
  notes: string;
  status: string;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive?: boolean;
}

interface BoothOption {
  id: string;
  name: string;
  address: string;
  isActive: boolean;
}

interface StockSummary {
  date: string;
  yesterdayDate?: string;
  initialStock?: number;
  initialKitchenStock?: number;
  initialBoothStock?: number;
  totalCooked: number;
  totalDelivered: number;
  totalAvailableStock?: number;
  remainingStock: number;
}

export default function AdminDeliveriesPage() {
  const todayStr = getWibDateString();
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBoothId, setFilterBoothId] = useState('ALL');

  const [deliveryRecords, setDeliveryRecords] = useState<DeliveryRecord[]>([]);
  const [staffList, setStaffList] = useState<UserOption[]>([]);
  const [booths, setBooths] = useState<BoothOption[]>([]);
  const [loading, setLoading] = useState(false);

  // Live stock state
  const [stockSummary, setStockSummary] = useState<StockSummary | null>(null);
  const [loadingStock, setLoadingStock] = useState(false);

  // Modal Delivery Form State
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [editingDeliveryId, setEditingDeliveryId] = useState<string | null>(null);
  const [formDeliveryDate, setFormDeliveryDate] = useState(todayStr);
  const [formDeliveryStaffId, setFormDeliveryStaffId] = useState('');
  const [formDeliveryBoothId, setFormDeliveryBoothId] = useState('');
  const [formDeliveryLiters, setFormDeliveryLiters] = useState('');
  const [formDeliveryNotes, setFormDeliveryNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  const fetchStaffAndBooths = useCallback(async () => {
    try {
      const [staffRes, boothRes] = await Promise.all([
        api.get<UserOption[]>('/users?all=true'),
        api.get<BoothOption[]>('/booths'),
      ]);

      if (staffRes.success && Array.isArray(staffRes.data)) {
        setStaffList(staffRes.data);
      }
      if (boothRes.success && Array.isArray(boothRes.data)) {
        setBooths(boothRes.data);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchStock = useCallback(async (dateStr?: string) => {
    setLoadingStock(true);
    try {
      const targetDate = dateStr || fromDate || todayStr;
      const res = await api.get<StockSummary>(`/production-stock?date=${targetDate}`);
      if (res.success && res.data) {
        setStockSummary(res.data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingStock(false);
    }
  }, [fromDate, todayStr]);

  const fetchDeliveries = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (fromDate) queryParams.append('fromDate', fromDate);
      if (toDate) queryParams.append('toDate', toDate);
      if (searchQuery) queryParams.append('search', searchQuery);
      if (filterBoothId && filterBoothId !== 'ALL') {
        queryParams.append('boothId', filterBoothId);
      }

      const res = await api.get<DeliveryRecord[]>(`/production-deliveries?${queryParams.toString()}`);
      if (res.success && Array.isArray(res.data)) {
        setDeliveryRecords(res.data);
      } else {
        setDeliveryRecords([]);
      }
      fetchStock();
    } catch {
      setDeliveryRecords([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, searchQuery, filterBoothId, fetchStock]);

  useEffect(() => {
    fetchStaffAndBooths();
  }, [fetchStaffAndBooths]);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  const handleSetToday = () => {
    setFromDate(todayStr);
    setToDate(todayStr);
  };

  const handleSetAll = () => {
    setFromDate('');
    setToDate('');
  };

  const handleOpenAddDelivery = () => {
    setEditingDeliveryId(null);
    setFormDeliveryDate(todayStr);
    const prodStaff = staffList.find((s) => s.role === 'PRODUCTION') || staffList[0];
    setFormDeliveryStaffId(prodStaff ? prodStaff.id : '');
    setFormDeliveryBoothId(booths[0]?.id || '');
    setFormDeliveryLiters('');
    setFormDeliveryNotes('');
    setFormError(null);
    fetchStock(todayStr);
    setShowDeliveryModal(true);
  };

  const handleOpenEditDelivery = (record: DeliveryRecord) => {
    setEditingDeliveryId(record.id);
    setFormDeliveryDate(record.date);
    setFormDeliveryStaffId(record.staffId || staffList[0]?.id || '');
    setFormDeliveryBoothId(record.boothId || booths[0]?.id || '');
    setFormDeliveryLiters(String(record.liters));
    setFormDeliveryNotes(record.notes && record.notes !== '-' ? record.notes : '');
    setFormError(null);
    fetchStock(record.date);
    setShowDeliveryModal(true);
  };

  const handleSaveDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDeliveryBoothId) {
      setFormError('Silakan pilih booth tujuan pengiriman');
      return;
    }

    const litersNum = parseFloat(formDeliveryLiters);
    if (isNaN(litersNum) || litersNum <= 0) {
      setFormError('Total liter pengiriman wajib diisi angka lebih besar dari 0');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      if (editingDeliveryId) {
        const res = await api.patch(`/production-deliveries/${editingDeliveryId}`, {
          boothId: formDeliveryBoothId,
          totalLiters: litersNum,
          notes: formDeliveryNotes.trim() || undefined,
          deliveryDate: formDeliveryDate,
          staffId: formDeliveryStaffId || undefined,
        });

        if (res.success) {
          setShowDeliveryModal(false);
          fetchDeliveries();
        } else {
          setFormError(res.error?.message || 'Gagal mengubah laporan pengiriman');
        }
      } else {
        const res = await api.post('/production-deliveries', {
          boothId: formDeliveryBoothId,
          totalLiters: litersNum,
          notes: formDeliveryNotes.trim() || undefined,
          deliveryDate: formDeliveryDate,
          staffId: formDeliveryStaffId || undefined,
        });

        if (res.success) {
          setShowDeliveryModal(false);
          fetchDeliveries();
        } else {
          setFormError(res.error?.message || 'Gagal menambahkan pengiriman');
        }
      }
    } catch {
      setFormError('Terjadi gangguan jaringan atau server saat menyimpan data.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDelivery = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data pengiriman teh ke booth ini?')) {
      return;
    }

    try {
      const res = await api.delete(`/production-deliveries/${id}`);
      if (res.success) {
        setDeliveryRecords((prev) => prev.filter((r) => r.id !== id));
        fetchStock();
      } else {
        alert(res.error?.message || 'Gagal menghapus data pengiriman');
      }
    } catch {
      alert('Terjadi kesalahan saat menghapus data pengiriman');
    }
  };

  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (fromDate) queryParams.append('from', fromDate);
      if (toDate) queryParams.append('to', toDate);
      if (filterBoothId && filterBoothId !== 'ALL') {
        queryParams.append('boothId', filterBoothId);
      }
      const query = queryParams.toString() ? `?${queryParams.toString()}` : '';

      await downloadFile(
        `/export/production-deliveries${query}`,
        `Laporan_Pengiriman_Teh_Booth_${fromDate || 'All'}_sd_${toDate || 'All'}.xlsx`
      );
    } finally {
      setExportLoading(false);
    }
  };

  const totalLitersDelivered = deliveryRecords.reduce((acc, r) => acc + r.liters, 0);
  const totalSessionsDelivered = deliveryRecords.length;
  const avgLitersDelivered = totalSessionsDelivered > 0 ? (totalLitersDelivered / totalSessionsDelivered).toFixed(1) : '0';

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Truck className="w-7 h-7 text-emerald-700" />
            <span>Laporan Pengiriman Teh ke Booth</span>
          </h1>
          <p className="text-sm text-slate-500">
            Rekapitulasi distribusi teh dari dapur produksi ke seluruh outlet booth (Anti Defisit Stok)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchDeliveries}
            disabled={loading}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleExportExcel}
            disabled={exportLoading}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 transition flex items-center gap-2 disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {exportLoading ? 'Mengunduh...' : 'Export Excel'}
          </button>
          <button
            onClick={handleOpenAddDelivery}
            className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-900 transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Catat Pengiriman Booth
          </button>
        </div>
      </div>

      {/* Metric Cards Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-emerald-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Teh Dikirim</p>
          <p className="mt-2 text-2xl font-bold text-emerald-950">{totalLitersDelivered.toFixed(1)} Liter</p>
          <p className="mt-1 text-xs text-emerald-700 font-semibold">🚚 Telah tiba di booth</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Sesi Kirim</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{totalSessionsDelivered} Kali</p>
          <p className="mt-1 text-xs text-slate-500">Distribusi jerigen teh</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Rata-rata Per Kirim</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{avgLitersDelivered} Liter</p>
          <p className="mt-1 text-xs text-slate-500">Volume per armada</p>
        </div>

        <div
          className={`rounded-xl border p-5 shadow-sm ${
            (stockSummary?.remainingStock ?? 0) > 0
              ? 'bg-emerald-50/70 border-emerald-300'
              : 'bg-amber-50/70 border-amber-300'
          }`}
        >
          <p className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
            <Droplets className="w-3.5 h-3.5 text-emerald-700" /> Sisa Stok Dapur
          </p>
          <p className="mt-2 text-2xl font-black text-emerald-950">
            {loadingStock ? '...' : `${stockSummary?.remainingStock ?? 0} Liter`}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">
            Awal: {stockSummary?.initialStock ?? 0} L | Masak: {stockSummary?.totalCooked ?? 0} L | Kirim: {stockSummary?.totalDelivered ?? 0} L
          </p>
        </div>
      </div>

      {/* Filter Box */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="font-bold text-slate-700 text-sm flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-700" />
            Filter Data Laporan Pengiriman
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleSetToday}
              className={`px-3 py-1 rounded-lg font-semibold text-xs transition ${
                fromDate === todayStr && toDate === todayStr
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={handleSetAll}
              className={`px-3 py-1 rounded-lg font-semibold text-xs transition ${
                !fromDate && !toDate
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua Tanggal
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500">Dari Tanggal</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none font-medium"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500">Sampai Tanggal</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none font-medium"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500">Filter Booth</label>
            <select
              value={filterBoothId}
              onChange={(e) => setFilterBoothId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
            >
              <option value="ALL">Semua Outlet Booth</option>
              {booths.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500">Pencarian</label>
            <div className="relative mt-1">
              <input
                type="text"
                placeholder="Cari booth / staf / catatan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full rounded-md border border-slate-300 p-2 pr-8 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabel Laporan Pengiriman ke Booth */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm w-full max-w-full">
        <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-600" />
            <span>Daftar Riwayat Pengiriman Teh ke Outlet Booth</span>
          </h2>
          <span className="text-xs font-semibold text-slate-500">
            {deliveryRecords.length} Sesi Pengiriman
          </span>
        </div>
        <div className="overflow-x-auto w-full max-w-full block">
          <table className="w-full min-w-[850px] text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3 whitespace-nowrap">Tanggal</th>
                <th className="px-6 py-3 whitespace-nowrap">Jam Kirim</th>
                <th className="px-6 py-3 whitespace-nowrap">Booth Tujuan</th>
                <th className="px-6 py-3 whitespace-nowrap">Staf Pengirim</th>
                <th className="px-6 py-3 whitespace-nowrap">Jumlah Dikirim</th>
                <th className="px-6 py-3 whitespace-nowrap">Catatan Pengiriman</th>
                <th className="px-6 py-3 whitespace-nowrap">Status</th>
                <th className="px-6 py-3 text-right whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading && deliveryRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
                      <span>Memuat laporan pengiriman booth...</span>
                    </div>
                  </td>
                </tr>
              ) : deliveryRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                    Belum ada data laporan pengiriman teh ke booth pada filter ini.
                  </td>
                </tr>
              ) : (
                deliveryRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-mono font-semibold text-slate-900 whitespace-nowrap">{r.date}</td>
                    <td className="px-6 py-4 font-mono font-bold text-emerald-700 whitespace-nowrap">{r.time}</td>
                    <td className="px-6 py-4 text-slate-900 font-bold whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Store className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span>{r.boothName}</span>
                      </div>
                      {r.boothAddress && (
                        <span className="block text-[11px] font-normal text-slate-400">{r.boothAddress}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-800 font-medium whitespace-nowrap">
                      {r.staffName}
                      {r.staffEmail && <span className="block text-[11px] text-slate-400">{r.staffEmail}</span>}
                    </td>
                    <td className="px-6 py-4 font-extrabold text-emerald-950 whitespace-nowrap">{r.liters} Liter</td>
                    <td className="px-6 py-4 text-slate-500 text-xs min-w-[180px]">{r.notes}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap align-middle">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditDelivery(r)}
                          className="flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 hover:text-emerald-700 transition"
                          title="Edit Data Pengiriman"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteDelivery(r.id)}
                          className="flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition"
                          title="Hapus Data Pengiriman"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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

      {/* MODAL DELIVERY (PENGIRIMAN) */}
      {showDeliveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={handleSaveDelivery} className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-lg font-bold text-slate-900">
                {editingDeliveryId ? 'Edit Data Pengiriman' : 'Catat Pengiriman Teh ke Booth'}
              </h2>
              <button
                type="button"
                onClick={() => setShowDeliveryModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Info Stok Dapur Real-time */}
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs space-y-1">
              <div className="flex items-center justify-between font-bold text-emerald-900">
                <span className="flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5 text-emerald-700" /> Sisa Stok Siap Kirim ({formDeliveryDate})
                </span>
                <span className="text-sm font-extrabold text-emerald-950">
                  {stockSummary?.remainingStock ?? 0} Liter
                </span>
              </div>
              <p className="text-[11px] text-emerald-700">
                Total Dimasak: {stockSummary?.totalCooked ?? 0} L | Sudah Terkirim: {stockSummary?.totalDelivered ?? 0} L
              </p>
            </div>

            {formError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-sm text-red-700 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Pengiriman *</label>
              <input
                type="date"
                value={formDeliveryDate}
                onChange={(e) => {
                  setFormDeliveryDate(e.target.value);
                  fetchStock(e.target.value);
                }}
                required
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Booth Tujuan *</label>
              <select
                value={formDeliveryBoothId}
                onChange={(e) => setFormDeliveryBoothId(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm font-medium text-slate-900 focus:border-emerald-600 focus:outline-none"
              >
                {booths.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.address})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Staf Pengirim</label>
              <select
                value={formDeliveryStaffId}
                onChange={(e) => setFormDeliveryStaffId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
              >
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Jumlah Teh Dikirim *</label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0.1"
                  value={formDeliveryLiters}
                  onChange={(e) => setFormDeliveryLiters(e.target.value)}
                  placeholder="misal: 25"
                  required
                  className="w-full rounded-lg border border-slate-300 p-2.5 pr-16 text-sm font-bold text-emerald-950 focus:border-emerald-600 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-500">Liter</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Pengiriman (Opsional)</label>
              <textarea
                value={formDeliveryNotes}
                onChange={(e) => setFormDeliveryNotes(e.target.value)}
                placeholder="misal: Jerigen 25L x 1, pengiriman sesi pagi..."
                rows={3}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowDeliveryModal(false)}
                disabled={submitting}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-50"
              >
                {submitting ? 'Menyimpan...' : editingDeliveryId ? 'Update Pengiriman' : 'Simpan Pengiriman'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
