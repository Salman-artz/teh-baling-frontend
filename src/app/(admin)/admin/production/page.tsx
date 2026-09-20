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
  Flame,
  FileSpreadsheet,
  Search,
} from 'lucide-react';

interface CookingRecord {
  id: string;
  staffId?: string;
  date: string;
  time: string;
  staffName: string;
  staffEmail?: string;
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

export default function AdminProductionPage() {
  const todayStr = getWibDateString();
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);
  const [searchQuery, setSearchQuery] = useState('');

  const [cookingRecords, setCookingRecords] = useState<CookingRecord[]>([]);
  const [staffList, setStaffList] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal Cooking Form State
  const [showCookingModal, setShowCookingModal] = useState(false);
  const [editingCookingId, setEditingCookingId] = useState<string | null>(null);
  const [formCookingDate, setFormCookingDate] = useState(todayStr);
  const [formCookingStaffId, setFormCookingStaffId] = useState('');
  const [formCookingLiters, setFormCookingLiters] = useState('');
  const [formCookingNotes, setFormCookingNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  const fetchStaff = useCallback(async () => {
    try {
      const res = await api.get<UserOption[]>('/users?all=true');
      if (res.success && Array.isArray(res.data)) {
        setStaffList(res.data);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (fromDate) queryParams.append('fromDate', fromDate);
      if (toDate) queryParams.append('toDate', toDate);
      if (searchQuery) queryParams.append('search', searchQuery);

      const res = await api.get<CookingRecord[]>(`/production-reports?${queryParams.toString()}`);
      if (res.success && Array.isArray(res.data)) {
        setCookingRecords(res.data);
      } else {
        setCookingRecords([]);
      }
    } catch {
      setCookingRecords([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, searchQuery]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleSetToday = () => {
    setFromDate(todayStr);
    setToDate(todayStr);
  };

  const handleSetAll = () => {
    setFromDate('');
    setToDate('');
  };

  const handleOpenAddCooking = () => {
    setEditingCookingId(null);
    setFormCookingDate(todayStr);
    const prodStaff = staffList.find((s) => s.role === 'PRODUCTION') || staffList[0];
    setFormCookingStaffId(prodStaff ? prodStaff.id : '');
    setFormCookingLiters('');
    setFormCookingNotes('');
    setFormError(null);
    setShowCookingModal(true);
  };

  const handleOpenEditCooking = (record: CookingRecord) => {
    setEditingCookingId(record.id);
    setFormCookingDate(record.date);
    setFormCookingStaffId(record.staffId || staffList[0]?.id || '');
    setFormCookingLiters(String(record.liters));
    setFormCookingNotes(record.notes && record.notes !== '-' ? record.notes : '');
    setFormError(null);
    setShowCookingModal(true);
  };

  const handleSaveCooking = async (e: React.FormEvent) => {
    e.preventDefault();
    const litersNum = parseFloat(formCookingLiters);
    if (isNaN(litersNum) || litersNum <= 0) {
      setFormError('Total liter teh wajib diisi angka lebih besar dari 0');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      if (editingCookingId) {
        const res = await api.patch(`/production-reports/${editingCookingId}`, {
          totalLiters: litersNum,
          notes: formCookingNotes.trim() || undefined,
          reportDate: formCookingDate,
          staffId: formCookingStaffId || undefined,
        });

        if (res.success) {
          setShowCookingModal(false);
          fetchReports();
        } else {
          setFormError(res.error?.message || 'Gagal mengubah laporan memasak');
        }
      } else {
        const res = await api.post('/production-reports', {
          totalLiters: litersNum,
          notes: formCookingNotes.trim() || undefined,
          reportDate: formCookingDate,
          staffId: formCookingStaffId || undefined,
        });

        if (res.success) {
          setShowCookingModal(false);
          fetchReports();
        } else {
          setFormError(res.error?.message || 'Gagal menambahkan laporan memasak');
        }
      }
    } catch {
      setFormError('Terjadi gangguan jaringan atau server saat menyimpan data.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCooking = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data laporan memasak teh ini?')) {
      return;
    }

    try {
      const res = await api.delete(`/production-reports/${id}`);
      if (res.success) {
        setCookingRecords((prev) => prev.filter((r) => r.id !== id));
      } else {
        alert(res.error?.message || 'Gagal menghapus laporan memasak');
      }
    } catch {
      alert('Terjadi kesalahan saat menghapus laporan memasak');
    }
  };

  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (fromDate) queryParams.append('from', fromDate);
      if (toDate) queryParams.append('to', toDate);
      const query = queryParams.toString() ? `?${queryParams.toString()}` : '';

      await downloadFile(
        `/export/production${query}`,
        `Laporan_Produksi_Teh_${fromDate || 'All'}_sd_${toDate || 'All'}.xlsx`
      );
    } finally {
      setExportLoading(false);
    }
  };

  const totalLitersCooked = cookingRecords.reduce((acc, r) => acc + r.liters, 0);
  const totalSessionsCooked = cookingRecords.length;
  const avgLitersCooked = totalSessionsCooked > 0 ? (totalLitersCooked / totalSessionsCooked).toFixed(1) : '0';

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Flame className="w-7 h-7 text-amber-700" />
            <span>Laporan Produksi (Memasak Teh Dapur)</span>
          </h1>
          <p className="text-sm text-slate-500">
            Rekapitulasi volume teh yang dimasak di dapur per tanggal & jam sesi lengkap dengan CRUD dan Export Excel
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchReports}
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
            onClick={handleOpenAddCooking}
            className="rounded-lg bg-amber-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-900 transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Tambah Masak Teh
          </button>
        </div>
      </div>

      {/* Cards Metric Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-amber-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Teh Dimasak Dapur</p>
          <p className="mt-2 text-3xl font-bold text-amber-950">{totalLitersCooked.toFixed(1)} Liter</p>
          <p className="mt-1 text-xs text-amber-700 font-semibold">▲ Siap didistribusikan ke booth</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Jumlah Sesi Memasak</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{totalSessionsCooked} Sesi</p>
          <p className="mt-1 text-xs text-slate-500">Berdasarkan data operasional dapur</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Rata-rata Per Sesi Masak</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{avgLitersCooked} Liter / Sesi</p>
          <p className="mt-1 text-xs text-slate-500">Kapasitas dandang kompor dapur</p>
        </div>
      </div>

      {/* Filter Box */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="font-bold text-slate-700 text-sm flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-700" />
            Filter Data Laporan Memasak
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
            <label className="block text-xs font-semibold uppercase text-slate-500">Pencarian</label>
            <div className="relative mt-1">
              <input
                type="text"
                placeholder="Cari catatan / staf / jam..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full rounded-md border border-slate-300 p-2 pr-8 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabel Laporan Memasak Dapur */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm w-full max-w-full">
        <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-600" />
            <span>Daftar Riwayat Memasak Teh (Per Tanggal & Jam)</span>
          </h2>
          <span className="text-xs font-semibold text-slate-500">
            {cookingRecords.length} Sesi Memasak
          </span>
        </div>
        <div className="overflow-x-auto w-full max-w-full block">
          <table className="w-full min-w-[750px] text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3 whitespace-nowrap">Tanggal</th>
                <th className="px-6 py-3 whitespace-nowrap">Jam Dimasak</th>
                <th className="px-6 py-3 whitespace-nowrap">Staf Dapur Produksi</th>
                <th className="px-6 py-3 whitespace-nowrap">Jumlah Dimasak</th>
                <th className="px-6 py-3 whitespace-nowrap">Catatan Produksi</th>
                <th className="px-6 py-3 whitespace-nowrap">Status</th>
                <th className="px-6 py-3 text-right whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading && cookingRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
                      <span>Memuat laporan memasak...</span>
                    </div>
                  </td>
                </tr>
              ) : cookingRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    Belum ada data laporan memasak teh pada filter ini.
                  </td>
                </tr>
              ) : (
                cookingRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-mono font-semibold text-slate-900 whitespace-nowrap">{r.date}</td>
                    <td className="px-6 py-4 font-mono font-bold text-amber-800 whitespace-nowrap">{r.time}</td>
                    <td className="px-6 py-4 text-slate-800 font-medium whitespace-nowrap">
                      {r.staffName}
                      {r.staffEmail && <span className="block text-[11px] text-slate-400">{r.staffEmail}</span>}
                    </td>
                    <td className="px-6 py-4 font-extrabold text-slate-900 whitespace-nowrap">{r.liters} Liter</td>
                    <td className="px-6 py-4 text-slate-500 text-xs min-w-[180px]">{r.notes}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap align-middle">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditCooking(r)}
                          className="flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 hover:text-amber-800 transition"
                          title="Edit Laporan Memasak"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteCooking(r.id)}
                          className="flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition"
                          title="Hapus Laporan Memasak"
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

      {/* MODAL COOKING (MEMASAK) */}
      {showCookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={handleSaveCooking} className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-lg font-bold text-slate-900">
                {editingCookingId ? 'Edit Laporan Memasak' : 'Tambah Laporan Memasak Dapur'}
              </h2>
              <button
                type="button"
                onClick={() => setShowCookingModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-sm text-red-700 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Memasak *</label>
              <input
                type="date"
                value={formCookingDate}
                onChange={(e) => setFormCookingDate(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:border-amber-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Staf Dapur / Pembuat</label>
              <select
                value={formCookingStaffId}
                onChange={(e) => setFormCookingStaffId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:border-amber-600 focus:outline-none"
              >
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Total Liter Teh Dimasak *</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0.1"
                  value={formCookingLiters}
                  onChange={(e) => setFormCookingLiters(e.target.value)}
                  placeholder="misal: 75"
                  required
                  className="w-full rounded-lg border border-slate-300 p-2.5 pr-16 text-sm font-bold text-amber-900 focus:border-amber-600 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-500">Liter</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Memasak (Opsional)</label>
              <textarea
                value={formCookingNotes}
                onChange={(e) => setFormCookingNotes(e.target.value)}
                placeholder="Catatan batch rasa, dandang, kompor..."
                rows={3}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-amber-600 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowCookingModal(false)}
                disabled={submitting}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-amber-800 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-900 disabled:opacity-50"
              >
                {submitting ? 'Menyimpan...' : editingCookingId ? 'Update Memasak' : 'Simpan Memasak'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
