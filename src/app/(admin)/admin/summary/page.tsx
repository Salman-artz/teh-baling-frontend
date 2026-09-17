'use client';

import { useState } from 'react';
import { formatRupiah } from '@/lib/utils';
import { downloadFile } from '@/lib/api-client';

export default function SummaryPage() {
  const [fromDate, setFromDate] = useState('2026-09-01');
  const [toDate, setToDate] = useState('2026-09-16');
  const [boothId, setBoothId] = useState('ALL');
  const [data] = useState<Array<{ date: string; boothName: string; revenue: number; cupsSold: number; variance: number }>>([
    { date: '2026-09-16', boothName: 'Booth Alun-Alun Kota', revenue: 1850000, cupsSold: 170, variance: 0 },
    { date: '2026-09-16', boothName: 'Booth Kampus UNESA', revenue: 1600000, cupsSold: 150, variance: -5000 },
  ]);

  const [salesExportLoading, setSalesExportLoading] = useState(false);
  const [shiftExportLoading, setShiftExportLoading] = useState(false);

  const handleExportSales = async () => {
    setSalesExportLoading(true);
    try {
      await downloadFile(
        `/export/sales?from=${fromDate}&to=${toDate}`,
        `Rekap_Penjualan_${fromDate}_sd_${toDate}.xlsx`
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ringkasan & Export Laporan</h1>
          <p className="text-sm text-slate-500">Unduh rekap penjualan dan jadwal shift jaga staf dalam format Excel</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            data-testid="export-excel-btn"
            onClick={handleExportSales}
            disabled={salesExportLoading}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 transition disabled:opacity-50"
          >
            {salesExportLoading ? '⏳ Mengunduh...' : '📊 Download Rekap Penjualan (.xlsx)'}
          </button>
          <button
            data-testid="export-shift-btn"
            onClick={handleExportShift}
            disabled={shiftExportLoading}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800 shadow-xs hover:bg-emerald-100 transition disabled:opacity-50"
          >
            {shiftExportLoading ? '⏳ Mengunduh...' : '📅 Download Jadwal Shift Staf (.xlsx)'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-3">
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500">Dari Tanggal</label>
          <input
            type="date"
            data-testid="from-date-input"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500">Sampai Tanggal</label>
          <input
            type="date"
            data-testid="to-date-input"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500">Filter Booth</label>
          <select
            data-testid="booth-filter-select"
            value={boothId}
            onChange={(e) => setBoothId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900"
          >
            <option value="ALL">Semua Booth</option>
            <option value="b1111111-1111-1111-1111-111111111111">Booth Alun-Alun Kota</option>
            <option value="b2222222-2222-2222-2222-222222222222">Booth Kampus UNESA</option>
          </select>
        </div>
      </div>

      {data.length === 0 ? (
        <div data-testid="empty-summary-state" className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500">
          Tidak ada data penjualan pada rentang tanggal ini.
        </div>
      ) : (
        <div className="w-full max-w-full space-y-2">
          <p className="text-[11px] text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 sm:hidden flex items-center gap-1.5 font-medium">
            👉 <span>Geser tabel ke samping untuk melihat seluruh data</span>
          </p>
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden w-full max-w-full">
            <div className="overflow-x-auto w-full max-w-full block">
              <table data-testid="summary-table" className="w-full min-w-[650px] text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-3 whitespace-nowrap">Tanggal</th>
                    <th className="px-6 py-3 whitespace-nowrap">Nama Booth</th>
                    <th className="px-6 py-3 whitespace-nowrap">Cup Terjual</th>
                    <th className="px-6 py-3 whitespace-nowrap">Total Revenue</th>
                    <th className="px-6 py-3 whitespace-nowrap">Selisih Kas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-mono whitespace-nowrap">{row.date}</td>
                      <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">{row.boothName}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{row.cupsSold} Cup</td>
                      <td className="px-6 py-4 font-semibold text-slate-900 whitespace-nowrap">{formatRupiah(row.revenue)}</td>
                      <td className={`px-6 py-4 font-semibold whitespace-nowrap ${row.variance < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {formatRupiah(row.variance)}
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
  );
}