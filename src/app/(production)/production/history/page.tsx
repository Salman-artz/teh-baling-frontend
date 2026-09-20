'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { getWibDateString } from '@/lib/utils';
import { ArrowLeft, RefreshCw, Calendar, Flame, Truck, Store } from 'lucide-react';

interface CookingItem {
  id: string;
  date: string;
  time: string;
  liters: number;
  notes: string;
  status: string;
  staffName?: string;
}

interface DeliveryItem {
  id: string;
  boothId: string;
  date: string;
  time: string;
  liters: number;
  notes: string;
  status: string;
  staffName?: string;
  boothName?: string;
  boothAddress?: string;
}

export default function ProductionHistoryPage() {
  const todayStr = getWibDateString();
  const [activeTab, setActiveTab] = useState<'cooking' | 'delivery'>('cooking');
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);
  const [searchQuery, setSearchQuery] = useState('');

  const [cookingList, setCookingList] = useState<CookingItem[]>([]);
  const [deliveryList, setDeliveryList] = useState<DeliveryItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (fromDate) queryParams.append('fromDate', fromDate);
        if (toDate) queryParams.append('toDate', toDate);
        if (searchQuery) queryParams.append('search', searchQuery);

        if (activeTab === 'cooking') {
          const res = await api.get<CookingItem[]>(`/production-reports?${queryParams.toString()}`);
          if (res.success && Array.isArray(res.data)) {
            setCookingList(res.data);
          } else {
            setCookingList([]);
          }
        } else {
          const res = await api.get<DeliveryItem[]>(`/production-deliveries?${queryParams.toString()}`);
          if (res.success && Array.isArray(res.data)) {
            setDeliveryList(res.data);
          } else {
            setDeliveryList([]);
          }
        }
      } catch {
        if (activeTab === 'cooking') setCookingList([]);
        else setDeliveryList([]);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [activeTab, fromDate, toDate, searchQuery]);

  const handleSetToday = () => {
    setFromDate(todayStr);
    setToDate(todayStr);
  };

  const handleSetAll = () => {
    setFromDate('');
    setToDate('');
  };

  const totalCookingLiters = cookingList.reduce((acc, c) => acc + c.liters, 0);
  const totalDeliveryLiters = deliveryList.reduce((acc, d) => acc + d.liters, 0);

  return (
    <div className="space-y-6 max-w-xl mx-auto pb-10">
      {/* Header Box */}
      <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <Link
            href={activeTab === 'cooking' ? '/production' : '/production/delivery'}
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700 transition flex items-center gap-1.5 border border-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Link>
          <span className="text-xs font-semibold text-slate-400">Database Live</span>
        </div>
        <div>
          <h1 className="text-xl font-bold">Riwayat Dapur & Distribusi</h1>
          <p className="mt-1 text-xs text-slate-300">
            Tinjau catatan memasak teh dan pengiriman ke setiap outlet booth secara terperinci
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex rounded-xl bg-slate-800/80 p-1 border border-slate-700/60">
          <button
            type="button"
            onClick={() => setActiveTab('cooking')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'cooking'
                ? 'bg-amber-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Riwayat Memasak</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('delivery')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'delivery'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Riwayat Pengiriman</span>
          </button>
        </div>
      </div>

      {/* Summary Mini Banner */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`p-4 rounded-xl border text-xs shadow-2xs ${activeTab === 'cooking' ? 'bg-amber-50 border-amber-200 text-amber-950' : 'bg-white border-slate-200 text-slate-700'}`}>
          <p className="text-[11px] font-semibold uppercase text-slate-500">Total Dimasak</p>
          <p className="text-lg font-black text-amber-900 mt-1">{totalCookingLiters.toFixed(1)} L</p>
          <p className="text-[10px] text-slate-400">{cookingList.length} sesi memasak</p>
        </div>
        <div className={`p-4 rounded-xl border text-xs shadow-2xs ${activeTab === 'delivery' ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-white border-slate-200 text-slate-700'}`}>
          <p className="text-[11px] font-semibold uppercase text-slate-500">Total Terkirim ke Booth</p>
          <p className="text-lg font-black text-emerald-900 mt-1">{totalDeliveryLiters.toFixed(1)} L</p>
          <p className="text-[10px] text-slate-400">{deliveryList.length} kali pengiriman</p>
        </div>
      </div>

      {/* Filter Box */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="font-bold text-slate-700 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-700" />
            Filter Data
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleSetToday}
              className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition ${
                fromDate === todayStr && toDate === todayStr
                  ? activeTab === 'cooking' ? 'bg-amber-700 text-white shadow-xs' : 'bg-emerald-700 text-white shadow-xs'
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
                  ? activeTab === 'cooking' ? 'bg-amber-700 text-white shadow-xs' : 'bg-emerald-700 text-white shadow-xs'
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
              className="w-full rounded-md border border-slate-300 p-2 text-slate-900 focus:border-emerald-600 focus:outline-none font-medium"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-500 mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-md border border-slate-300 p-2 text-slate-900 focus:border-emerald-600 focus:outline-none font-medium"
            />
          </div>
        </div>
        <div>
          <label className="block font-semibold text-slate-500 mb-1">
            {activeTab === 'cooking' ? 'Cari Catatan / Jam' : 'Cari Nama Booth / Catatan'}
          </label>
          <input
            type="text"
            placeholder="Ketik kata kunci..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-slate-300 p-2 text-slate-900 focus:border-emerald-600 focus:outline-none"
          />
        </div>
      </div>

      {/* List Content */}
      <div className="space-y-3">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
            <span>Memuat data riwayat...</span>
          </div>
        ) : activeTab === 'cooking' ? (
          // TAB 1: RIWAYAT MEMASAK
          cookingList.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
              Belum ada riwayat memasak teh yang tercatat pada rentang ini.
            </div>
          ) : (
            cookingList.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">{item.date}</p>
                    <p className="text-sm font-extrabold text-amber-800 font-mono">{item.time}</p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900 border border-amber-200">
                    {item.liters} Liter
                  </span>
                </div>

                {item.notes && item.notes !== '-' && (
                  <p className="text-xs text-slate-600 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
                    📝 {item.notes}
                  </p>
                )}

                <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100">
                  <span>Status: {item.status}</span>
                  <span>{item.staffName || 'Staf Dapur'}</span>
                </div>
              </div>
            ))
          )
        ) : (
          // TAB 2: RIWAYAT PENGIRIMAN
          deliveryList.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
              Belum ada riwayat pengiriman teh ke booth pada rentang ini.
            </div>
          ) : (
            deliveryList.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                      <Store className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>{item.boothName || 'Booth Teh Baling'}</span>
                    </div>
                    {item.boothAddress && (
                      <p className="text-[11px] text-slate-400">{item.boothAddress}</p>
                    )}
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900 border border-emerald-200 shrink-0">
                    {item.liters} Liter
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span>Tanggal: <strong>{item.date}</strong></span>
                  <span className="font-mono text-emerald-700 font-bold">{item.time}</span>
                </div>

                {item.notes && item.notes !== '-' && (
                  <p className="text-xs text-slate-600 bg-emerald-50/40 p-2.5 rounded-lg border border-emerald-100">
                    🚚 {item.notes}
                  </p>
                )}

                <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100">
                  <span>Status: {item.status}</span>
                  <span>Pengirim: {item.staffName || 'Staf Produksi'}</span>
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
}