'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useGeolocation } from '@/hooks/use-geolocation';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { ArrowLeft, Save, Lock, AlertTriangle, ArrowRight } from 'lucide-react';

type ShiftSession = 'PAGI' | 'SORE';

const MOCK_USER_ASSIGNMENTS: Record<
  string,
  Record<
    ShiftSession,
    { boothName: string; address: string; cashModal: number } | null
  >
> = {
  'rina@tehbaling.com': {
    PAGI: { boothName: 'Booth Alun-Alun Kota', address: 'Jl. Merdeka No. 1, Surabaya', cashModal: 50000 },
    SORE: null,
  },
  'siti@tehbaling.com': {
    PAGI: { boothName: 'Booth Kampus UNESA', address: 'Jl. Ketintang No. 45, Surabaya', cashModal: 50000 },
    SORE: null,
  },
};

export default function StartShiftPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { position, error: gpsError, loading: gpsLoading, requestPosition } = useGeolocation();
  
  const [cashModal, setCashModal] = useState('50000');
  const [stockKecil, setStockKecil] = useState('50');
  const [stockMedium, setStockMedium] = useState('50');
  const [stockBig, setStockBig] = useState('50');
  const [stockJumbo, setStockJumbo] = useState('50');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState('');

  // Ambil waktu WIB (UTC+7)
  const getWibNow = () => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utc + 3600000 * 7);
  };

  useEffect(() => {
    if (user?.email) {
      setCurrentUserEmail(user.email.toLowerCase());
    } else if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('auth_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.email) setCurrentUserEmail(parsed.email.toLowerCase());
        }
      } catch {}
    }
  }, [user]);

  const userAssignments = MOCK_USER_ASSIGNMENTS[currentUserEmail] || {
    PAGI: { boothName: 'Booth Alun-Alun Kota', address: 'Jl. Merdeka No. 1, Surabaya', cashModal: 50000 },
    SORE: null,
  };

  const wib = getWibNow();
  const currentHourDec = wib.getHours() + wib.getMinutes() / 60;

  // Auto-detect sesi (Pagi 07:00-16:00 / Sore 14:00-21:00)
  const activeSession: ShiftSession = currentHourDec >= 14.0 ? 'SORE' : 'PAGI';
  const assignedShift = userAssignments[activeSession];
  const hasAssignment = Boolean(assignedShift);

  const isPagi = activeSession === 'PAGI';
  const startWindowMin = isPagi ? 7.0 : 14.0;
  const startWindowMax = isPagi ? 16.0 : 21.0;
  const isTimeValid = currentHourDec >= startWindowMin && currentHourDec <= startWindowMax;

  const isAccessAllowed = hasAssignment && isTimeValid;

  let lockedReason = '';
  if (!hasAssignment) {
    lockedReason = `Anda tidak memiliki jadwal penugasan pada Shift ${isPagi ? 'Pagi' : 'Sore'} hari ini. Hanya staf yang ditugaskan oleh Admin yang dapat membuka shift.`;
  } else if (currentHourDec < startWindowMin) {
    lockedReason = `Akses buka shift baru dibuka pukul ${isPagi ? '07:00' : '14:00'} WIB (2 jam sebelum jam operasional dimulai).`;
  } else if (currentHourDec > startWindowMax) {
    lockedReason = `Waktu presensi buka shift telah ditutup (Batas maksimal pukul ${isPagi ? '16:00' : '21:00'} WIB).`;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAccessAllowed) {
      setError(lockedReason);
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
      const res = await api.post('/daily-reports/start', {
        cashModal: modal,
        stockItems: [
          { cupTypeId: 'c1111111-1111-1111-1111-111111111111', qtyInitial: parseInt(stockKecil, 10) || 0 },
          { cupTypeId: 'c2222222-2222-2222-2222-222222222222', qtyInitial: parseInt(stockMedium, 10) || 0 },
          { cupTypeId: 'c3333333-3333-3333-3333-333333333333', qtyInitial: parseInt(stockBig, 10) || 0 },
          { cupTypeId: 'c4444444-4444-4444-4444-444444444444', qtyInitial: parseInt(stockJumbo, 10) || 0 },
        ],
        gpsLatitude: position?.latitude ?? null,
        gpsLongitude: position?.longitude ?? null,
        gpsAccuracy: position?.accuracy ?? null,
      });

      if (res.success) {
        router.push('/attendant');
      } else {
        setError(!res.success ? res.error.message : 'Gagal menyimpan laporan awal.');
      }
    } catch {
      setError('Terjadi kesalahan jaringan.');
    } finally {
      setSubmitting(false);
    }
  };

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
              {wib.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
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
                Akun: <strong className="text-slate-900">{currentUserEmail || 'Attendant'}</strong>
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
            {wib.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
        <h1 className="text-xl font-bold">Laporan Awal Shift ({isPagi ? 'Pagi' : 'Sore'})</h1>
        <p className="mt-1 text-xs text-emerald-100">{assignedShift?.boothName || 'Booth Teh Baling'}</p>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600">Cup Kecil</label>
              <input
                type="number"
                inputMode="numeric"
                data-testid="stock-initial-kecil"
                value={stockKecil}
                onChange={(e) => setStockKecil(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900 font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Cup Medium</label>
              <input
                type="number"
                inputMode="numeric"
                data-testid="stock-initial-medium"
                value={stockMedium}
                onChange={(e) => setStockMedium(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900 font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Cup Big</label>
              <input
                type="number"
                inputMode="numeric"
                data-testid="stock-initial-big"
                value={stockBig}
                onChange={(e) => setStockBig(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900 font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Cup Jumbo</label>
              <input
                type="number"
                inputMode="numeric"
                data-testid="stock-initial-jumbo"
                value={stockJumbo}
                onChange={(e) => setStockJumbo(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900 font-semibold"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="font-semibold text-slate-900">3. Validasi Geolocation (GPS)</h2>
          <button
            type="button"
            data-testid="gps-capture-btn"
            onClick={requestPosition}
            disabled={gpsLoading}
            className="w-full rounded-lg border border-emerald-600 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 transition"
          >
            {gpsLoading ? 'Mendeteksi Lokasi...' : '📍 Deteksi Lokasi Sekarang'}
          </button>
          {position && (
            <p data-testid="gps-status" className="text-xs text-emerald-600 font-semibold">
              ✓ Lokasi Terdeteksi (Akurasi: {Math.round(position.accuracy)}m)
            </p>
          )}
          {gpsError && (
            <p data-testid="gps-error" className="text-xs text-red-600 font-semibold">
              ⚠️ GPS Ditolak / Tidak Tersedia
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