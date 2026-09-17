'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatRupiah } from '@/lib/utils';
import { Store, Clock, MapPin, PlayCircle, StopCircle, ArrowRight } from 'lucide-react';

export default function AttendantHomePage() {
  const [shiftStatus] = useState<'NOT_STARTED' | 'OPEN' | 'CLOSED'>('OPEN');
  const [todaySummary] = useState({
    boothName: 'Booth Alun-Alun Kota',
    address: 'Jl. Pemuda No. 1, Surabaya',
    cashModal: 50000,
    estimatedCupsSold: 170,
    estimatedRevenue: 1850000,
    shiftStartTime: '08:00 WIB',
  });

  return (
    <div className="space-y-6">
      {/* Booth Assignment Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-800 to-emerald-950 p-5 text-white shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-700/80 text-emerald-100 border border-emerald-500/40">
            <Store className="w-3.5 h-3.5" />
            Penugasan Shift Hari Ini
          </span>
          <span className="text-xs text-emerald-200 font-mono">16 Sep 2026</span>
        </div>

        <div>
          <h2 className="text-xl font-extrabold text-white">{todaySummary.boothName}</h2>
          <p className="text-xs text-emerald-200 flex items-center gap-1 mt-1">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            {todaySummary.address}
          </p>
        </div>

        <div className="pt-2 border-t border-emerald-800/80 flex items-center justify-between text-xs">
          <span className="text-emerald-200 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Mulai Shift: {todaySummary.shiftStartTime}
          </span>
          <span className="font-bold text-emerald-300">
            Modal Kas: {formatRupiah(todaySummary.cashModal)}
          </span>
        </div>
      </div>

      {/* Shift Action Status Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Status Shift Anda:</h3>
          {shiftStatus === 'OPEN' ? (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              Sedang Beroperasi
            </span>
          ) : shiftStatus === 'CLOSED' ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
              Shift Selesai
            </span>
          ) : (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
              Belum Mulai Shift
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3">
          <Link
            href="/attendant/start-shift"
            className="flex items-center justify-between p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/80 transition group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-700 text-white flex items-center justify-center">
                <PlayCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">1. Mulai Shift Harian</p>
                <p className="text-xs text-slate-500">Input modal kasir & stok cup awal</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-emerald-700 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/attendant/end-shift"
            className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-800 text-white flex items-center justify-center">
                <StopCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">2. Akhiri Shift Harian</p>
                <p className="text-xs text-slate-500">Input penjualan produk & hitung selisih kas</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-700 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Estimasi Ringkasan Penjualan Hari Ini */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <h3 className="font-bold text-slate-900 text-sm">Estimasi Penjualan Shift Ini</h3>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/80">
            <p className="text-xs font-semibold uppercase text-slate-500">Cup Terjual</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{todaySummary.estimatedCupsSold} Cup</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/80">
            <p className="text-xs font-semibold uppercase text-slate-500">Omzet Pendapatan</p>
            <p className="text-xl font-extrabold text-slate-900 mt-1">{formatRupiah(todaySummary.estimatedRevenue)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}