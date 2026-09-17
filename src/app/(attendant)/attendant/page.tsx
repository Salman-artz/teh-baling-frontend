'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatRupiah } from '@/lib/utils';
import {
  Store,
  MapPin,
  PlayCircle,
  StopCircle,
  ArrowRight,
  Sun,
  Sunset,
  AlertCircle,
  Lock,
} from 'lucide-react';

type ShiftSession = 'PAGI' | 'SORE';

export default function AttendantHomePage() {
  const [activeSession, setActiveSession] = useState<ShiftSession>('PAGI');
  const [wibTimeStr, setWibTimeStr] = useState('');
  const [todayDateFormatted, setTodayDateFormatted] = useState('');

  // Hitung waktu WIB (UTC+7)
  const getWibNow = () => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utc + 3600000 * 7);
  };

  useEffect(() => {
    const updateTime = () => {
      const wib = getWibNow();
      setWibTimeStr(
        wib.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB'
      );
      setTodayDateFormatted(
        wib.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
      );

      // Auto-detect sesi aktif berdasarkan jam saat ini
      const hour = wib.getHours() + wib.getMinutes() / 60;
      if (hour >= 15.0) {
        // Mendekati jam 16:00 atau sore hari -> default ke Shift Sore
        setActiveSession('SORE');
      } else {
        setActiveSession('PAGI');
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const todaySummary = {
    boothName: 'Booth Alun-Alun Kota',
    address: 'Jl. Merdeka No. 1, Surabaya',
    cashModal: 50000,
    estimatedCupsSold: activeSession === 'PAGI' ? 95 : 120,
    estimatedRevenue: activeSession === 'PAGI' ? 1050000 : 1350000,
  };

  // Evaluasi Rule Akses Window Shift:
  // - Shift Pagi (09:00 - 16:00 WIB)
  //   * Start window: 07:00 s/d 16:00 (2 jam sebelum jam 09:00)
  //   * End window:   09:00 s/d 18:00 (2 jam setelah jam 16:00)
  // - Shift Sore (16:00 - 21:00 WIB)
  //   * Start window: 14:00 s/d 21:00 (2 jam sebelum jam 16:00)
  //   * End window:   16:00 s/d 23:00 (2 jam setelah jam 21:00)
  const wib = getWibNow();
  const currentHourDec = wib.getHours() + wib.getMinutes() / 60;

  const isPagi = activeSession === 'PAGI';
  const startWindowMin = isPagi ? 7.0 : 14.0;
  const startWindowMax = isPagi ? 16.0 : 21.0;
  const endWindowMin = isPagi ? 9.0 : 16.0;
  const endWindowMax = isPagi ? 18.0 : 23.0;

  const canStartShift = currentHourDec >= startWindowMin && currentHourDec <= startWindowMax;
  const canEndShift = currentHourDec >= endWindowMin && currentHourDec <= endWindowMax;

  const startDisabledReason =
    currentHourDec < startWindowMin
      ? `Akses buka shift dibuka mulai pukul ${isPagi ? '07:00' : '14:00'} WIB (2 jam sebelum shift).`
      : currentHourDec > startWindowMax
      ? `Waktu presensi buka shift telah berakhir (Maksimal pukul ${isPagi ? '16:00' : '21:00'} WIB).`
      : null;

  const endDisabledReason =
    currentHourDec < endWindowMin
      ? `Akses tutup shift dibuka saat shift berjalan (mulai pukul ${isPagi ? '09:00' : '16:00'} WIB).`
      : currentHourDec > endWindowMax
      ? `Waktu tutup shift kasir telah lewat (Toleransi maksimal 2 jam setelah shift / pukul ${isPagi ? '18:00' : '23:00'} WIB).`
      : null;

  return (
    <div className="space-y-6">
      {/* Attendance Reminder & Live Clock Header */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-800 to-emerald-950 p-5 text-white shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-700/80 text-emerald-100 border border-emerald-500/40">
            <Store className="w-3.5 h-3.5" />
            Penugasan Shift Booth Hari Ini
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald-200 font-mono font-bold bg-emerald-900/60 px-2.5 py-1 rounded-md border border-emerald-700/50">
              🕒 {wibTimeStr || 'Memuat waktu...'}
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-white">{todaySummary.boothName}</h2>
            <span className="text-xs text-emerald-200 font-medium">{todayDateFormatted}</span>
          </div>
          <p className="text-xs text-emerald-200 flex items-center gap-1 mt-1">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            {todaySummary.address}
          </p>
        </div>

        {/* Pilihan Sesi Shift */}
        <div className="pt-2 border-t border-emerald-800/80 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 bg-emerald-950/60 p-1 rounded-lg border border-emerald-700/50">
            <button
              onClick={() => setActiveSession('PAGI')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition ${
                activeSession === 'PAGI'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-emerald-200 hover:text-white'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              Shift Pagi (09:00 - 16:00)
            </button>
            <button
              onClick={() => setActiveSession('SORE')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition ${
                activeSession === 'SORE'
                  ? 'bg-indigo-500 text-white shadow-xs'
                  : 'text-emerald-200 hover:text-white'
              }`}
            >
              <Sunset className="w-3.5 h-3.5" />
              Shift Sore (16:00 - 21:00)
            </button>
          </div>

          <span className="font-bold text-emerald-300 text-xs">
            Modal Kas: {formatRupiah(todaySummary.cashModal)}
          </span>
        </div>
      </div>

      {/* Reminder Alert Box Waktu Operasional */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900 space-y-1.5 shadow-xs">
        <div className="flex items-center gap-1.5 font-bold text-blue-950 text-sm">
          <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
          Aturan Waktu Pengisian Shift:
        </div>
        <ul className="list-disc list-inside space-y-1 text-slate-700 leading-relaxed pl-1">
          <li>
            <strong>Buka Shift ({isPagi ? 'Pagi' : 'Sore'}):</strong> Dapat diisi mulai pukul{' '}
            <span className="font-bold text-emerald-800">{isPagi ? '07:00' : '14:00'} WIB</span> (2 jam sebelum shift) hingga pukul{' '}
            <span className="font-bold text-emerald-800">{isPagi ? '16:00' : '21:00'} WIB</span>.
          </li>
          <li>
            <strong>Tutup Shift ({isPagi ? 'Pagi' : 'Sore'}):</strong> Dapat diisi mulai pukul{' '}
            <span className="font-bold text-indigo-800">{isPagi ? '09:00' : '16:00'} WIB</span> hingga batas maksimal pukul{' '}
            <span className="font-bold text-indigo-800">{isPagi ? '18:00' : '23:00'} WIB</span> (toleransi 2 jam setelah shift).
          </li>
        </ul>
      </div>

      {/* Shift Action Status Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">
            Status Operasional Sesi {activeSession === 'PAGI' ? 'Pagi' : 'Sore'}:
          </h3>
          {canStartShift && !canEndShift ? (
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
              Sesi Berjalan
            </span>
          ) : canEndShift ? (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              Waktu Tutup Shift Aktif
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
              Akses Shift Terkunci
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3">
          {/* Tombol 1: Mulai Shift */}
          {canStartShift ? (
            <Link
              href="/attendant/start-shift"
              className="flex items-center justify-between p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 transition group shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                  <PlayCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">1. Mulai Shift Harian</p>
                  <p className="text-xs text-slate-500">Input modal kasir & stok cup awal (Aktif)</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-emerald-700 group-hover:translate-x-1 transition-transform" />
            </Link>
          ) : (
            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50 opacity-70 cursor-not-allowed">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-300 text-slate-600 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-600 text-sm">1. Mulai Shift Harian (Terkunci)</p>
                  <p className="text-[11px] text-amber-700 font-medium">{startDisabledReason}</p>
                </div>
              </div>
            </div>
          )}

          {/* Tombol 2: Akhiri Shift */}
          {canEndShift ? (
            <Link
              href="/attendant/end-shift"
              className="flex items-center justify-between p-4 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 transition group shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-800 text-white flex items-center justify-center shadow-xs">
                  <StopCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">2. Akhiri Shift Harian</p>
                  <p className="text-xs text-slate-500">Input penjualan produk & hitung selisih kas (Aktif)</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-indigo-700 group-hover:translate-x-1 transition-transform" />
            </Link>
          ) : (
            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50 opacity-70 cursor-not-allowed">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-300 text-slate-600 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-600 text-sm">2. Akhiri Shift Harian (Terkunci)</p>
                  <p className="text-[11px] text-amber-700 font-medium">{endDisabledReason}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Estimasi Ringkasan Penjualan Sesi Ini */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <h3 className="font-bold text-slate-900 text-sm">
          Estimasi Penjualan {activeSession === 'PAGI' ? 'Shift Pagi' : 'Shift Sore'}
        </h3>

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