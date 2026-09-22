'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { formatRupiah, getWibDateString, getWibHourDec, getWibTimeString, getWibDateFormatted } from '@/lib/utils';
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
  CheckCircle2,
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

interface TodayReportData {
  id: string;
  boothId: string;
  boothName?: string;
  reportDate: string;
  shiftType: string;
  cashModal: number;
  cashFinal?: number | null;
  status: string;
  gpsTimeStart?: string | null;
}

export default function AttendantHomePage() {
  const { user } = useAuthStore();
  const [activeSession, setActiveSession] = useState<ShiftSession>('PAGI');
  const [wibTimeStr, setWibTimeStr] = useState('');
  const [todayDateFormatted, setTodayDateFormatted] = useState('');
  const [assignment, setAssignment] = useState<AssignmentData | null>(null);
  const [todayReport, setTodayReport] = useState<TodayReportData | null>(null);
  const [loadingAssignment, setLoadingAssignment] = useState(false);

  const fetchTodayAssignment = useCallback(async () => {
    setLoadingAssignment(true);
    const todayStr = getWibDateString();

    try {
      const [assignRes, reportRes] = await Promise.all([
        api.get<AssignmentData[]>(`/booth-assignments?date=${todayStr}`),
        api.get<TodayReportData>(`/daily-reports/today?date=${todayStr}`),
      ]);

      if (assignRes.success && Array.isArray(assignRes.data)) {
        const storedUser = user || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('auth_user') || 'null') : null);
        const myAssignment = assignRes.data.find(
          (a) =>
            (storedUser?.id && a.userId === storedUser.id) ||
            (storedUser?.email && a.userEmail?.toLowerCase() === storedUser.email.toLowerCase()) ||
            (storedUser?.name && a.userName?.toLowerCase().includes(storedUser.name.toLowerCase())) ||
            (storedUser?.name && a.userName && storedUser.name.toLowerCase().includes(a.userName.toLowerCase()))
        );
        setAssignment(myAssignment || null);
        if (myAssignment?.shiftType === 'SORE' || myAssignment?.shiftType === 'PAGI') {
          setActiveSession(myAssignment.shiftType as ShiftSession);
        }
      } else {
        setAssignment(null);
      }

      if (reportRes.success && reportRes.data) {
        setTodayReport(reportRes.data);
      } else {
        setTodayReport(null);
      }
    } catch {
      setAssignment(null);
      setTodayReport(null);
    } finally {
      setLoadingAssignment(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTodayAssignment();

    const updateTime = () => {
      setWibTimeStr(getWibTimeString());
      setTodayDateFormatted(getWibDateFormatted());
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [fetchTodayAssignment]);

  const hasAssignment = Boolean(assignment);
  const assignedShift = assignment?.shiftType || 'PAGI';
  const isCorrectShiftSession = !assignment || assignment.shiftType === activeSession;

  // Evaluasi Rule Akses Window Shift (+- 2,5 jam toleransi):
  // - Shift Pagi (09:00 - 15:00 WIB) -> Start: 06:30-15:00 | End: 09:00-17:30
  // - Shift Sore (15:00 - 20:30 WIB) -> Start: 12:30-20:30 | End: 15:00-23:00
  const currentHourDec = getWibHourDec();

  const isPagi = activeSession === 'PAGI';
  const startWindowMin = isPagi ? 6.5 : 12.5;
  const startWindowMax = isPagi ? 15.0 : 20.5;
  const endWindowMin = isPagi ? 9.0 : 15.0;
  const endWindowMax = isPagi ? 17.5 : 23.0;

  // Bypass pembatasan jam khusus untuk mode testing (agar bisa tes mulai/tutup shift kapan saja)
  const isTimeValidForStart = true;
  const isTimeValidForEnd = true;

  const canStartShift = hasAssignment && isCorrectShiftSession && isTimeValidForStart;
  const canEndShift = hasAssignment && isCorrectShiftSession && isTimeValidForEnd;

  let startDisabledReason = '';
  if (!hasAssignment) {
    startDisabledReason = `Akses Terkunci: Anda tidak memiliki jadwal penugasan shift hari ini di database.`;
  } else if (!isCorrectShiftSession) {
    startDisabledReason = `Akses Terkunci: Anda dijadwalkan pada Shift ${assignedShift === 'PAGI' ? 'PAGI (09:00 - 15:00)' : 'SORE (15:00 - 20:30)'}. Silakan klik tab Shift ${assignedShift === 'PAGI' ? 'Pagi' : 'Sore'} di atas.`;
  } else if (currentHourDec < startWindowMin) {
    startDisabledReason = `Akses buka shift dibuka mulai pukul ${isPagi ? '06:30' : '12:30'} WIB (2,5 jam sebelum shift).`;
  } else if (currentHourDec > startWindowMax) {
    startDisabledReason = `Waktu presensi buka shift telah berakhir (Maksimal pukul ${isPagi ? '15:00' : '20:30'} WIB).`;
  }

  let endDisabledReason = '';
  if (!hasAssignment) {
    endDisabledReason = `Akses Terkunci: Anda tidak memiliki jadwal penugasan shift hari ini di database.`;
  } else if (!isCorrectShiftSession) {
    endDisabledReason = `Akses Terkunci: Anda dijadwalkan pada Shift ${assignedShift === 'PAGI' ? 'PAGI (09:00 - 15:00)' : 'SORE (15:00 - 20:30)'}. Silakan klik tab Shift ${assignedShift === 'PAGI' ? 'Pagi' : 'Sore'} di atas.`;
  } else if (currentHourDec < endWindowMin) {
    endDisabledReason = `Akses tutup shift dibuka saat jam shift berjalan (mulai pukul ${isPagi ? '09:00' : '15:00'} WIB).`;
  } else if (currentHourDec > endWindowMax) {
    endDisabledReason = `Waktu tutup shift kasir telah lewat (Toleransi maksimal pukul ${isPagi ? '17:30' : '23:00'} WIB / 2,5 jam setelah shift berakhir).`;
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
              Shift Pagi (09:00 - 15:00)
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
              Shift Sore (15:00 - 20:30)
            </button>
          </div>

          <span className="font-bold text-emerald-300 text-xs">
            {todayReport?.status === 'OPEN'
              ? `Modal Kasir: ${formatRupiah(todayReport.cashModal || 50000)} (Aktif)`
              : todayReport?.status === 'CLOSED'
              ? `Shift Selesai (Kasir: ${formatRupiah(todayReport.cashFinal || 0)})`
              : hasAssignment
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
            Aturan Waktu Pengisian Shift {isPagi ? 'Pagi (09:00 - 15:00)' : 'Sore (15:00 - 20:30)'}:
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-700 leading-relaxed pl-1">
            <li>
              <strong>Buka Shift:</strong> Dapat diisi mulai pukul{' '}
              <span className="font-bold text-emerald-800">{isPagi ? '06:30' : '12:30'} WIB</span> (2,5 jam sebelum shift) hingga pukul{' '}
              <span className="font-bold text-emerald-800">{isPagi ? '15:00' : '20:30'} WIB</span>.
            </li>
            <li>
              <strong>Tutup Shift:</strong> Dapat diisi mulai pukul{' '}
              <span className="font-bold text-indigo-800">{isPagi ? '09:00' : '15:00'} WIB</span> hingga batas maksimal pukul{' '}
              <span className="font-bold text-indigo-800">{isPagi ? '17:30' : '23:00'} WIB</span> (toleransi 2,5 jam setelah shift).
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
          ) : todayReport?.status === 'OPEN' ? (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              Shift Sedang Berjalan (Aktif)
            </span>
          ) : todayReport?.status === 'CLOSED' ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Shift Ditutup (Selesai)
            </span>
          ) : canStartShift && !canEndShift ? (
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
              Sesi Berjalan (Belum Mulai)
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
          {todayReport?.status === 'OPEN' || todayReport?.status === 'CLOSED' ? (
            <Link
              href="/attendant/start-shift"
              className="flex items-center justify-between p-4 rounded-xl border border-emerald-300 bg-emerald-50/90 hover:bg-emerald-100 transition group shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-slate-900 text-sm">1. Mulai Shift (Tercatat & Dikunci)</p>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200/70 px-1.5 py-0.5 rounded">✓ Terkunci</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Modal: {formatRupiah(todayReport.cashModal || 50000)} (Data telah dikunci)
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-emerald-700 group-hover:translate-x-1 transition-transform" />
            </Link>
          ) : canStartShift ? (
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
          {todayReport?.status === 'CLOSED' ? (
            <Link
              href="/attendant/end-shift"
              className="flex items-center justify-between p-4 rounded-xl border border-indigo-300 bg-indigo-50/90 hover:bg-indigo-100 transition group shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-800 text-white flex items-center justify-center shadow-xs">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-slate-900 text-sm">2. Tutup Shift (Closing Selesai)</p>
                    <span className="text-[10px] font-bold text-indigo-900 bg-indigo-200/70 px-1.5 py-0.5 rounded">✓ Final</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Kas Akhir: {formatRupiah(todayReport.cashFinal || 0)} (Laporan telah dikunci)
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-indigo-700 group-hover:translate-x-1 transition-transform" />
            </Link>
          ) : canEndShift ? (
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
                  <p className="text-xs text-slate-500">Input penjualan produk, sisa cup & uang akhir (Akses Terbuka)</p>
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