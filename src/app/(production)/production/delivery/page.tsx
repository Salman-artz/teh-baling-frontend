'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import {
  Truck,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Save,
  History,
  Lock,
  Store,
  Flame,
  Droplets,
} from 'lucide-react';

interface BoothOption {
  id: string;
  name: string;
  address: string;
  isActive: boolean;
}

interface StockSummary {
  date: string;
  totalCooked: number;
  totalDelivered: number;
  remainingStock: number;
}

export default function ProductionDeliveryPage() {
  const [booths, setBooths] = useState<BoothOption[]>([]);
  const [selectedBoothId, setSelectedBoothId] = useState('');
  const [totalLiters, setTotalLiters] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingBooths, setFetchingBooths] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [isOperatingHours, setIsOperatingHours] = useState(true);

  // Stock tracking state
  const [stockSummary, setStockSummary] = useState<StockSummary | null>(null);
  const [loadingStock, setLoadingStock] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      try {
        const dateParts = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Jakarta',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(now);
        setCurrentDate(dateParts);

        const timeString =
          new Intl.DateTimeFormat('id-ID', {
            timeZone: 'Asia/Jakarta',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          }).format(now) + ' WIB';
        setCurrentTime(timeString);

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

  const fetchStock = useCallback(async () => {
    setLoadingStock(true);
    try {
      const res = await api.get<StockSummary>('/production-stock');
      if (res.success && res.data) {
        setStockSummary(res.data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingStock(false);
    }
  }, []);

  useEffect(() => {
    async function fetchBooths() {
      setFetchingBooths(true);
      try {
        const res = await api.get<BoothOption[]>('/booths?status=active');
        if (res.success && Array.isArray(res.data)) {
          setBooths(res.data);
          if (res.data.length > 0) {
            setSelectedBoothId(res.data[0].id);
          }
        }
      } catch {
        // fallback
      } finally {
        setFetchingBooths(false);
      }
    }
    fetchBooths();
    fetchStock();
  }, [fetchStock]);

  const remainingStock = stockSummary?.remainingStock ?? 0;
  const inputLitersNum = parseFloat(totalLiters) || 0;
  const isOverStock = inputLitersNum > remainingStock;

  const handleQuickAddLiters = (amount: number) => {
    const current = parseFloat(totalLiters) || 0;
    const target = current + amount;
    // Jangan melebihi sisa stok jika stok tersedia
    if (remainingStock > 0 && target > remainingStock) {
      setTotalLiters(String(remainingStock));
    } else {
      setTotalLiters(String(target));
    }
  };

  const handleSetMaxStock = () => {
    if (remainingStock > 0) {
      setTotalLiters(String(remainingStock));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!isOperatingHours) {
      setError('Akses penginputan pengiriman hanya dapat diisi pada jam operasional 05:00 - 21:00 WIB.');
      return;
    }

    if (!selectedBoothId) {
      setError('Silakan pilih booth tujuan pengiriman.');
      return;
    }

    const liters = parseFloat(totalLiters);
    if (isNaN(liters) || liters <= 0) {
      setError('Total liter pengiriman teh wajib lebih besar dari 0');
      return;
    }

    if (stockSummary && liters > stockSummary.remainingStock) {
      setError(
        `Pengiriman tidak boleh defisit! Sisa stok teh di dapur hari ini hanya ${stockSummary.remainingStock} Liter (Dimasak: ${stockSummary.totalCooked} L, Sudah Terkirim: ${stockSummary.totalDelivered} L).`
      );
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/production-deliveries', {
        boothId: selectedBoothId,
        totalLiters: liters,
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        setSuccess(true);
        setTotalLiters('');
        setNotes('');
        fetchStock(); // Refresh sisa stok
      } else {
        setError(res.error?.message || 'Gagal menyimpan laporan pengiriman teh.');
      }
    } catch {
      setError('Terjadi gangguan jaringan atau server. Gagal menyimpan pengiriman teh.');
    } finally {
      setLoading(false);
    }
  };

  const selectedBooth = booths.find((b) => b.id === selectedBoothId);

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Card Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-800 to-teal-950 p-6 text-white shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-6 h-6 text-emerald-300" />
            <h1 className="text-xl font-bold">Pengiriman Teh ke Booth</h1>
          </div>
          <Link
            href="/production/history"
            className="rounded-lg bg-emerald-900/80 px-3 py-1.5 text-xs font-bold text-emerald-100 hover:bg-emerald-950 transition flex items-center gap-1.5 border border-emerald-600/40"
          >
            <History className="w-4 h-4" />
            Riwayat
          </Link>
        </div>
        <p className="text-xs text-emerald-200">
          Catat volume teh (dalam Liter) yang dikirimkan langsung dari dapur ke outlet booth penjualan
        </p>
      </div>

      {/* Widget Stok Teh Dapur Hari Ini (Anti Defisit) */}
      <div className="rounded-2xl border-2 border-emerald-300/80 bg-gradient-to-b from-emerald-50 to-white p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2.5">
          <div className="flex items-center gap-2">
            <Droplets className="w-5 h-5 text-emerald-700" />
            <span className="text-xs font-extrabold uppercase text-emerald-950 tracking-wide">
              Stok Teh Dapur Hari Ini
            </span>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 font-mono">
            {currentDate || 'Hari Ini'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/80">
            <p className="text-[10px] font-bold uppercase text-amber-800 flex items-center justify-center gap-1">
              <Flame className="w-3 h-3 text-amber-600" /> Dimasak
            </p>
            <p className="text-base font-black text-amber-950 mt-0.5">
              {loadingStock ? '...' : `${stockSummary?.totalCooked ?? 0} L`}
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200">
            <p className="text-[10px] font-bold uppercase text-slate-600 flex items-center justify-center gap-1">
              <Truck className="w-3 h-3 text-slate-500" /> Terkirim
            </p>
            <p className="text-base font-black text-slate-800 mt-0.5">
              {loadingStock ? '...' : `${stockSummary?.totalDelivered ?? 0} L`}
            </p>
          </div>

          <div
            className={`p-2.5 rounded-xl border transition ${
              remainingStock > 0
                ? 'bg-emerald-100/70 border-emerald-300 text-emerald-950'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            <p className="text-[10px] font-bold uppercase flex items-center justify-center gap-1">
              <Droplets className="w-3 h-3" /> Sisa Stok
            </p>
            <p className="text-base font-black mt-0.5">
              {loadingStock ? '...' : `${remainingStock} L`}
            </p>
          </div>
        </div>

        {remainingStock <= 0 && (
          <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-[11px] font-semibold text-red-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>
              Stok teh habis! Silakan input laporan memasak teh terlebih dahulu di menu <strong>Masak Teh</strong> sebelum mengirim ke booth.
            </span>
          </div>
        )}
      </div>

      {/* Real-time Timestamp & Operational Status */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-2 text-xs text-emerald-900 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <span>Tanggal: <strong>{currentDate || '2026-09-16'}</strong></span>
          </div>
          <div className="flex items-center gap-2 font-mono font-bold text-emerald-800">
            <Clock className="w-4 h-4 text-emerald-700" />
            <span>{currentTime || '08:30 WIB'}</span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-emerald-200/60">
          <span className="text-slate-600 font-medium">Jam Operasional Distribusi: <strong>05:00 - 21:00 WIB</strong></span>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
              isOperatingHours
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-red-100 text-red-800 border border-red-300'
            }`}
          >
            {isOperatingHours ? '● Pengiriman Buka' : '● Pengiriman Tutup'}
          </span>
        </div>
      </div>

      {/* Lock Warning if Outside Operating Hours */}
      {!isOperatingHours && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/90 p-5 text-amber-950 shadow-sm flex items-start gap-3.5">
          <Lock className="w-6 h-6 text-amber-800 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-amber-950">Akses Distribusi Sedang Ditutup</h3>
            <p className="text-xs text-amber-800 leading-relaxed">
              Penginputan pengiriman teh hanya dapat dilakukan saat jam operasional <strong>05:00 WIB s/d 21:00 WIB</strong>.
            </p>
            <p className="text-[11px] text-amber-700 font-medium">
              Silakan kembali saat jam operasional telah aktif. Anda tetap dapat meninjau rekap di menu Riwayat.
            </p>
          </div>
        </div>
      )}

      {success && (
        <div className="rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 border border-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>✓ Laporan pengiriman teh ke booth berhasil dicatat ke sistem!</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700 border border-red-300 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* Pilih Booth Tujuan */}
        <div>
          <label className="block text-sm font-bold text-slate-900 flex items-center gap-1.5 mb-1.5">
            <Store className="w-4 h-4 text-emerald-700" />
            Booth Outlet Tujuan *
          </label>
          <select
            value={selectedBoothId}
            onChange={(e) => setSelectedBoothId(e.target.value)}
            disabled={!isOperatingHours || loading || fetchingBooths}
            required
            className="w-full rounded-xl border border-slate-300 p-3 text-sm font-semibold text-slate-900 focus:border-emerald-600 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
          >
            {booths.length === 0 ? (
              <option value="">Memuat data booth aktif...</option>
            ) : (
              booths.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.address})
                </option>
              ))
            )}
          </select>
          {selectedBooth && (
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              Lokasi: {selectedBooth.address}
            </p>
          )}
        </div>

        {/* Input Volume Liter */}
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-bold text-slate-900">Jumlah Teh Dikirim *</label>
            <span className="text-xs font-bold text-emerald-700">
              Maks: {remainingStock} Liter
            </span>
          </div>

          <div className="relative mt-2">
            <input
              type="number"
              step="0.5"
              min="0.1"
              max={remainingStock > 0 ? remainingStock : undefined}
              inputMode="decimal"
              value={totalLiters}
              onChange={(e) => setTotalLiters(e.target.value)}
              placeholder="misal: 25"
              required
              disabled={!isOperatingHours || loading || remainingStock <= 0}
              className={`block w-full rounded-xl border p-3.5 pr-16 text-2xl font-black focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 ${
                isOverStock
                  ? 'border-red-500 text-red-700 focus:border-red-600 bg-red-50/50'
                  : 'border-slate-300 text-emerald-950 focus:border-emerald-600'
              }`}
            />
            <span className="absolute right-4 top-4 text-sm font-bold text-slate-500">Liter</span>
          </div>

          {/* Over Stock Warning */}
          {isOverStock && (
            <p className="text-xs font-bold text-red-600 mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Jumlah melebihi sisa stok ({remainingStock} L). Pengiriman tidak boleh defisit!
            </p>
          )}

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            <span className="text-[11px] font-semibold text-slate-400 mr-1">Preset:</span>
            {[10, 15, 20, 25, 30, 50].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => handleQuickAddLiters(amt)}
                disabled={!isOperatingHours || loading || remainingStock <= 0}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition disabled:opacity-50"
              >
                +{amt} L
              </button>
            ))}
            {remainingStock > 0 && (
              <button
                type="button"
                onClick={handleSetMaxStock}
                disabled={!isOperatingHours || loading}
                className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition"
              >
                Semua Sisa ({remainingStock} L)
              </button>
            )}
            {totalLiters && (
              <button
                type="button"
                onClick={() => setTotalLiters('')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-200 transition"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Catatan Pengiriman */}
        <div>
          <label className="block text-sm font-medium text-slate-700">Catatan Pengiriman (Opsional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="misal: Jerigen 25L x 1, dikirim via motor oleh Mas Joko..."
            rows={3}
            disabled={!isOperatingHours || loading || remainingStock <= 0}
            className="mt-1.5 block w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!isOperatingHours || loading || remainingStock <= 0 || isOverStock}
          className="w-full rounded-xl bg-emerald-800 py-3.5 text-base font-bold text-white shadow-md hover:bg-emerald-900 disabled:opacity-50 disabled:bg-slate-400 transition flex items-center justify-center gap-2"
        >
          {!isOperatingHours ? (
            <>
              <Lock className="w-5 h-5" />
              <span>Akses Ditutup (05:00 - 21:00 WIB)</span>
            </>
          ) : remainingStock <= 0 ? (
            <>
              <AlertCircle className="w-5 h-5" />
              <span>Stok Teh Dapur Kosong</span>
            </>
          ) : isOverStock ? (
            <>
              <AlertCircle className="w-5 h-5" />
              <span>Pengiriman Melebihi Stok</span>
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>{loading ? 'Menyimpan...' : 'Simpan Laporan Pengiriman'}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
