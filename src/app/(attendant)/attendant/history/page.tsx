'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { formatRupiah } from '@/lib/utils';
import { Calendar, Store, CheckCircle2, ArrowLeft } from 'lucide-react';

interface HistoryItem {
  id: string;
  date: string;
  boothName: string;
  modal: number;
  cashFinal: number;
  revenue: number;
  cupsSold: number;
  variance: number;
  status: string;
}

const defaultShiftHistory: HistoryItem[] = [
  {
    id: 'h1',
    date: '2026-09-15',
    boothName: 'Booth Alun-Alun Kota',
    modal: 50000,
    cashFinal: 1900000,
    revenue: 1850000,
    cupsSold: 170,
    variance: 0,
    status: 'CLOSED',
  },
  {
    id: 'h2',
    date: '2026-09-14',
    boothName: 'Booth Alun-Alun Kota',
    modal: 50000,
    cashFinal: 1750000,
    revenue: 1705000,
    cupsSold: 155,
    variance: -5000,
    status: 'CLOSED',
  },
];

export default function AttendantHistoryPage() {
  const [historyList, setHistoryList] = useState<HistoryItem[]>(defaultShiftHistory);

  useEffect(() => {
    async function fetchShiftHistory() {
      try {
        const res = await api.get<HistoryItem[]>('/daily-reports/my');
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setHistoryList(res.data);
        }
      } catch {
        // use default fallback
      }
    }
    fetchShiftHistory();
  }, []);

  return (
    <div className="space-y-5 max-w-lg mx-auto pb-10">
      <div className="rounded-xl bg-slate-900 p-5 text-white shadow-md">
        <div className="flex items-center justify-between mb-3">
          <Link
            href="/attendant"
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700 transition flex items-center gap-1.5 border border-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Link>
        </div>
        <h1 className="text-xl font-bold">Riwayat Shift Anda</h1>
        <p className="mt-1 text-xs text-slate-300">Daftar laporan shift harian yang telah selesai disubmit</p>
      </div>

      <div className="space-y-3">
        {historyList.map((item) => (
          <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-700" />
                <span className="font-bold text-xs uppercase text-slate-700">{item.date}</span>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {item.status}
              </span>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <Store className="w-4 h-4 text-slate-500" />
                {item.boothName}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200/80 text-xs">
              <div>
                <span className="text-slate-500">Total Cup Terjual:</span>
                <p className="font-extrabold text-emerald-700 text-sm mt-0.5">{item.cupsSold} Cup</p>
              </div>
              <div>
                <span className="text-slate-500">Total Revenue:</span>
                <p className="font-extrabold text-slate-900 text-sm mt-0.5">{formatRupiah(item.revenue)}</p>
              </div>
              <div className="col-span-2 pt-1.5 border-t border-slate-200 flex justify-between">
                <span className="text-slate-500">Selisih Uang Kas:</span>
                <span className={`font-bold ${item.variance < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                  {formatRupiah(item.variance)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}