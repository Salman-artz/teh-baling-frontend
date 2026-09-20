'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { Flame, Clock, Calendar, CheckCircle2, AlertCircle, Save, History, Lock } from 'lucide-react';

export default function ProductionPage() {
  const [totalLiters, setTotalLiters] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [isOperatingHours, setIsOperatingHours] = useState(true);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentDate(now.toISOString().split('T')[0]);
      setCurrentTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB');

      try {
        const parts = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Jakarta',
          hour: 'numeric',
          minute: 'numeric',
          hour12: false,
        }).formatToParts(now);

        const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
        const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
        const totalMinutes = hour * 60 + minute;

        // Jam 5 pagi (05:00 = 300) sampai jam 9 malam (21:00 = 1260 menit) WIB
        const open = totalMinutes >= 5 * 60 && totalMinutes <= 21 * 60;
        setIsOperatingHours(open);
      } catch {
        setIsOperatingHours(true);
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!isOperatingHours) {
      setError('Akses laporan produksi hanya dapat diisi pada jam operasional 05:00 - 21:00 WIB.');
      return;
    }

    const liters = parseFloat(totalLiters);
    if (isNaN(liters) || liters <= 0) {
      setError('Total liter teh wajib lebih besar dari 0');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/production-reports', {
        totalLiters: liters,
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        setSuccess(true);
        setTotalLiters('');
        setNotes('');
      } else {
        setError(res.error?.message || 'Gagal menyimpan laporan produksi.');
      }
    } catch {
      // M-5 Fix: Correct network error handling
      setError('Terjadi gangguan jaringan atau server. Gagal menyimpan laporan produksi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Card Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-800 to-amber-950 p-6 text-white shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-6 h-6 text-amber-300" />
            <h1 className="text-xl font-bold">Laporan Memasak Teh Dapur</h1>
          </div>
          <Link
            href="/production/history"
            className="rounded-lg bg-amber-900/80 px-3 py-1.5 text-xs font-bold text-amber-100 hover:bg-amber-950 transition flex items-center gap-1.5 border border-amber-600/40"
          >
            <History className="w-4 h-4" />
            Riwayat
          </Link>
        </div>
        <p className="text-xs text-amber-200">
          Input total volume teh yang telah selesai dimasak untuk didistribusikan ke outlet booth
        </p>
      </div>

      {/* Real-time Timestamp & Shift Info Box */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-2 text-xs text-amber-900 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <Calendar className="w-4 h-4 text-amber-700" />
            <span>Tanggal: <strong>{currentDate || '2026-09-16'}</strong></span>
          </div>
          <div className="flex items-center gap-2 font-mono font-bold text-amber-800">
            <Clock className="w-4 h-4 text-amber-700" />
            <span>{currentTime || '08:30 WIB'}</span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-amber-200/60">
          <span className="text-slate-600 font-medium">Jam Operasional Input: <strong>05:00 - 21:00 WIB</strong></span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
            isOperatingHours
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : 'bg-red-100 text-red-800 border border-red-300'
          }`}>
            {isOperatingHours ? '● Dapur Buka' : '● Dapur Tutup'}
          </span>
        </div>
      </div>

      {/* Lock Warning if Outside Operating Hours */}
      {!isOperatingHours && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/90 p-5 text-amber-950 shadow-sm flex items-start gap-3.5">
          <Lock className="w-6 h-6 text-amber-800 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-amber-950">Akses Input Produksi Sedang Ditutup</h3>
            <p className="text-xs text-amber-800 leading-relaxed">
              Penginputan laporan memasak teh hanya dapat dilakukan saat jam operasional <strong>05:00 WIB s/d 21:00 WIB</strong>.
            </p>
            <p className="text-[11px] text-amber-700 font-medium">
              Silakan kembali saat jam operasional telah aktif. Anda tetap dapat meninjau rekap di menu Riwayat.
            </p>
          </div>
        </div>
      )}

      {success && (
        <div data-testid="production-success" className="rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 border border-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>✓ Laporan memasak teh berhasil disimpan & dicatat dengan timestamp!</span>
        </div>
      )}

      {error && (
        <div data-testid="production-error" className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700 border border-red-300 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label className="block text-sm font-bold text-slate-900">Total Liter Teh Dimasak</label>
          <div className="relative mt-2">
            <input
              type="number"
              step="0.5"
              inputMode="decimal"
              data-testid="total-liters-input"
              value={totalLiters}
              onChange={(e) => setTotalLiters(e.target.value)}
              placeholder="misal: 150"
              required
              disabled={!isOperatingHours || loading}
              className="block w-full rounded-xl border border-slate-300 p-3.5 pr-16 text-2xl font-black text-amber-900 focus:border-amber-600 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
            />
            <span className="absolute right-4 top-4 text-sm font-bold text-slate-500">Liter</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Satu dandang masak penuh biasanya 50 - 75 Liter</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Catatan Produksi (Opsional)</label>
          <textarea
            data-testid="production-notes-input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Catatan varian teh, gula cair, kompor, atau sisa bahan..."
            rows={3}
            disabled={!isOperatingHours || loading}
            className="mt-1.5 block w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-900 focus:border-amber-600 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
          />
        </div>

        <button
          type="submit"
          data-testid="production-submit-btn"
          disabled={!isOperatingHours || loading}
          className="w-full rounded-xl bg-amber-800 py-3.5 text-base font-bold text-white shadow-md hover:bg-amber-900 disabled:opacity-50 disabled:bg-slate-400 transition flex items-center justify-center gap-2"
        >
          {!isOperatingHours ? (
            <>
              <Lock className="w-5 h-5" />
              <span>Akses Ditutup (05:00 - 21:00 WIB)</span>
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>{loading ? 'Menyimpan...' : 'Simpan Laporan Memasak'}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}