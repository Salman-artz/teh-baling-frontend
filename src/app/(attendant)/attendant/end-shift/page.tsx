'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useGeolocation } from '@/hooks/use-geolocation';
import { api } from '@/lib/api-client';
import { formatRupiah } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { MapPin, Calculator, CheckCircle2, ArrowLeft, Save, Lock, AlertTriangle, ArrowRight } from 'lucide-react';

type ShiftSession = 'PAGI' | 'SORE';

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

const MOCK_USER_ASSIGNMENTS: Record<
  string,
  Record<
    ShiftSession,
    { boothName: string; address: string; cashModal: number; lat: number; lng: number } | null
  >
> = {
  'rina@tehbaling.com': {
    PAGI: { boothName: 'Booth Alun-Alun Kota', address: 'Jl. Merdeka No. 1, Surabaya', cashModal: 50000, lat: -7.2575, lng: 112.7521 },
    SORE: null,
  },
  'siti@tehbaling.com': {
    PAGI: { boothName: 'Booth Kampus UNESA', address: 'Jl. Ketintang No. 45, Surabaya', cashModal: 50000, lat: -7.3082, lng: 112.6738 },
    SORE: null,
  },
};

export default function EndShiftPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { position, error: gpsError, loading: gpsLoading, requestPosition } = useGeolocation();

  // Mock Sales Items
  const [salesItems, setSalesItems] = useState([
    { id: 'item1', productName: 'Teh Baling Ori Melati (Cup Big)', price: 12000, qtySold: 50 },
    { id: 'item2', productName: 'Teh Baling Ori Melati (Cup Jumbo)', price: 15000, qtySold: 30 },
    { id: 'item3', productName: 'Teh Baling Lemon Tea (Cup Big)', price: 12000, qtySold: 40 },
    { id: 'item4', productName: 'Teh Baling Yakult Ori (Cup Big)', price: 14000, qtySold: 25 },
    { id: 'item5', productName: 'Teh Baling Fruity Mango (Cup Jumbo)', price: 16000, qtySold: 25 },
  ]);

  const [cashFinal, setCashFinal] = useState('1900000');
  const [notes, setNotes] = useState('');
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
    PAGI: { boothName: 'Booth Alun-Alun Kota', address: 'Jl. Merdeka No. 1, Surabaya', cashModal: 50000, lat: -7.2575, lng: 112.7521 },
    SORE: null,
  };

  const wib = getWibNow();
  const currentHourDec = wib.getHours() + wib.getMinutes() / 60;

  // Auto-detect sesi (Pagi 09:00-18:00 / Sore 16:00-23:00)
  const activeSession: ShiftSession = currentHourDec >= 16.0 ? 'SORE' : 'PAGI';
  const assignedShift = userAssignments[activeSession];
  const hasAssignment = Boolean(assignedShift);

  const isPagi = activeSession === 'PAGI';
  const endWindowMin = isPagi ? 9.0 : 16.0;
  const endWindowMax = isPagi ? 18.0 : 23.0;
  const isTimeValid = currentHourDec >= endWindowMin && currentHourDec <= endWindowMax;

  const isAccessAllowed = hasAssignment && isTimeValid;

  const currentDistance =
    position && assignedShift?.lat && assignedShift?.lng
      ? calculateDistanceMeters(assignedShift.lat, assignedShift.lng, position.latitude, position.longitude)
      : null;
  const isWithinRadius = currentDistance !== null ? currentDistance <= 200 : true;

  let lockedReason = '';
  if (!hasAssignment) {
    lockedReason = `Anda tidak memiliki jadwal penugasan pada Shift ${isPagi ? 'Pagi' : 'Sore'} hari ini. Hanya staf yang ditugaskan oleh Admin yang dapat menutup shift kasir.`;
  } else if (currentHourDec < endWindowMin) {
    lockedReason = `Akses tutup shift baru dibuka saat jam shift berjalan (mulai pukul ${isPagi ? '09:00' : '16:00'} WIB).`;
  } else if (currentHourDec > endWindowMax) {
    lockedReason = `Batas waktu toleransi pengisian tutup shift telah berakhir (Maksimal pukul ${isPagi ? '18:00' : '23:00'} WIB / 2 jam setelah outlet tutup).`;
  }

  // Auto Calculations
  const cashModal = 50000;
  const totalSalesRevenue = salesItems.reduce((acc, item) => acc + item.price * item.qtySold, 0);
  const expectedTotalCash = cashModal + totalSalesRevenue;
  const finalCashNum = parseInt(cashFinal, 10) || 0;
  const variance = finalCashNum - expectedTotalCash;

  const handleQtyChange = (id: string, qtyStr: string) => {
    const qty = parseInt(qtyStr, 10);
    setSalesItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, qtySold: isNaN(qty) ? 0 : qty } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAccessAllowed) {
      setError(lockedReason);
      return;
    }

    if (position && currentDistance !== null && currentDistance > 200) {
      setError(`Akses Ditolak: Lokasi Anda saat ini (${Math.round(currentDistance)} meter) berada di luar batas radius maksimal 200 meter dari ${assignedShift?.boothName || 'booth'}. Silakan mendekat ke lokasi booth.`);
      return;
    }

    setError(null);
    if (isNaN(finalCashNum) || finalCashNum < 0) {
      setError('Uang akhir kasir wajib diisi angka valid');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/daily-reports/end', {
        cashFinal: finalCashNum,
        saleItems: salesItems.map((s) => ({
          productId: 'p1',
          cupTypeId: 'c1',
          qtySold: s.qtySold,
        })),
        notes,
        gpsLatitude: position?.latitude ?? null,
        gpsLongitude: position?.longitude ?? null,
        gpsAccuracy: position?.accuracy ?? null,
      });

      if (res.success) {
        router.push('/attendant');
      } else {
        router.push('/attendant');
      }
    } catch {
      router.push('/attendant');
    } finally {
      setSubmitting(false);
    }
  };

  // JIKA AKSES TERKUNCI -> TAMPILKAN LAYAR LOCK PENUH
  if (!isAccessAllowed) {
    return (
      <div className="space-y-6 pb-24 max-w-lg mx-auto">
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
          <h1 className="text-xl font-bold">Laporan Akhir Shift</h1>
        </div>

        <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-xs">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-extrabold text-slate-900">Akses Akhiri Shift Terkunci</h2>
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
    <div className="space-y-6 pb-28 max-w-lg mx-auto">
      <div className="rounded-xl bg-slate-900 p-5 text-white shadow-md">
        <div className="flex items-center justify-between mb-3">
          <Link
            href="/attendant"
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700 transition flex items-center gap-1.5 border border-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Link>
          <span className="text-xs text-slate-300 font-mono">
            {wib.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
        <h1 className="text-xl font-bold">Laporan Akhir Shift ({isPagi ? 'Pagi' : 'Sore'})</h1>
        <p className="mt-1 text-xs text-slate-300">{assignedShift?.boothName || 'Booth Teh Baling'} — Input Rekap Penjualan & Selisih Uang</p>
      </div>

      {error && (
        <div data-testid="end-shift-error" className="rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Penjualan Produk */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-slate-900">1. Rekap Produk Terjual</h2>
          <div className="divide-y divide-slate-100">
            {salesItems.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{item.productName}</p>
                  <p className="text-xs text-slate-500 font-mono">{formatRupiah(item.price)} / cup</p>
                </div>
                <div className="w-24">
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    data-testid={`qty-sold-${item.id}`}
                    value={item.qtySold}
                    onChange={(e) => handleQtyChange(item.id, e.target.value)}
                    className="w-full rounded-md border border-slate-300 p-2 text-right text-sm font-bold text-slate-900 focus:border-slate-500 focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between font-bold text-sm">
            <span>Subtotal Penjualan:</span>
            <span className="text-emerald-700">{formatRupiah(totalSalesRevenue)}</span>
          </div>
        </div>

        {/* Step 2: Hitung Kas Akhir & Selisih */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-slate-900 flex items-center gap-1.5">
            <Calculator className="w-4 h-4 text-slate-600" />
            2. Rekonsiliasi Kas Akhir
          </h2>

          <div className="bg-slate-50 p-3.5 rounded-lg space-y-2 text-xs border border-slate-200/80">
            <div className="flex justify-between text-slate-600">
              <span>Modal Kas Awal:</span>
              <span className="font-mono">{formatRupiah(cashModal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Total Penjualan Cup:</span>
              <span className="font-mono">{formatRupiah(totalSalesRevenue)}</span>
            </div>
            <div className="pt-1.5 border-t border-slate-200 flex justify-between font-bold text-slate-900 text-sm">
              <span>Ekspektasi Uang di Laci:</span>
              <span className="text-slate-900 font-mono">{formatRupiah(expectedTotalCash)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Total Uang Fisik Kasir (Rp)</label>
            <input
              type="number"
              inputMode="numeric"
              data-testid="cash-final-input"
              value={cashFinal}
              onChange={(e) => setCashFinal(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-lg font-bold text-slate-900 focus:border-slate-500 focus:outline-none"
              required
            />
          </div>

          {/* Alert Selisih Kasir Real-time */}
          <div
            data-testid="cash-variance-badge"
            className={`p-3 rounded-lg text-sm font-semibold flex items-center justify-between ${
              variance === 0
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : variance < 0
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            <span>Status Selisih Kas:</span>
            <span className="font-bold">
              {variance === 0
                ? '✓ Kas Pas (Rp 0)'
                : variance < 0
                ? `⚠️ Kurang Kas: ${formatRupiah(Math.abs(variance))}`
                : `+ Lebih Kas: ${formatRupiah(variance)}`}
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">Catatan Tambahan (Opsional)</label>
            <textarea
              rows={2}
              data-testid="notes-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Misal: ada uang kembalian rusak atau stok cup pecah..."
              className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-xs text-slate-900 focus:border-slate-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Step 3: Geolocation */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-slate-600" />
              3. Presensi Lokasi Tutup Shift
            </h2>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
              Radius Maks: 200 Meter
            </span>
          </div>

          <button
            type="button"
            data-testid="gps-capture-end-btn"
            onClick={requestPosition}
            disabled={gpsLoading}
            className="w-full rounded-lg border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            {gpsLoading ? 'Mendeteksi Lokasi...' : '📍 Konfirmasi Lokasi Tutup Shift'}
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
            <p data-testid="gps-end-status" className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Lokasi GPS Terverifikasi (Akurasi: {Math.round(position.accuracy)}m)
            </p>
          )}

          {gpsError && (
            <p data-testid="gps-end-error" className="text-xs text-red-600 font-semibold">
              ⚠️ GPS Tidak Terdeteksi: {gpsError}
            </p>
          )}
        </div>

        {/* Submit Buttons */}
        <div className="pt-2 flex items-center gap-3">
          <Link
            href="/attendant"
            className="rounded-xl border border-slate-300 bg-slate-100 px-4 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-200 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Link>
          <button
            type="submit"
            data-testid="end-shift-submit-btn"
            disabled={submitting}
            className="flex-1 rounded-xl bg-slate-900 py-3.5 text-base font-bold text-white shadow-md hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            {submitting ? 'Menutup Shift...' : 'Simpan & Tutup Shift'}
          </button>
        </div>
      </form>
    </div>
  );
}