'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { getWibDateString } from '@/lib/utils';
import { ArrowLeft, RefreshCw, Calendar } from 'lucide-react';

interface ProductionItem {
  id: string;
  date: string;
  time: string;
  liters: number;
  notes: string;
  status: string;
}

export default function ProductionHistoryPage() {
  const todayStr = getWibDateString();
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);
  const [searchQuery, setSearchQuery] = useState('');
  const [historyList, setHistoryList] = useState<ProductionItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (fromDate) queryParams.append('fromDate', fromDate);
        if (toDate) queryParams.append('toDate', toDate);
        if (searchQuery) queryParams.append('search', searchQuery);

        const res = await api.get<ProductionItem[]>(`/production-reports?${queryParams.toString()}`);
        if (res.success && Array.isArray(res.data)) {
          setHistoryList(res.data);
        } else {
          setHistoryList([]);
        }
      } catch {
        setHistoryList([]);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [fromDate, toDate, searchQuery]);

  const handleSetToday = () => {
    setFromDate(todayStr);
    setToDate(todayStr);
  };

  const handleSetAll = () => {
    setFromDate('');
    setToDate('');
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto pb-10">
      <div className="rounded-xl bg-slate-900 p-6 text-white shadow-md">
        <div className="flex items-center justify-between mb-3">
          <Link
            href="/production"
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700 transition flex items-center gap-1.5 border border-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Link>
        </div>
        <h1 className="text-xl font-bold">Riwayat Memasak Teh</h1>
        <p className="mt-1 text-xs text-slate-300">
          Daftar laporan volume teh yang telah Anda masak per tanggal dan jam langsung dari database
        </p>
      </div>

      {/* Filter Box */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="font-bold text-slate-700 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-700" />
            Filter Laporan
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleSetToday}
              className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition ${
                fromDate === todayStr && toDate === todayStr
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={handleSetAll}
              className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition ${
                !fromDate && !toDate
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua Tanggal
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block font-semibold text-slate-500 mb-1">Dari Tanggal</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-md border border-slate-300 p-2 text-slate-900 focus:border-amber-600 focus:outline-none font-medium"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-500 mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-md border border-slate-300 p-2 text-slate-900 focus:border-amber-600 focus:outline-none font-medium"
            />
          </div>
        </div>
        <div>
          <label className="block font-semibold text-slate-500 mb-1">Cari Catatan / Jam</label>
          <input
            type="text"
            placeholder="Cari kata kunci..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-slate-300 p-2 text-slate-900 focus:border-amber-600 focus:outline-none"
          />
        </div>
      </div>

      <div className="space-y-3">
        {loading && historyList.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-amber-600" />
            <span>Memuat data riwayat memasak...</span>
          </div>
        ) : historyList.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            Belum ada riwayat memasak teh yang tercatat di database.
          </div>
        ) : (
          historyList.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-500">{item.date}</p>
                  <p className="text-sm font-extrabold text-emerald-700 font-mono">{item.time}</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                  {item.liters} Liter
                </span>
              </div>

              {item.notes && (
                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  📝 {item.notes}
                </p>
              )}

              <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100">
                <span>Status: {item.status}</span>
                <span>Terverifikasi Dapur</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}