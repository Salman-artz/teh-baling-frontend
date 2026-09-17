'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useGeolocation } from '@/hooks/use-geolocation';
import { api } from '@/lib/api-client';
import { formatRupiah } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { MapPin, Calculator, CheckCircle2, ArrowLeft, Save, Lock, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';

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

interface ProductItem {
  id: string;
  name: string;
  seriesName?: string;
}

interface SalesItem {
  id: string;
  productId: string;
  productName: string;
  price: number;
  qtySold: number;
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

export default function EndShiftPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { position, error: gpsError, loading: gpsLoading, requestPosition } = useGeolocation();

  const [assignment, setAssignment] = useState<AssignmentData | null>(null);
  const [salesItems, setSalesItems] = useState<SalesItem[]>([]);
  const [cashModal] = useState(50000);
  const [cashFinal, setCashFinal] = useState('0');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Ambil waktu WIB (UTC+7)
  const getWibNow = () => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utc + 3600000 * 7);
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const wib = getWibNow();
      const todayStr = wib.toISOString().split('T')[0]!;

      try {
        const [assignRes, prodRes] = await Promise.all([
          api.get<AssignmentData[]>(`/booth-assignments?date=${todayStr}`),
          api.get<ProductItem[]>('/tea-products'),
        ]);

        if (assignRes.success && Array.isArray(assignRes.data)) {
          const myAssignment = assignRes.data.find(
            (a) =>
              (user?.id && a.userId === user.id) ||
              (user?.email && a.userEmail?.toLowerCase() === user.email.toLowerCase()) ||
              (user?.email && a.userName.toLowerCase().includes(user.email.toLowerCase()))
          );
          setAssignment(myAssignment || null);
        }

        if (prodRes.success && Array.isArray(prodRes.data) && prodRes.data.length > 0) {
          const items: SalesItem[] = prodRes.data.map((p, idx) => ({
            id: p.id,
            productId: p.id,
            productName: p.name,
            price: 10000 + (idx % 3) * 2000,
            qtySold: 0,
          }));
          setSalesItems(items);
        }
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  const wib = getWibNow();
  const currentHourDec = wib.getHours() + wib.getMinutes() / 60;

  // Auto-detect sesi (Pagi 09:00-18:00 / Sore 16:00-23:00)
  const activeSession: ShiftSession = currentHourDec >= 16.0 ? 'SORE' : 'PAGI';
  const hasAssignment = Boolean(assignment);

  const isPagi = activeSession === 'PAGI';
  const endWindowMin = isPagi ? 9.0 : 16.0;
  const endWindowMax = isPagi ? 18.0 : 23.0;
  const isTimeValid = currentHourDec >= endWindowMin && currentHourDec <= endWindowMax;

  const isAccessAllowed = hasAssignment && isTimeValid;

  const currentDistance =
    position && assignment?.latitude && assignment?.longitude
      ? calculateDistanceMeters(assignment.latitude, assignment.longitude, position.latitude, position.longitude)
      : null;
  const isWithinRadius = currentDistance !== null ? currentDistance <= 200 : true;

  let lockedReason = '';
  if (!hasAssignment) {
    lockedReason = `Anda tidak memiliki jadwal penugasan shift hari ini di database. Hanya staf yang ditugaskan oleh Admin yang dapat menutup shift kasir.`;
  } else if (currentHourDec < endWindowMin) {
    lockedReason = `Akses tutup shift baru dibuka saat jam shift berjalan (mulai pukul ${isPagi ? '09:00' : '16:00'} WIB).`;
  } else if (currentHourDec > endWindowMax) {
    lockedReason = `Batas waktu toleransi pengisian tutup shift telah berakhir (Maksimal pukul ${isPagi ? '18:00' : '23:00'} WIB / 2 jam setelah outlet tutup).`;
  }

  // Auto Calculations
  const totalSalesRevenue = salesItems.reduce((acc, item) => acc + item.price * item.qtySold, 0);
  const expectedTotalCash = cashModal + totalSalesRevenue;
  const finalCashNum = parseInt(cashFinal, 10) || 0;
  const variance = finalCashNum - expectedTotalCash;

  const handleQtyChange = (id: string, qtyStr: string) => {
    const qty = parseInt(qtyStr, 10);
    const validQty = isNaN(qty) ? 0 : Math.max(0, qty);
    setSalesItems((prev) => {
      const updated = prev.map((item) => (item.id === id ? { ...item, qtySold: validQty } : item));
      const newRev = updated.reduce((acc, it) => acc + it.price * it.qtySold, 0);
      setCashFinal(String(cashModal + newRev));
      return updated;
    });
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
    if (isNaN(finalCashNum) || finalCashNum < 0) {
      setError('Uang akhir kasir wajib diisi angka valid');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/daily-reports/end', {
        cashFinal: finalCashNum,
        saleItems: salesItems.map((s) => ({
          productId: s.productId,
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
        setError(res.error?.message || 'Gagal menutup shift.');
      }
    } catch {
      router.push('/attendant');
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
        <h1 className="text-xl font-bold">Closing Shift Kasir ({isPagi ? 'Pagi' : 'Sore'})</h1>
        <p className="mt-1 text-xs text-slate-300 flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" />
          {assignment?.boothName || 'Booth Teh Baling'}
        </p>
      </div>

      {error && (
        <div data-testid="end-shift-error" className="rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Input Penjualan Produk Teh */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="font-bold text-slate-900 text-sm">1. Input Penjualan Produk Teh</h2>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              {salesItems.reduce((sum, item) => sum + item.qtySold, 0)} Cup Terjual
            </span>
          </div>

          <div className="space-y-2.5">
            {salesItems.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">Memuat daftar menu produk dari database...</p>
            ) : (
              salesItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200/80 bg-slate-50/50"
                >
                  <div>
                    <p className="font-semibold text-xs text-slate-900">{item.productName}</p>
                    <p className="text-[11px] text-slate-500">{formatRupiah(item.price)} / cup</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      value={item.qtySold === 0 ? '' : item.qtySold}
                      onChange={(e) => handleQtyChange(item.id, e.target.value)}
                      placeholder="0"
                      className="w-16 rounded-md border border-slate-300 px-2 py-1 text-sm font-bold text-center text-slate-900 focus:border-emerald-500 focus:outline-none"
                    />
                    <span className="text-xs font-medium text-slate-500">Cup</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Input Uang Fisik Kasir */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="font-bold text-slate-900 text-sm">2. Uang Fisik Akhir di Laci Kasir</h2>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Total Uang Kasir (Modal + Omzet Penjualan)
            </label>
            <input
              type="number"
              inputMode="numeric"
              data-testid="cash-final-input"
              value={cashFinal}
              onChange={(e) => setCashFinal(e.target.value)}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-lg font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>
        </div>

        {/* Ringkasan & Kalkulasi Selisih Kasir Otomatis */}
        <div className="rounded-xl border border-slate-200 bg-slate-900 p-5 text-white shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <Calculator className="w-4 h-4 text-emerald-400" />
            <h2 className="font-bold text-sm text-white">3. Rekonsiliasi Kasir Otomatis</h2>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Modal Awal Kas:</span>
              <span>{formatRupiah(cashModal)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Total Omzet Penjualan:</span>
              <span className="font-semibold text-emerald-400">{formatRupiah(totalSalesRevenue)}</span>
            </div>
            <div className="flex justify-between font-bold text-white pt-1 border-t border-slate-800">
              <span>Uang Kas Seharusnya:</span>
              <span>{formatRupiah(expectedTotalCash)}</span>
            </div>
            <div className="flex justify-between font-bold pt-1">
              <span>Selisih Kasir (Variance):</span>
              <span
                data-testid="variance-display"
                className={`text-sm ${
                  variance === 0
                    ? 'text-emerald-400'
                    : variance > 0
                    ? 'text-blue-400'
                    : 'text-red-400'
                }`}
              >
                {variance === 0 ? 'Rp 0 (Pas ✓)' : formatRupiah(variance)}
              </span>
            </div>
          </div>
        </div>

        {/* Catatan Tambahan */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
          <h2 className="font-bold text-slate-900 text-sm">4. Catatan Operasional Shift</h2>
          <textarea
            data-testid="shift-notes-input"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Catatan kendala / sisa cup rusak / kompor..."
            className="block w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        {/* Validasi Geolocation Radius 200m */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-sm">5. Validasi Lokasi Geolocation (GPS)</h2>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
              Maks: 200 Meter
            </span>
          </div>

          <button
            type="button"
            data-testid="gps-capture-btn"
            onClick={requestPosition}
            disabled={gpsLoading}
            className="w-full rounded-lg border border-indigo-600 py-2.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition"
          >
            {gpsLoading ? 'Mendeteksi Lokasi...' : '📍 Deteksi Lokasi Booth Saat Ini'}
          </button>

          {position && currentDistance !== null && (
            <div
              className={`rounded-lg p-3 text-xs border ${
                isWithinRadius
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-red-50 border-red-300 text-red-900'
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span>{isWithinRadius ? '✓ Lokasi Sesuai (Dalam Radius)' : '⚠️ Di Luar Radius 200m!'}</span>
                <span className="font-mono">{Math.round(currentDistance)} meter dari booth</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-600">
                Akurasi GPS: ±{Math.round(position.accuracy)}m ({position.latitude.toFixed(6)}, {position.longitude.toFixed(6)})
              </p>
            </div>
          )}

          {position && currentDistance === null && (
            <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Lokasi Terdeteksi (Akurasi: {Math.round(position.accuracy)}m)
            </p>
          )}

          {gpsError && (
            <p className="text-xs text-red-600 font-semibold">⚠️ GPS Ditolak / Tidak Tersedia: {gpsError}</p>
          )}
        </div>

        {/* Tombol Simpan & Tutup Shift */}
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
            data-testid="end-shift-submit-btn"
            disabled={submitting}
            className="flex-1 rounded-xl bg-indigo-800 py-3.5 text-base font-bold text-white shadow-md hover:bg-indigo-900 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            {submitting ? 'Menyimpan...' : 'Simpan & Tutup Shift'}
          </button>
        </div>
      </form>
    </div>
  );
}