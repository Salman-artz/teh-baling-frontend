'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useGeolocation } from '@/hooks/use-geolocation';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { getWibDateString, getWibHourDec, getWibDateFormatted } from '@/lib/utils';
import { ArrowLeft, Save, Lock, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';

type ShiftSession = 'PAGI' | 'SORE';

interface AssignmentData {
  id: string;
  date: string;
  shiftType: string;
  boothId: string;
  boothName: string;
  boothAddress?: string;
  latitude: number;
  longitude: number;
  userId: string;
  userEmail?: string;
  userName: string;
  status: string;
}

interface CupTypeItem {
  id: string;
  name: string;
}

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Radius bumi dalam meter
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function StartShiftPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { position, error: gpsError, loading: gpsLoading, requestPosition } = useGeolocation();
  
  const [cashModal, setCashModal] = useState('50000');
  const [cupTypes, setCupTypes] = useState<CupTypeItem[]>([]);
  const [cupStocks, setCupStocks] = useState<Record<string, string>>({});
  const [assignment, setAssignment] = useState<AssignmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const todayStr = getWibDateString();

      try {
        const [assignRes, cupRes] = await Promise.all([
          api.get<AssignmentData[]>(`/booth-assignments?date=${todayStr}`),
          api.get<CupTypeItem[]>('/cup-types'),
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
        }

        if (cupRes.success && Array.isArray(cupRes.data)) {
          setCupTypes(cupRes.data);
          const initialStocks: Record<string, string> = {};
          cupRes.data.forEach((c) => {
            initialStocks[c.id] = '50';
          });
          setCupStocks(initialStocks);
        }
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  const currentHourDec = getWibHourDec();

  // Sesi ditentukan dari jadwal penugasan attendant jika ada, atau auto-detect waktu
  const activeSession: ShiftSession = (assignment?.shiftType as ShiftSession) || (currentHourDec >= 14.0 ? 'SORE' : 'PAGI');
  const hasAssignment = Boolean(assignment);

  const isPagi = activeSession === 'PAGI';
  const startWindowMin = isPagi ? 7.0 : 14.0;
  const startWindowMax = isPagi ? 16.0 : 21.0;
  const isTimeValid = currentHourDec >= startWindowMin && currentHourDec <= startWindowMax;

  const isAccessAllowed = hasAssignment && isTimeValid;

  const currentDistance =
    position && assignment?.latitude && assignment?.longitude
      ? calculateDistanceMeters(assignment.latitude, assignment.longitude, position.latitude, position.longitude)
      : null;
  const isWithinRadius = currentDistance !== null ? currentDistance <= 200 : true;

  let lockedReason = '';
  if (!hasAssignment) {
    lockedReason = `Anda tidak memiliki jadwal penugasan shift hari ini di database. Hanya staf yang ditugaskan oleh Admin yang dapat membuka shift.`;
  } else if (currentHourDec < startWindowMin) {
    lockedReason = `Akses buka shift baru dibuka pukul ${isPagi ? '07:00' : '14:00'} WIB (2 jam sebelum jam operasional dimulai).`;
  } else if (currentHourDec > startWindowMax) {
    lockedReason = `Waktu presensi buka shift telah ditutup (Batas maksimal pukul ${isPagi ? '16:00' : '21:00'} WIB).`;
  }

  const handleStockChange = (cupId: string, val: string) => {
    setCupStocks((prev) => ({ ...prev, [cupId]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAccessAllowed) {
      setError(lockedReason);
      return;
    }

    if (position && currentDistance !== null && currentDistance > 200) {
      setError(`Akses Ditolak: Lokasi Anda saat ini (${Math.round(currentDistance)} meter) berada di luar batas radius maksimal 200 meter dari ${assignment?.boothName || 'booth'}. Silakan mendekat ke lokasi booth.`);
      return;
    }

    setError(null);
    const modal = parseInt(cashModal, 10);
    if (isNaN(modal) || modal < 0) {
      setError('Modal cash wajib diisi angka valid');
      return;
    }

    setSubmitting(true);
    try {
      const stockItems = cupTypes.map((c) => ({
        cupTypeId: c.id,
        qtyInitial: parseInt(cupStocks[c.id] || '0', 10) || 0,
      }));

      const res = await api.post('/daily-reports/start', {
        cashModal: modal,
        stockItems,
        gpsLatitude: position?.latitude ?? null,
        gpsLongitude: position?.longitude ?? null,
        gpsAccuracy: position?.accuracy ?? null,
      });

      if (res.success) {
        router.push('/attendant');
      } else {
        setError(res.error?.message || 'Gagal menyimpan laporan awal shift.');
      }
    } catch {
      setError('Terjadi kesalahan jaringan.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3">
        <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
        <p className="text-sm text-slate-500">Memeriksa jadwal penugasan shift...</p>
      </div>
    );
  }

  // JIKA AKSES TERKUNCI -> TAMPILKAN LAYAR LOCK PENUH
  if (!isAccessAllowed) {
    return (
      <div className="space-y-6 pb-24">
        <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-md">
          <div className="flex items-center justify-between mb-2">
            <Link
              href="/attendant"
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700 transition flex items-center gap-1.5 border border-slate-700"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali
            </Link>
            <span className="text-xs text-slate-300 font-mono">
              {getWibDateFormatted()}
            </span>
          </div>
          <h1 className="text-xl font-bold">Presensi Mulai Shift</h1>
        </div>

        <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-xs">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-extrabold text-slate-900">Akses Buka Shift Terkunci</h2>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
              {lockedReason}
            </p>
          </div>

          <div className="rounded-xl bg-amber-50 p-3.5 border border-amber-200 text-left text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Info Shift Hari Ini:</p>
              <p className="mt-0.5 text-slate-700">
                Akun: <strong className="text-slate-900">{user?.email || 'Attendant'}</strong>
                <br />
                Sesi Terdeteksi: <strong>Shift {isPagi ? 'Pagi (09:00 - 16:00)' : 'Sore (16:00 - 21:00)'}</strong>
              </p>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/attendant"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 px-4 text-sm font-bold text-white hover:bg-slate-800 transition"
            >
              Kembali ke Beranda Attendant
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32">
      <div className="rounded-xl bg-emerald-800 p-6 text-white shadow-md">
        <div className="flex items-center justify-between mb-3">
          <Link
            href="/attendant"
            className="rounded-lg bg-emerald-900/80 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-950 transition flex items-center gap-1.5 border border-emerald-600/40"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Link>
          <span className="text-xs text-emerald-200 font-mono">
            {getWibDateFormatted()}
          </span>
        </div>
        <h1 className="text-xl font-bold">Laporan Awal Shift ({isPagi ? 'Pagi' : 'Sore'})</h1>
        <p className="mt-1 text-xs text-emerald-100">{assignment?.boothName || 'Booth Teh Baling'}</p>
      </div>

      {error && (
        <div data-testid="start-shift-error" className="rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-slate-900">1. Uang Modal Kasir</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700">Nominal Modal (Rp)</label>
            <input
              type="number"
              inputMode="numeric"
              data-testid="cash-modal-input"
              value={cashModal}
              onChange={(e) => setCashModal(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-lg font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-slate-900">2. Stok Cup Awal Dibawa</h2>
          {cupTypes.length === 0 ? (
            <p className="text-xs text-slate-500">Memuat varian ukuran cup dari database...</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {cupTypes.map((c) => (
                <div key={c.id}>
                  <label className="block text-xs font-medium text-slate-600">{c.name}</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={cupStocks[c.id] || '0'}
                    onChange={(e) => handleStockChange(c.id, e.target.value)}
                    className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900 font-semibold"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">3. Validasi Geolocation (GPS)</h2>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
              Radius Maks: 200 Meter
            </span>
          </div>

          <button
            type="button"
            data-testid="gps-capture-btn"
            onClick={requestPosition}
            disabled={gpsLoading}
            className="w-full rounded-lg border border-emerald-600 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 transition"
          >
            {gpsLoading ? 'Mendeteksi Lokasi...' : '📍 Deteksi Lokasi Sekarang'}
          </button>

          {position && currentDistance !== null && (
            <div className={`rounded-lg p-3 text-xs border ${
              isWithinRadius
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-red-50 border-red-300 text-red-900'
            }`}>
              <div className="flex items-center justify-between font-bold">
                <span>{isWithinRadius ? '✓ Lokasi Sesuai (Dalam Radius)' : '⚠️ Di Luar Radius 200m!'}</span>
                <span className="font-mono">{Math.round(currentDistance)} meter dari booth</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-600">
                Akurasi GPS Perangkat: ±{Math.round(position.accuracy)}m ({position.latitude.toFixed(6)}, {position.longitude.toFixed(6)})
              </p>
            </div>
          )}

          {position && currentDistance === null && (
            <p data-testid="gps-status" className="text-xs text-emerald-600 font-semibold">
              ✓ Lokasi Terdeteksi (Akurasi: {Math.round(position.accuracy)}m)
            </p>
          )}

          {gpsError && (
            <p data-testid="gps-error" className="text-xs text-red-600 font-semibold">
              ⚠️ GPS Ditolak / Tidak Tersedia: {gpsError}
            </p>
          )}
        </div>

        <div className="pt-2 mb-16 flex items-center gap-3">
          <Link
            href="/attendant"
            className="rounded-xl border border-slate-300 bg-slate-100 px-4 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-200 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Link>
          <button
            type="submit"
            data-testid="start-shift-submit-btn"
            disabled={submitting}
            className="flex-1 rounded-xl bg-emerald-700 py-3.5 text-base font-bold text-white shadow-md hover:bg-emerald-800 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            {submitting ? 'Menyimpan...' : 'Simpan & Mulai Shift'}
          </button>
        </div>
      </form>
    </div>
  );
}