'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { formatRupiah } from '@/lib/utils';
import { api, downloadFile } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import {
  RefreshCw,
  TrendingUp,
  CupSoda,
  Store,
  DollarSign,
  FileSpreadsheet,
  Calendar,
  Eye,
  Pencil,
  ExternalLink,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  Package,
  Layers,
  Banknote,
  Droplets,
  CreditCard,
  User,
} from 'lucide-react';

interface CupBreakdownItem {
  cupTypeName: string;
  qtySold: number;
}

interface SaleItemDetail {
  id: string;
  productName: string;
  cupTypeName: string;
  qtySold: number;
  priceSnapshot: number;
  subtotal: number;
}

interface StockItemDetail {
  id: string;
  cupTypeName: string;
  qtyInitial: number;
  qtyAdded: number;
  qtyFinal: number;
  qtySold: number;
}

interface SummaryItem {
  id: string;
  date: string;
  shiftType: string;
  boothId: string;
  boothName: string;
  boothAddress: string;
  attendantId?: string;
  attendantName: string;
  cashModal: number;
  cashFinal: number | null;
  qrisFinal?: number;
  revenue: number;
  cupsSold: number;
  cupBreakdown: CupBreakdownItem[];
  expectedTotalCash: number;
  variance: number;
  teaRemainingLiters?: number;
  notes?: string;
  status: string;
  saleItems?: SaleItemDetail[];
  stockItems?: StockItemDetail[];
}

interface AttendantOption {
  id: string;
  name: string;
  email?: string;
}

interface BoothOption {
  id: string;
  name: string;
}

