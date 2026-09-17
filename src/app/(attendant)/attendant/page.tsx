'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatRupiah } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
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
  UserX,
} from 'lucide-react';

type ShiftSession = 'PAGI' | 'SORE';

interface AssignmentData {
  id: string;
  date: string;
  shiftType: string;
  boothId: string;
  boothName: string;
  boothAddress?: string;
  userId: string;
  userEmail?: string;
  userName: string;
  status: string;
}

export default function AttendantHomePage() {
  const { user } = useAuthStore();
  const [activeSession, setActiveSession] = useState<ShiftSession>('PAGI');
  const [wibTimeStr, setWibTimeStr] = useState('');
  const [todayDateFormatted, setTodayDateFormatted] = useState('');
  const [assignment, setAssignment] = useState<AssignmentData | null>(null);
  const [loadingAssignment, setLoadingAssignment] = useState(false);

  // Ambil waktu WIB (UTC+7)
  const getWibNow = () => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utc + 3600000 * 7);
  };

  const fetchTodayAssignment = async () => {
    setLoadingAssignment(true);
    const wib = getWibNow();
    const todayStr = wib.toISOString().split('T')[0]!;

    try {
      const res = await api.get<AssignmentData[]>(`/booth-assignments?date=${todayStr}`);
      if (res.success && Array.isArray(res.data)) {
        const myAssignment = res.data.find(
          (a) =>
            (user?.id && a.userId === user.id) ||
            (user?.email && a.userEmail?.toLowerCase() === user.email.toLowerCase()) ||
            (user?.email && a.userName.toLowerCase().includes(user.email.toLowerCase()))
        );
        setAssignment(myAssignment || null);
      } else {
        setAssignment(null);
      }
    } catch {
      setAssignment(null);
    } finally {
      setLoadingAssignment(false);
    }
  };

  useEffect(() => {
    fetchTodayAssignment();

    const updateTime = () => {
      const wib = getWibNow();
      setWibTimeStr(
        wib.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB'
      );
      setTodayDateFormatted(
        wib.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [user]);

  const hasAssignment = Boolean(assignment);

  // Evaluasi Rule Akses Window Shift:
  // - Shift Pagi (09:00 - 16:00 WIB) -> Start: 07:00-16:00 | End: 09:00-18:00
  // - Shift Sore (16:00 - 21:00 WIB) -> Start: 14:00-21:00 | End: 16:00-23:00
  const wib = getWibNow();
  const currentHourDec = wib.getHours() + wib.getMinutes() / 60;

  const isPagi = activeSession === 'PAGI';
  const startWindowMin = isPagi ? 7.0 : 14.0;
  const startWindowMax = isPagi ? 16.0 : 21.0;
  const endWindowMin = isPagi ? 9.0 : 16.0;
  const endWindowMax = isPagi ? 18.0 : 23.0;

  const isTimeValidForStart = currentHourDec >= startWindowMin && currentHourDec <= startWindowMax;
  const isTimeValidForEnd = currentHourDec >= endWindowMin && currentHourDec <= endWindowMax;

  const canStartShift = hasAssignment && isTimeValidForStart;
  const canEndShift = hasAssignment && isTimeValidForEnd;

  let startDisabledReason = '';
  if (!hasAssignment) {
    startDisabledReason = `Akses Terkunci: Anda tidak memiliki jadwal penugasan shift ${isPagi ? 'pagi' : 'sore'} hari ini di database.`;
  } else if (currentHourDec < startWindowMin) {
    startDisabledReason = `Akses buka shift dibuka mulai pukul ${isPagi ? '07:00' : '14:00'} WIB (2 jam sebelum shift).`;
  } else if (currentHourDec > startWindowMax) {
    startDisabledReason = `Waktu presensi buka shift telah berakhir (Maksimal pukul ${isPagi ? '16:00' : '21:00'} WIB).`;
  }

  let endDisabledReason = '';
  if (!hasAssignment) {
    endDisabledReason = `Akses Terkunci: Anda tidak memiliki jadwal penugasan shift ${isPagi ? 'pagi' : 'sore'} hari ini di database.`;
  } else if (currentHourDec < endWindowMin) {
    endDisabledReason = `Akses tutup shift dibuka saat jam shift berjalan (mulai pukul ${isPagi ? '09:00' : '16:00'} WIB).`;
  } else if (currentHourDec > endWindowMax) {
    endDisabledReason = `Waktu tutup shift kasir telah lewat (Toleransi maksimal pukul ${isPagi ? '18:00' : '23:00'} WIB).`;
  }

  return (
    <div className="space-y-6">
      {/* Attendance Reminder & Live Clock Header */}
      <div className={`rounded-2xl p-5 text-white shadow-lg space-y-4 transition ${
        hasAssignment
          ? 'bg-gradient-to-r from-emerald-800 to-emerald-950'
          : 'bg-gradient-to-r from-slate-800 to-slate-950'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
            hasAssignment
              ? 'bg-emerald-700/80 text-emerald-100 border-emerald-500/40'
              : 'bg-slate-700/80 text-slate-200 border-slate-600/50'
          }`}>
            <Store className="w-3.5 h-3.5" />
            Penugasan Shift Booth
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald-200 font-mono font-bold bg-slate-900/60 px-2.5 py-1 rounded-md border border-slate-700/50">
              🕒 {wibTimeStr || 'Memuat waktu...'}
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-white">
              {loadingAssignment
                ? 'Memeriksa penugasan shift...'
                : hasAssignment
                ? assignment?.boothName
                : 'Tidak Ada Penugasan Shift'}
            </h2>
            <span className="text-xs text-slate-300 font-medium">{todayDateFormatted}</span>
          </div>
          <p className="text-xs text-slate-300 flex items-center gap-1 mt-1">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            {hasAssignment
              ? assignment?.boothAddress || 'Lokasi Booth Resmi'
              : 'Anda tidak dijadwalkan bertugas pada hari ini oleh Admin.'}
          </p>
        </div>

        {/* Pilihan Sesi Shift */}
        <div className="pt-2 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-lg border border-slate-700/50">
            <button
              onClick={() => setActiveSession('PAGI')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition ${
                activeSession === 'PAGI'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
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
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Sunset className="w-3.5 h-3.5" />
              Shift Sore (16:00 - 21:00)
            </button>
          </div>

          <span className="font-bold text-emerald-300 text-xs">
            {hasAssignment
              ? `Modal Standar: ${formatRupiah(50000)}`
              : 'Status: Off Shift / Belum Ditugaskan'}
          </span>
        </div>
      </div>

      {/* Warning Box jika Tidak Ada Jadwal */}
      {!hasAssignment && !loadingAssignment && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-900 space-y-1.5 shadow-xs">
          <div className="flex items-center gap-1.5 font-bold text-red-950 text-sm">
            <UserX className="w-4 h-4 text-red-600 shrink-0" />
            Tidak Ada Jadwal Shift Hari Ini
          </div>
          <p className="text-slate-700 leading-relaxed">
            Akun Anda (<strong>{user?.email || 'Attendant'}</strong>) belum memiliki jadwal penugasan booth pada hari ini di sistem database. Hubungi Admin untuk membuat penugasan shift.
          </p>
        </div>
      )}

      {/* Reminder Alert Box Waktu Operasional */}
      {hasAssignment && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900 space-y-1.5 shadow-xs">
          <div className="flex items-center gap-1.5 font-bold text-blue-950 text-sm">
            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
            Aturan Waktu Pengisian Shift {isPagi ? 'Pagi' : 'Sore'}:
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-700 leading-relaxed pl-1">
            <li>
              <strong>Buka Shift:</strong> Dapat diisi mulai pukul{' '}
              <span className="font-bold text-emerald-800">{isPagi ? '07:00' : '14:00'} WIB</span> (2 jam sebelum shift) hingga pukul{' '}
              <span className="font-bold text-emerald-800">{isPagi ? '16:00' : '21:00'} WIB</span>.
            </li>
            <li>
              <strong>Tutup Shift:</strong> Dapat diisi mulai pukul{' '}
              <span className="font-bold text-indigo-800">{isPagi ? '09:00' : '16:00'} WIB</span> hingga batas maksimal pukul{' '}
              <span className="font-bold text-indigo-800">{isPagi ? '18:00' : '23:00'} WIB</span> (toleransi 2 jam setelah shift).
            </li>
            <li>
              <strong>Radius Lokasi GPS:</strong> Presensi kehadiran wajib berada dalam batas radius maksimal <span className="font-bold text-emerald-800">200 meter</span> dari titik koordinat booth.
            </li>
          </ul>
        </div>
      )}

      {/* Shift Action Status Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">
            Status Akses Sesi {activeSession === 'PAGI' ? 'Pagi' : 'Sore'}:
          </h3>
          {!hasAssignment ? (
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800 flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-red-600" />
              Shift Terkunci (Tidak Ada Jadwal)
            </span>
          ) : canStartShift && !canEndShift ? (
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
              Di Luar Jam Toleransi Shift
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
                  <p className="text-xs text-slate-500">Input modal kasir & stok cup awal (Akses Terbuka)</p>
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
                  <p className="text-[11px] text-red-700 font-medium">{startDisabledReason}</p>
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
                  <p className="text-xs text-slate-500">Input penjualan produk & hitung selisih kas (Akses Terbuka)</p>
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
                  <p className="text-[11px] text-red-700 font-medium">{endDisabledReason}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}