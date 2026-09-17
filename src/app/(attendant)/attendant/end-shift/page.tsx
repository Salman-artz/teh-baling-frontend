'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useGeolocation } from '@/hooks/use-geolocation';
import { api } from '@/lib/api-client';
import { formatRupiah } from '@/lib/utils';
import { MapPin, Calculator, CheckCircle2, ArrowLeft, Save } from 'lucide-react';

export default function EndShiftPage() {
  const router = useRouter();
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
        // Fallback demo redirect
        router.push('/attendant');
      }
    } catch {
      router.push('/attendant');
    } finally {
      setSubmitting(false);
    }
  };

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
          <span className="text-xs text-slate-300">16 Sep 2026</span>
        </div>
        <h1 className="text-xl font-bold">Laporan Akhir Shift</h1>
        <p className="mt-1 text-xs text-slate-300">Booth Alun-Alun Kota — Input Rekap Penjualan & Selisih Uang</p>
      </div>

      {error && (
        <div data-testid="end-shift-error" className="rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Step 1: Penjualan Minuman */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 text-sm">1. Rincian Penjualan Minuman (Cup Terjual)</h2>

          <div className="space-y-3">
            {salesItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <div>
                  <p className="text-xs font-bold text-slate-900">{item.productName}</p>
                  <p className="text-[11px] font-semibold text-emerald-700">{formatRupiah(item.price)} / cup</p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={item.qtySold}
                    onChange={(e) => handleQtyChange(item.id, e.target.value)}
                    className="w-16 rounded-md border border-slate-300 p-1.5 text-center text-sm font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                  <span className="text-xs text-slate-500 font-medium">Cup</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-200 flex justify-between text-xs font-bold text-slate-700">
            <span>Total Omzet Minuman:</span>
            <span className="text-emerald-700 font-extrabold text-sm">{formatRupiah(totalSalesRevenue)}</span>
          </div>
        </div>

        {/* Step 2: Final Cash Input & Auto Variance Calculation */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Calculator className="w-4 h-4 text-emerald-700" />
            2. Uang Akhir Kasir & Perhitungan Selisih
          </h2>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500">Nominal Uang Kasir Akhir (Rp)</label>
            <input
              type="number"
              inputMode="numeric"
              data-testid="cash-final-input"
              value={cashFinal}
              onChange={(e) => setCashFinal(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 p-3 text-lg font-black text-slate-900 focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Uang Modal Awal:</span>
              <span className="font-bold">{formatRupiah(cashModal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Total Hasil Penjualan:</span>
              <span className="font-bold">{formatRupiah(totalSalesRevenue)}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-800 border-t border-slate-200 pt-1.5">
              <span>Ekspektasi Uang Fisik Kasir:</span>
              <span>{formatRupiah(expectedTotalCash)}</span>
            </div>
            <div className="flex justify-between font-bold text-sm border-t border-slate-200 pt-1.5">
              <span>Selisih Uang (Variance):</span>
              <span className={variance < 0 ? 'text-red-600 font-black' : 'text-emerald-700 font-black'}>
                {formatRupiah(variance)} {variance === 0 && '(Sesuai 👍)'}
              </span>
            </div>
          </div>
        </div>

        {/* Step 3: Geolocation Validasi */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-700" />
            3. Validasi Geolocation (GPS)
          </h2>
          <button
            type="button"
            data-testid="gps-capture-btn"
            onClick={requestPosition}
            disabled={gpsLoading}
            className="w-full rounded-lg border border-emerald-600 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
          >
            {gpsLoading ? 'Mendeteksi Lokasi...' : '📍 Capture Lokasi GPS Akhir Shift'}
          </button>
          {position && (
            <p data-testid="gps-status" className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Lokasi Terdeteksi ({Math.round(position.accuracy)}m)
            </p>
          )}
          {gpsError && (
            <p data-testid="gps-error" className="text-xs text-red-600 font-semibold">
              ⚠️ GPS Ditolak / Tidak Tersedia
            </p>
          )}
        </div>

        {/* Notes */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
          <label className="block text-xs font-semibold uppercase text-slate-500">Catatan Shift Akhir</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Catatan kendala sisa stok, sisa bahan, atau cuaca..."
            className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        {/* Submit Action Bar */}
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
            className="flex-1 rounded-xl bg-slate-900 py-3.5 text-base font-bold text-white shadow-md hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            {submitting ? 'Menyimpan...' : 'Simpan & Tutup Shift'}
          </button>
        </div>
      </form>
    </div>
  );
}