'use client';

import { useState, useEffect } from 'react';
import { api, downloadFile } from '@/lib/api-client';

interface ProductionRecord {
  id: string;
  date: string;
  time: string;
  staffName: string;
  liters: number;
  notes: string;
  status: string;
}

const defaultRecords: ProductionRecord[] = [
  {
    id: 'pr_1',
    date: '2026-09-16',
    time: '08:30:15 WIB',
    staffName: 'Joko Produksi (joko@tehbaling.com)',
    liters: 150,
    notes: 'Seduhan teh melati kualitas utama, kompor 1 & 2',
    status: 'Selesai Dimasak',
  },
  {
    id: 'pr_2',
    date: '2026-09-16',
    time: '13:15:40 WIB',
    staffName: 'Joko Produksi (joko@tehbaling.com)',
    liters: 100,
    notes: 'Penambahan stok siang persiapan jam ramai',
    status: 'Selesai Dimasak',
  },
  {
    id: 'pr_3',
    date: '2026-09-15',
    time: '08:15:00 WIB',
    staffName: 'Joko Produksi (joko@tehbaling.com)',
    liters: 180,
    notes: 'Seduhan teh melati super + gula cair asli',
    status: 'Selesai Dimasak',
  },
];

export default function AdminProductionPage() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [records, setRecords] = useState<ProductionRecord[]>(defaultRecords);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchReports() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (fromDate) queryParams.append('fromDate', fromDate);
        if (toDate) queryParams.append('toDate', toDate);
        if (searchQuery) queryParams.append('search', searchQuery);

        const res = await api.get<ProductionRecord[]>(`/production-reports?${queryParams.toString()}`);
        if (res.success && Array.isArray(res.data)) {
          setRecords(res.data);
        }
      } catch {
        // use fallback
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, [fromDate, toDate, searchQuery]);

  const totalLiters = records.reduce((acc, r) => acc + r.liters, 0);
  const totalSessions = records.length;
  const avgLiters = totalSessions > 0 ? (totalLiters / totalSessions).toFixed(1) : '0';

  const [exportLoading, setExportLoading] = useState(false);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Laporan Memasak Teh Dapur</h1>
          <p className="text-sm text-slate-500">
            Rekapitulasi riwayat produksi teh per tanggal lengkap dengan timestamp jam dimasak
          </p>
        </div>
        <button
          onClick={handleExportExcel}
          disabled={exportLoading}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 transition flex items-center gap-2 disabled:opacity-50"
        >
          {exportLoading ? '⏳ Mengunduh...' : '📥 Export Laporan Produksi (.xlsx)'}
        </button>
      </div>

      {/* Cards Metric Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Teh Dimasak</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{totalLiters} Liter</p>
          <p className="mt-1 text-xs text-emerald-600 font-semibold">▲ Siap didistribusikan ke booth</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Jumlah Sesi Memasak</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{totalSessions} Sesi</p>
          <p className="mt-1 text-xs text-slate-500">Sesuai kebutuhan stok outlet</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Rata-rata Per Sesi</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{avgLiters} Liter / Sesi</p>
          <p className="mt-1 text-xs text-slate-500">Kapasitas dandang kompor dapur</p>
        </div>
      </div>

      {/* Filter Tanggal & Pencarian */}
      <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-3">
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500">Dari Tanggal</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500">Sampai Tanggal</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500">Cari Catatan / Staf</label>
          <input
            type="text"
            placeholder="Ketik kata kunci..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Tabel Laporan Produksi */}
      <div className="w-full max-w-full space-y-2">
        <p className="text-[11px] text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 sm:hidden flex items-center gap-1.5 font-medium">
          👉 <span>Geser tabel ke samping untuk melihat seluruh data</span>
        </p>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm w-full max-w-full">
          <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Daftar Riwayat Memasak Teh (Per Tanggal & Jam)
              {loading && <span className="ml-2 text-xs text-amber-600 animate-pulse font-normal">(Memuat data...)</span>}
            </h2>
          </div>
          <div className="overflow-x-auto w-full max-w-full block">
            <table data-testid="production-report-table" className="w-full min-w-[700px] text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3 whitespace-nowrap">Tanggal</th>
                  <th className="px-6 py-3 whitespace-nowrap">Jam Dimasak</th>
                  <th className="px-6 py-3 whitespace-nowrap">Staf Dapur Produksi</th>
                  <th className="px-6 py-3 whitespace-nowrap">Jumlah Dimasak</th>
                  <th className="px-6 py-3 whitespace-nowrap">Catatan Produksi</th>
                  <th className="px-6 py-3 whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono font-semibold text-slate-900 whitespace-nowrap">{r.date}</td>
                    <td className="px-6 py-4 font-mono font-bold text-emerald-700 whitespace-nowrap">{r.time}</td>
                    <td className="px-6 py-4 text-slate-800 font-medium whitespace-nowrap">{r.staffName}</td>
                    <td className="px-6 py-4 font-extrabold text-slate-900 whitespace-nowrap">{r.liters} Liter</td>
                    <td className="px-6 py-4 text-slate-500 text-xs min-w-[180px]">{r.notes}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