export default function SummaryPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  // Auto filter dibuat HARI INI secara default
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);
  const [boothId, setBoothId] = useState('ALL');
  const [shift, setShift] = useState('ALL');
  const [boothOptions, setBoothOptions] = useState<BoothOption[]>([]);
  
  const [data, setData] = useState<SummaryItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Auth & Admin check
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  // Modal detail per shift
  const [selectedReport, setSelectedReport] = useState<SummaryItem | null>(null);

  // Modal edit per shift (Khusus Administrator)
  const [editingReport, setEditingReport] = useState<SummaryItem | null>(null);
  const [editForm, setEditForm] = useState<{
    cashModal: number;
    cashFinal: number;
    qrisFinal: number;
    teaRemainingLiters: number;
    notes: string;
    status: 'OPEN' | 'CLOSED';
    attendantId: string;
  }>({
    cashModal: 0,
    cashFinal: 0,
    qrisFinal: 0,
    teaRemainingLiters: 0,
    notes: '',
    status: 'CLOSED',
    attendantId: '',
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editFeedback, setEditFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [attendantsList, setAttendantsList] = useState<AttendantOption[]>([]);

  // Fetch attendant options if admin
  useEffect(() => {
    if (isAdmin) {
      api.get<AttendantOption[]>('/users?role=BOOTH_ATTENDANT').then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setAttendantsList(res.data);
        }
      });
    }
  }, [isAdmin]);

  const handleOpenEdit = (report: SummaryItem) => {
    setEditingReport(report);
    setEditForm({
      cashModal: report.cashModal,
      cashFinal: report.cashFinal ?? 0,
      qrisFinal: report.qrisFinal ?? 0,
      teaRemainingLiters: report.teaRemainingLiters ?? 0,
      notes: report.notes ?? '',
      status: (report.status as 'OPEN' | 'CLOSED') || 'CLOSED',
      attendantId: report.attendantId || '',
    });
    setEditFeedback(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReport) return;
    setEditSubmitting(true);
    setEditFeedback(null);

    try {
      const payload = {
        cashModal: Number(editForm.cashModal),
        cashFinal: Number(editForm.cashFinal),
        qrisFinal: Number(editForm.qrisFinal),
        teaRemainingLiters: Number(editForm.teaRemainingLiters),
        notes: editForm.notes,
        status: editForm.status,
        ...(editForm.attendantId ? { attendantId: editForm.attendantId } : {}),
      };

      const res = await api.patch<{ message?: string }>(
        `/daily-reports/${editingReport.id}`,
        payload
      );

      if (res.success) {
        setEditFeedback({ type: 'success', message: 'Laporan shift berhasil diperbarui.' });
        setTimeout(() => {
          setEditingReport(null);
          fetchSummary();
        }, 800);
      } else {
        setEditFeedback({
          type: 'error',
          message: res.error?.message || 'Gagal menyimpan perubahan laporan',
        });
      }
    } catch (err) {
      setEditFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Terjadi kesalahan sistem saat menyimpan laporan',
      });
    } finally {
      setEditSubmitting(false);
    }
  };

  const [salesExportLoading, setSalesExportLoading] = useState(false);
  const [shiftExportLoading, setShiftExportLoading] = useState(false);

  // Fetch booth options
  useEffect(() => {
    async function loadBooths() {
      const res = await api.get<BoothOption[]>('/booths');
      if (res.success && Array.isArray(res.data)) {
        setBoothOptions(res.data);
      }
    }
    loadBooths();
  }, []);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{
        data: SummaryItem[];
      }>(
        `/dashboard/summary-table?from=${fromDate}&to=${toDate}&boothId=${boothId}&shift=${shift}`
      );
      if (res.success && res.data) {
        if (Array.isArray(res.data)) {
          setData(res.data);
        } else if (res.data.data && Array.isArray(res.data.data)) {
          setData(res.data.data);
        }
      } else {
        setData([]);
      }
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, boothId, shift]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleExportSales = async () => {
    setSalesExportLoading(true);
    try {
      const shiftSuffix = shift !== 'ALL' ? `_Shift_${shift}` : '';
      await downloadFile(
        `/export/sales?from=${fromDate}&to=${toDate}&boothId=${boothId}&shift=${shift}`,
        `Laporan_Penjualan_${fromDate}_sd_${toDate}${shiftSuffix}.xlsx`
      );
    } finally {
      setSalesExportLoading(false);
    }
  };

  const handleExportShift = async () => {
    setShiftExportLoading(true);
    try {
      await downloadFile(
        `/export/shift-assignments?from=${fromDate}&to=${toDate}`,
        `Jadwal_Shift_Staf_${fromDate}_sd_${toDate}.xlsx`
      );
    } finally {
      setShiftExportLoading(false);
    }
  };

  // Quick Preset Handlers
  const handleSetToday = () => {
    setFromDate(todayStr);
    setToDate(todayStr);
  };

  const handleSet7Days = () => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    const startStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setFromDate(startStr);
    setToDate(todayStr);
  };

  const handleSetThisMonth = () => {
    const startOfMonth = `${year}-${month}-01`;
    setFromDate(startOfMonth);
    setToDate(todayStr);
  };

  // Aggregated KPIs
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  const totalCupsSold = data.reduce((sum, item) => sum + item.cupsSold, 0);
  const totalVariance = data.reduce((sum, item) => sum + item.variance, 0);
  const closedReportsCount = data.filter((item) => item.status === 'CLOSED').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Export Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900">Laporan Penjualan</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Rekapitulasi penjualan per booth, rincian cup terjual, dan unduh laporan Excel resmi
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchSummary}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            data-testid="export-excel-btn"
            onClick={handleExportSales}
            disabled={salesExportLoading}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 transition disabled:opacity-50 cursor-pointer"
          >
            {salesExportLoading ? '⏳ Mengunduh...' : '📊 Download Excel Penjualan (.xlsx)'}
          </button>
          <button
            data-testid="export-shift-btn"
            onClick={handleExportShift}
            disabled={shiftExportLoading}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800 shadow-xs hover:bg-emerald-100 transition disabled:opacity-50 cursor-pointer"
          >
            {shiftExportLoading ? '⏳ Mengunduh...' : '📅 Download Jadwal Shift (.xlsx)'}
          </button>
        </div>
      </div>

      {/* Filter Tanggal & Booth (Default: Auto Hari Ini) */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-600" />
            Filter Periode Penjualan
          </span>
          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-slate-400 font-medium mr-1">Preset:</span>
            <button
              type="button"
              onClick={handleSetToday}
              className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                fromDate === todayStr && toDate === todayStr
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={handleSet7Days}
              className="px-3 py-1 text-xs font-bold rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
            >
              7 Hari Terakhir
            </button>
            <button
              type="button"
              onClick={handleSetThisMonth}
              className="px-3 py-1 text-xs font-bold rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
            >
              Bulan Ini
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Dari Tanggal</label>
            <input
              type="date"
              data-testid="from-date-input"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="block w-full rounded-lg border border-slate-300 p-2.5 text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Sampai Tanggal</label>
            <input
              type="date"
              data-testid="to-date-input"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="block w-full rounded-lg border border-slate-300 p-2.5 text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Pilih Booth</label>
            <select
              data-testid="booth-filter-select"
              value={boothId}
              onChange={(e) => setBoothId(e.target.value)}
              className="block w-full rounded-lg border border-slate-300 p-2.5 text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none bg-white"
            >
              <option value="ALL">Semua Booth Aktif ({boothOptions.length})</option>
              {boothOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Pilih Shift</label>
            <select
              data-testid="shift-filter-select"
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              className="block w-full rounded-lg border border-slate-300 p-2.5 text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none bg-white"
            >
              <option value="ALL">Semua Shift</option>
              <option value="PAGI">Shift Pagi (Shift 1)</option>
              <option value="SORE">Shift Sore (Shift 2)</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Total Omzet Penjualan</p>
            <p className="text-xl font-extrabold text-slate-900">{formatRupiah(totalRevenue)}</p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
              {fromDate === toDate ? `Penjualan ${fromDate}` : `${fromDate} s/d ${toDate}`}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
            <CupSoda className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Total Cup Terjual</p>
            <p className="text-xl font-extrabold text-indigo-900">
              {totalCupsSold.toLocaleString('id-ID')} <span className="text-sm font-normal text-slate-500">Cup</span>
            </p>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Seluruh booth & varian cup</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Laporan Shift Kasir</p>
            <p className="text-xl font-extrabold text-slate-900">
              {data.length} <span className="text-sm font-normal text-slate-500">Laporan</span>
            </p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
              {closedReportsCount} shift telah closed
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${
              totalVariance === 0
                ? 'bg-emerald-50 text-emerald-700'
                : totalVariance > 0
                ? 'bg-blue-50 text-blue-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Total Selisih Kasir</p>
            <p
              className={`text-xl font-extrabold ${
                totalVariance === 0
                  ? 'text-emerald-700'
                  : totalVariance > 0
                  ? 'text-blue-700'
                  : 'text-red-600'
              }`}
            >
              {totalVariance === 0 ? 'Rp 0 (Pas ✓)' : formatRupiah(totalVariance)}
            </p>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Rekonsiliasi kas aktual vs omzet</p>
          </div>
        </div>
      </div>

      {/* TABEL LENGKAP DETAIL PENJUALAN */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
            <h2 className="text-base font-bold text-slate-900">Detail Penjualan</h2>
          </div>
          <span className="text-xs font-semibold text-slate-500">Total: {data.length} Laporan Shift</span>
        </div>

        {data.length === 0 && !loading ? (
          <div
            data-testid="empty-summary-state"
            className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500"
          >
            <p className="font-semibold text-slate-700">Tidak ada data penjualan pada rentang tanggal ini.</p>
            <p className="text-xs text-slate-400 mt-1">
              Gunakan tombol preset &quot;Hari Ini&quot; atau sesuaikan filter tanggal di atas.
            </p>
          </div>
        ) : (
          <div className="w-full max-w-full space-y-2">
            <p className="text-[11px] text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 sm:hidden flex items-center gap-1.5 font-medium">
              👉 <span>Geser tabel ke samping untuk melihat seluruh data</span>
            </p>
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden w-full max-w-full">
              <div className="overflow-x-auto w-full max-w-full block">
                <table data-testid="summary-table" className="w-full min-w-[750px] text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3 whitespace-nowrap">Tanggal & Shift</th>
                      <th className="px-5 py-3 whitespace-nowrap">Nama Booth</th>
                      <th className="px-5 py-3 whitespace-nowrap">Staf Kasir</th>
                      <th className="px-5 py-3 whitespace-nowrap">Modal Awal</th>
                      <th className="px-5 py-3 whitespace-nowrap">Kas Akhir</th>
                      <th className="px-5 py-3 whitespace-nowrap">Total Omzet</th>
                      <th className="px-5 py-3 whitespace-nowrap">Cup Terjual</th>
                      <th className="px-5 py-3 whitespace-nowrap">Selisih Kas</th>
                      <th className="px-5 py-3 whitespace-nowrap">Status</th>
                      <th className="px-5 py-3 whitespace-nowrap text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {data.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="font-mono text-xs font-bold text-slate-900">{row.date}</div>
                          <span className="text-[10px] font-semibold text-slate-500 uppercase">
                            Shift {row.shiftType}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <p className="font-bold text-slate-900 text-xs">{row.boothName}</p>
                          <p className="text-[11px] text-slate-400 line-clamp-1">{row.boothAddress}</p>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs font-medium text-slate-800">
                          {row.attendantName}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs font-mono text-slate-600">
                          {formatRupiah(row.cashModal)}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs font-mono font-bold text-slate-900">
                          {row.cashFinal !== null ? formatRupiah(row.cashFinal) : '-'}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap font-bold text-emerald-800 text-xs font-mono">
                          {formatRupiah(row.revenue)}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-indigo-900 text-xs">{row.cupsSold} Cup</span>
                            {row.cupBreakdown && row.cupBreakdown.length > 0 && (
                              <div className="text-[10px] text-slate-500">
                                ({row.cupBreakdown.map((cb) => `${cb.qtySold} ${cb.cupTypeName}`).join(', ')})
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap font-semibold text-xs font-mono">
                          <span
                            className={
                              row.variance === 0
                                ? 'text-emerald-600 font-bold'
                                : row.variance > 0
                                ? 'text-blue-600 font-bold'
                                : 'text-red-600 font-bold'
                            }
                          >
                            {row.variance === 0 ? 'Rp 0 (Pas)' : formatRupiah(row.variance)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              row.status === 'CLOSED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {row.status === 'CLOSED' ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" /> Closed
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-3 h-3" /> Beroperasi
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedReport(row)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold text-xs transition cursor-pointer"
                              title="Lihat Detail Laporan Shift"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Detail
                            </button>
                            {isAdmin && (
                              <button
                                type="button"
                                data-testid={`edit-report-btn-${row.id}`}
                                onClick={() => handleOpenEdit(row)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 font-bold text-xs transition cursor-pointer"
                                title="Edit Laporan Shift (Administrator)"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                Edit
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL RINCIAN PENJUALAN SHIFT KASIR BOOTH */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                  Shift {selectedReport.shiftType} • {selectedReport.status === 'CLOSED' ? 'Closed' : 'Beroperasi'}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{selectedReport.boothName}</h3>
                <p className="text-xs text-slate-500">
                  Tanggal: {selectedReport.date} | Staf Kasir: <strong className="text-slate-700">{selectedReport.attendantName}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Financial Reconciliation Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <span className="block text-[10px] font-semibold text-slate-500">Modal Awal Kas</span>
                <span className="text-xs font-bold text-slate-800 font-mono">{formatRupiah(selectedReport.cashModal)}</span>
              </div>
              <div>
                <span className="block text-[10px] font-semibold text-slate-500">Omzet Penjualan</span>
                <span className="text-xs font-bold text-emerald-800 font-mono">{formatRupiah(selectedReport.revenue)}</span>
              </div>
              <div>
                <span className="block text-[10px] font-semibold text-slate-500">Uang Kas Akhir</span>
                <span className="text-xs font-bold text-slate-900 font-mono">
                  {selectedReport.cashFinal !== null ? formatRupiah(selectedReport.cashFinal) : '-'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-semibold text-slate-500">Selisih Kas</span>
                <span
                  className={`text-xs font-extrabold font-mono ${
                    selectedReport.variance === 0
                      ? 'text-emerald-700'
                      : selectedReport.variance > 0
                      ? 'text-blue-700'
                      : 'text-red-600'
                  }`}
                >
                  {selectedReport.variance === 0 ? 'Rp 0 (Pas)' : formatRupiah(selectedReport.variance)}
                </span>
              </div>
            </div>

            {/* Menu Items Sold Breakdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  Rincian Menu & Produk Teh Terjual
                </h4>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                  {selectedReport.cupsSold} Cup Terjual
                </span>
              </div>

              {selectedReport.saleItems && selectedReport.saleItems.length > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Menu Produk</th>
                        <th className="p-2.5">Ukuran Cup</th>
                        <th className="p-2.5 text-center">Qty</th>
                        <th className="p-2.5 text-right">Harga</th>
                        <th className="p-2.5 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedReport.saleItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-900">{item.productName}</td>
                          <td className="p-2.5 text-slate-600">{item.cupTypeName}</td>
                          <td className="p-2.5 text-center font-bold text-indigo-900">{item.qtySold}</td>
                          <td className="p-2.5 text-right font-mono text-slate-600">{formatRupiah(item.priceSnapshot)}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-emerald-800">
                            {formatRupiah(item.subtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-lg">
                  Tidak ada data rincian menu produk individual untuk shift ini.
                </p>
              )}
            </div>

            {/* Cup Stock Breakdown */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-emerald-600" />
                Rincian Stok Fisik Cup Booth
              </h4>

              {selectedReport.stockItems && selectedReport.stockItems.length > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Jenis Cup</th>
                        <th className="p-2.5 text-center">Stok Awal</th>
                        <th className="p-2.5 text-center">Restock (+Qty)</th>
                        <th className="p-2.5 text-center">Sisa Akhir</th>
                        <th className="p-2.5 text-right">Cup Terpakai</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedReport.stockItems.map((st) => (
                        <tr key={st.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-900">{st.cupTypeName}</td>
                          <td className="p-2.5 text-center font-medium">{st.qtyInitial}</td>
                          <td className="p-2.5 text-center font-bold text-emerald-700">
                            {st.qtyAdded > 0 ? `+${st.qtyAdded}` : '0'}
                          </td>
                          <td className="p-2.5 text-center font-medium">{st.qtyFinal}</td>
                          <td className="p-2.5 text-right font-bold text-indigo-900">{st.qtySold} pcs</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-lg">
                  Tidak ada data fisik cup tercatat.
                </p>
              )}
            </div>

            {/* Notes & Extra Info */}
            {selectedReport.notes && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
                <span className="font-bold text-amber-900">Catatan Operasional Shift:</span>
                <p className="text-amber-800">{selectedReport.notes}</p>
              </div>
            )}

            {/* Modal Footer */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
              {isAdmin ? (
                <button
                  type="button"
                  data-testid="detail-modal-edit-btn"
                  onClick={() => {
                    const rep = selectedReport;
                    setSelectedReport(null);
                    handleOpenEdit(rep);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-xs"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit Laporan Ini
                </button>
              ) : (
                <div />
              )}
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition cursor-pointer"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT LAPORAN PENJUALAN SHIFT (KHUSUS ADMINISTRATOR) */}
      {editingReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-8 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                    <Pencil className="w-4 h-4" />
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">Edit Laporan Penjualan</h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {editingReport.boothName} • {editingReport.date} (Shift {editingReport.shiftType})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingReport(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Shortcut ke Editor Lengkap Shift */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
              <div className="text-xs text-emerald-800">
                <p className="font-bold">Koreksi rincian menu atau stok cup?</p>
                <p className="text-[11px] text-emerald-700">Gunakan editor lengkap untuk mengedit item cup & varian menu shift ini.</p>
              </div>
              <Link
                href={`/admin/input-shift?boothId=${editingReport.boothId}&date=${editingReport.date}&shift=${editingReport.shiftType}`}
                className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Editor Lengkap
              </Link>
            </div>

            {/* Feedback Alert */}
            {editFeedback && (
              <div
                className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
                  editFeedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                {editFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{editFeedback.message}</span>
              </div>
            )}

            {/* Edit Form */}
            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Row 1: Attendant & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    Staf Kasir Shift
                  </label>
                  <select
                    value={editForm.attendantId}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, attendantId: e.target.value }))}
                    className="w-full text-xs font-semibold rounded-lg border border-slate-300 p-2.5 focus:border-amber-500 focus:outline-none bg-white"
                  >
                    <option value="">{editingReport.attendantName || 'Pilih Staf'}</option>
                    {attendantsList.map((att) => (
                      <option key={att.id} value={att.id}>
                        {att.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status Laporan Shift
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value as 'OPEN' | 'CLOSED' }))}
                    className="w-full text-xs font-semibold rounded-lg border border-slate-300 p-2.5 focus:border-amber-500 focus:outline-none bg-white"
                  >
                    <option value="CLOSED">CLOSED (Shift Selesai)</option>
                    <option value="OPEN">OPEN (Sedang Beroperasi)</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Modal Awal & Omzet */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Banknote className="w-3.5 h-3.5 text-slate-500" />
                    Modal Kas Awal (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.cashModal}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, cashModal: Math.max(0, Number(e.target.value)) }))}
                    className="w-full text-xs font-mono font-bold rounded-lg border border-slate-300 p-2.5 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Total Omzet Penjualan
                  </label>
                  <div className="w-full text-xs font-mono font-bold text-emerald-800 bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center justify-between">
                    <span>{formatRupiah(editingReport.revenue)}</span>
                    <span className="text-[10px] text-slate-500 font-normal">({editingReport.cupsSold} cup)</span>
                  </div>
                </div>
              </div>

              {/* Row 3: Kas Akhir & QRIS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Banknote className="w-3.5 h-3.5 text-slate-500" />
                    Uang Kas Akhir Fisik (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.cashFinal}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, cashFinal: Math.max(0, Number(e.target.value)) }))}
                    className="w-full text-xs font-mono font-bold rounded-lg border border-slate-300 p-2.5 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                    Setoran Non-Tunai / QRIS (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.qrisFinal}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, qrisFinal: Math.max(0, Number(e.target.value)) }))}
                    className="w-full text-xs font-mono font-bold rounded-lg border border-slate-300 p-2.5 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 4: Sisa Teh */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5 text-slate-500" />
                  Sisa Teh di Dispenser (Liter)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={editForm.teaRemainingLiters}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, teaRemainingLiters: Math.max(0, Number(e.target.value)) }))}
                  className="w-full text-xs font-mono font-bold rounded-lg border border-slate-300 p-2.5 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Live Reconciliation Card */}
              {(() => {
                const editExpectedCash = editForm.cashModal + Math.max(0, editingReport.revenue - editForm.qrisFinal);
                const editVariance = editForm.cashFinal - editExpectedCash;
                return (
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Kas Fisik yang Diharapkan:</span>
                      <span className="font-mono font-bold text-slate-800">{formatRupiah(editExpectedCash)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
                      <span className="text-slate-700 font-bold">Kalkulasi Selisih Kasir:</span>
                      <span
                        className={`font-mono font-extrabold ${
                          editVariance === 0
                            ? 'text-emerald-700'
                            : editVariance > 0
                            ? 'text-blue-700'
                            : 'text-red-600'
                        }`}
                      >
                        {editVariance === 0 ? 'Rp 0 (Pas ✓)' : formatRupiah(editVariance)}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Operasional Shift
                </label>
                <textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Catatan kendala mesin cup sealer, stok cup, uang pecahan, dll..."
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingReport(null)}
                  disabled={editSubmitting}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  {editSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      Simpan Perubahan
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}