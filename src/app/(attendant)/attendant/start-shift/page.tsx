'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useGeolocation } from '@/hooks/use-geolocation';
import { api } from '@/lib/api-client';
import { ArrowLeft, Save } from 'lucide-react';

export default function StartShiftPage() {
  const router = useRouter();
  const { position, error: gpsError, loading: gpsLoading, requestPosition } = useGeolocation();
  const [cashModal, setCashModal] = useState('50000');
  const [stockKecil, setStockKecil] = useState('50');
  const [stockMedium, setStockMedium] = useState('50');
  const [stockBig, setStockBig] = useState('50');
  const [stockJumbo, setStockJumbo] = useState('50');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
            {new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
        <h1 className="text-xl font-bold">Laporan Awal Shift</h1>
        <p className="mt-1 text-xs text-emerald-100">Booth Alun-Alun Kota</p>
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
                className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900"
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
                className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900"
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
                className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900"
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
                className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900"
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
            className="w-full rounded-lg border border-emerald-600 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
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