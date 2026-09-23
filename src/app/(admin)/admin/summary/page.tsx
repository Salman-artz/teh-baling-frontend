'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatRupiah } from '@/lib/utils';
import { api, downloadFile } from '@/lib/api-client';
import {
  RefreshCw,
  TrendingUp,
  CupSoda,
  Store,
  DollarSign,
  FileSpreadsheet,
  Calendar,
  Eye,
  X,
  CheckCircle2,
  AlertCircle,
  Package,
  Layers,
  FileText,
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
  attendantName: string;
  cashModal: number;
  cashFinal: number | null;
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

interface BoothSummary {
  boothId: string;
  boothName: string;
  boothAddress: string;
  totalRevenue: number;
  totalCupsSold: number;
  cupBreakdown: Record<string, number>;
  reportCount: number;
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
  const [boothOptions, setBoothOptions] = useState<BoothOption[]>([]);
  
  const [data, setData] = useState<SummaryItem[]>([]);
  const [boothSummaries, setBoothSummaries] = useState<BoothSummary[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal detail per shift
  const [selectedReport, setSelectedReport] = useState<SummaryItem | null>(null);

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
        boothSummaries?: BoothSummary[];
      }>(
        `/dashboard/summary-table?from=${fromDate}&to=${toDate}&boothId=${boothId}`
      );
      if (res.success && res.data) {
        if (Array.isArray(res.data)) {
          setData(res.data);
          setBoothSummaries([]);
        } else if (res.data.data && Array.isArray(res.data.data)) {
          setData(res.data.data);
          setBoothSummaries(res.data.boothSummaries || []);
        }
      } else {
        setData([]);
        setBoothSummaries([]);
      }
    } catch {
      setData([]);
      setBoothSummaries([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, boothId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleExportSales = async () => {
    setSalesExportLoading(true);
    try {
      await downloadFile(
        `/export/sales?from=${fromDate}&to=${toDate}&boothId=${boothId}`,
        `Laporan_Penjualan_${fromDate}_sd_${toDate}.xlsx`
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

      {/* DETAIL PENJUALAN PER BOOTH (CARD GRID) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-emerald-700" />
            <h2 className="text-base font-bold text-slate-900">Detail Penjualan Per Booth</h2>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {boothSummaries.length > 0 ? `${boothSummaries.length} Booth Aktif` : `${data.length} Data Shift`}
          </span>
        </div>

        {loading && data.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin text-emerald-600" />
            <span>Memuat detail penjualan booth...</span>
          </div>
        ) : boothSummaries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {boothSummaries.map((b) => (
              <div
                key={b.boothId}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs hover:shadow-md transition space-y-3"
              >
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{b.boothName}</h3>
                    <p className="text-[11px] text-slate-500 line-clamp-1">{b.boothAddress}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                    {b.reportCount} Shift
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg">
                  <div>
                    <span className="block text-[10px] font-semibold text-slate-500">Omzet Booth</span>
                    <span className="text-sm font-extrabold text-emerald-800">{formatRupiah(b.totalRevenue)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold text-slate-500">Cup Terjual</span>
                    <span className="text-sm font-extrabold text-indigo-900">{b.totalCupsSold} Cup</span>
                  </div>
                </div>

                {/* Cup breakdown badges */}
                <div className="space-y-1">
                  <span className="block text-[11px] font-semibold text-slate-500">Rincian Cup Terjual:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.keys(b.cupBreakdown).length > 0 ? (
                      Object.entries(b.cupBreakdown).map(([cupName, qty]) => (
                        <span
                          key={cupName}
                          className="text-[11px] font-semibold bg-white border border-slate-200 px-2 py-0.5 rounded-md text-slate-700 shadow-2xs"
                        >
                          <strong className="text-emerald-700">{qty}</strong> {cupName}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">Belum ada rincian cup</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : data.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{item.boothName}</h3>
                    <p className="text-[11px] text-slate-500">{item.date} • Shift {item.shiftType}</p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.status === 'CLOSED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {item.status === 'CLOSED' ? 'Closed' : 'Open'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg">
                  <div>
                    <span className="block text-[10px] font-semibold text-slate-500">Omzet</span>
                    <span className="text-sm font-extrabold text-emerald-800">{formatRupiah(item.revenue)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold text-slate-500">Cup Terjual</span>
                    <span className="text-sm font-extrabold text-indigo-900">{item.cupsSold} Cup</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-500 font-medium">Kasir: <strong className="text-slate-700">{item.attendantName}</strong></span>
                  <button
                    onClick={() => setSelectedReport(item)}
                    className="text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" /> Detail
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* TABEL LENGKAP LAPORAN PENJUALAN KASIR */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-700" />
            <h2 className="text-base font-bold text-slate-900">Rincian Laporan Transaksi Shift</h2>
          </div>
          <span className="text-xs font-semibold text-slate-500">Total: {data.length} Laporan</span>
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
                          <button
                            type="button"
                            onClick={() => setSelectedReport(row)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold text-xs transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Detail
                          </button>
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
            <div className="pt-2 border-t border-slate-100 flex justify-end">
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
    </div>
  );
}