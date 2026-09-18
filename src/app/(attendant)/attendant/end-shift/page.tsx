'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useGeolocation } from '@/hooks/use-geolocation';
import { api } from '@/lib/api-client';
import { formatRupiah, getWibDateString, getWibHourDec, getWibDateFormatted } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { MapPin, Calculator, CheckCircle2, ArrowLeft, Save, Lock, AlertTriangle, ArrowRight, RefreshCw, Package, ShieldCheck, Coffee } from 'lucide-react';

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
  seriesId?: string;
  seriesName?: string | null;
}

interface CupTypeItem {
  id: string;
  name: string;
  price?: number;
  isActive?: boolean;
}

interface SeriesCupRule {
  seriesId: string;
  seriesName: string;
  cupPrices: Record<string, { enabled: boolean; price: number }>;
}

interface ProductCupSaleItem {
  id: string; // `${productId}-${cupTypeId}`
  productId: string;
  productName: string;
  cupTypeId: string;
  cupTypeName: string;
  price: number;
  qtySold: number;
}

interface CupStockClosing {
  cupTypeId: string;
  cupTypeName: string;
  qtyInitial: number;
  qtyFinal: string;
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
  notes?: string | null;
  gpsTimeStart?: string | null;
  gpsTimeEnd?: string | null;
  stockItems?: { cupTypeId: string; qtyInitial: number; qtySold?: number }[];
  saleItems?: { productId: string; cupTypeId?: string; qtySold: number; priceSnapshot?: number }[];
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
  const [todayReport, setTodayReport] = useState<TodayReportData | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [salesItems, setSalesItems] = useState<ProductCupSaleItem[]>([]);
  const [cupStocks, setCupStocks] = useState<CupStockClosing[]>([]);
  const [cashModal, setCashModal] = useState<number>(50000);
  const [cashFinal, setCashFinal] = useState('50000');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const todayStr = getWibDateString();

      try {
        const [assignRes, prodRes, cupRes, reportRes, rulesRes] = await Promise.all([
          api.get<AssignmentData[]>(`/booth-assignments?date=${todayStr}`),
          api.get<ProductItem[]>('/tea-products'),
          api.get<CupTypeItem[]>('/cup-types'),
          api.get<TodayReportData>(`/daily-reports/today?date=${todayStr}`),
          api.get<SeriesCupRule[]>('/cup-rules'),
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

        const initialStockMap: Record<string, number> = {};
        let modalFromReport = 50000;

        if (reportRes.success && reportRes.data) {
          setTodayReport(reportRes.data);
          if (reportRes.data.cashModal !== undefined && reportRes.data.cashModal !== null) {
            modalFromReport = reportRes.data.cashModal;
            setCashModal(modalFromReport);
          }
          if (Array.isArray(reportRes.data.stockItems)) {
            reportRes.data.stockItems.forEach((s) => {
              initialStockMap[s.cupTypeId] = s.qtyInitial;
            });
          }
        }

        const defaultCupTypes: CupTypeItem[] = [
          { id: 'c1111111-1111-1111-1111-111111111111', name: 'Cup Kecil (Reguler)', price: 5000 },
          { id: 'c2222222-2222-2222-2222-222222222222', name: 'Cup Medium (Sedang)', price: 8000 },
          { id: 'c3333333-3333-3333-3333-333333333333', name: 'Cup Big (Besar)', price: 10000 },
          { id: 'c4444444-4444-4444-4444-444444444444', name: 'Cup Jumbo (1 Liter)', price: 15000 },
        ];
        const rawCups = cupRes.success && Array.isArray(cupRes.data) && cupRes.data.length > 0
          ? cupRes.data
          : defaultCupTypes;
        const activeCups = rawCups.filter((c) => c.isActive !== false);

        const defaultProducts: ProductItem[] = [
          { id: '11111111-1111-1111-1111-111111111101', name: 'Teh Baling Melati Original' },
          { id: '11111111-1111-1111-1111-111111111102', name: 'Teh Kampul Lemon Segar' },
          { id: '11111111-1111-1111-1111-111111111103', name: 'Teh Baling Yakult Segar' },
          { id: '11111111-1111-1111-1111-111111111104', name: 'Teh Baling Lychee Fruity' },
        ];
        const rawProducts = prodRes.success && Array.isArray(prodRes.data) && prodRes.data.length > 0
          ? prodRes.data
          : defaultProducts;
        setProducts(rawProducts);

        // Muat aturan mapping cup & harga per series dari backend & localStorage
        let storedRules: SeriesCupRule[] = [];
        if (rulesRes.success && Array.isArray(rulesRes.data) && rulesRes.data.length > 0) {
          storedRules = rulesRes.data;
        } else if (typeof window !== 'undefined') {
          const rulesStr = localStorage.getItem('teh_baling_cup_rules');
          if (rulesStr) {
            try {
              storedRules = JSON.parse(rulesStr);
            } catch {
              storedRules = [];
            }
          }
        }

        // Buat daftar kombinasi produk x ukuran cup dengan harga dari matriks mapping series
        const saleItemsList: ProductCupSaleItem[] = [];
        rawProducts.forEach((p) => {
          // Cari aturan mapping series yang cocok
          const matchedRule = storedRules.find(
            (r) =>
              (p.seriesId && r.seriesId === p.seriesId) ||
              (p.seriesName && r.seriesName && r.seriesName.trim().toLowerCase() === p.seriesName.trim().toLowerCase()) ||
              (p.name && r.seriesName && p.name.toLowerCase().includes(r.seriesName.toLowerCase().replace(' series', '').trim())) ||
              (p.name && r.seriesName && r.seriesName.toLowerCase().includes(p.name.toLowerCase().trim()))
          );

          activeCups.forEach((cup) => {
            let isEnabled = false;
            let price = 10000;

            if (matchedRule && matchedRule.cupPrices) {
              const cupConfig = matchedRule.cupPrices[cup.id];
              if (cupConfig !== undefined) {
                isEnabled = Boolean(cupConfig.enabled);
                price = Number(cupConfig.price) || 0;
              } else {
                isEnabled = false;
              }
            } else {
              // Jika aturan belum ada, default semua cup aktif tersedia
              isEnabled = true;
              price = cup.price || 10000;
            }

            if (isEnabled) {
              saleItemsList.push({
                id: `${p.id}-${cup.id}`,
                productId: p.id,
                productName: p.name,
                cupTypeId: cup.id,
                cupTypeName: cup.name,
                price,
                qtySold: 0,
              });
            }
          });
        });
        setSalesItems(saleItemsList);

        // Inisialisasi stok closing cup (hanya cup aktif)
        const closings: CupStockClosing[] = activeCups.map((c) => {
          const initial = initialStockMap[c.id] !== undefined ? initialStockMap[c.id] : 50;
          return {
            cupTypeId: c.id,
            cupTypeName: c.name,
            qtyInitial: initial,
            qtyFinal: String(initial),
          };
        });
        setCupStocks(closings);

        setCashFinal(String(modalFromReport));
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  const currentHourDec = getWibHourDec();

  // Sesi ditentukan dari jadwal penugasan attendant jika ada, atau auto-detect waktu
  const activeSession: ShiftSession = (assignment?.shiftType as ShiftSession) || (currentHourDec >= 16.0 ? 'SORE' : 'PAGI');
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
  const totalProductsSold = salesItems.reduce((sum, item) => sum + item.qtySold, 0);
  const expectedTotalCash = cashModal + totalSalesRevenue;
  const finalCashNum = parseInt(cashFinal, 10) || 0;
  const variance = finalCashNum - expectedTotalCash;

  // Cup usage breakdown by cup type
  const cupsSoldMap: Record<string, number> = {};
  salesItems.forEach((item) => {
    cupsSoldMap[item.cupTypeId] = (cupsSoldMap[item.cupTypeId] || 0) + item.qtySold;
  });

  const totalCupsUsed = cupStocks.reduce((sum, c) => {
    const finalVal = parseInt(c.qtyFinal, 10) || 0;
    return sum + Math.max(0, c.qtyInitial - finalVal);
  }, 0);
  const cupVariance = totalCupsUsed - totalProductsSold;

  const handleQtyChange = (itemId: string, qtyStr: string) => {
    const qty = parseInt(qtyStr, 10);
    const validQty = isNaN(qty) ? 0 : Math.max(0, qty);
    setSalesItems((prev) => {
      const updated = prev.map((item) => (item.id === itemId ? { ...item, qtySold: validQty } : item));
      const newRev = updated.reduce((acc, it) => acc + it.price * it.qtySold, 0);
      setCashFinal(String(cashModal + newRev));
      return updated;
    });
  };

  const handleCupFinalChange = (cupTypeId: string, valStr: string) => {
    setCupStocks((prev) =>
      prev.map((c) => (c.cupTypeId === cupTypeId ? { ...c, qtyFinal: valStr } : c))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAccessAllowed) {
      setError(lockedReason);
      return;
    }

    if (todayReport?.status === 'CLOSED') {
      setError('Shift hari ini sudah ditutup dan laporan closing telah dikunci. Anda tidak dapat mengirim laporan ulang.');
      return;
    }

    if (!position || position.latitude == null || position.longitude == null) {
      setError('Akses Ditolak: Anda wajib menekan tombol "Deteksi Lokasi Booth Saat Ini" untuk memverifikasi lokasi booth sebelum menutup shift.');
      return;
    }

    if (currentDistance !== null && currentDistance > 200) {
      setError(`Akses Ditolak: Lokasi Anda saat ini (${Math.round(currentDistance)} meter) berada di luar batas radius maksimal 200 meter dari ${assignment?.boothName || 'booth'}. Anda tidak dapat menutup shift di luar radius.`);
      return;
    }

    setError(null);
    if (isNaN(finalCashNum) || finalCashNum < 0) {
      setError('Uang akhir kasir wajib diisi angka valid');
      return;
    }

    setSubmitting(true);
    try {
      const activeSales = salesItems
        .filter((s) => s.qtySold > 0)
        .map((s) => ({
          productId: s.productId,
          cupTypeId: s.cupTypeId,
          qtySold: s.qtySold,
        }));

      const res = await api.post('/daily-reports/end', {
        cashFinal: finalCashNum,
        stockItems: cupStocks.map((c) => {
          const finalVal = parseInt(c.qtyFinal, 10) || 0;
          return {
            cupTypeId: c.cupTypeId,
            qtyInitial: c.qtyInitial,
            qtyFinal: finalVal,
            qtySold: Math.max(0, c.qtyInitial - finalVal),
          };
        }),
        saleItems: activeSales,
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
      setError('Terjadi kesalahan jaringan atau server saat menutup shift.');
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

  // 1. JIKA SHIFT SUDAH DITUTUP (STATUS CLOSED) -> KUNCI TOTAL
  if (todayReport && todayReport.status === 'CLOSED') {
    const recordedModal = todayReport.cashModal || 0;
    const recordedFinal = todayReport.cashFinal || 0;
    const recordedVariance = recordedFinal - recordedModal;

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
              {getWibDateFormatted()}
            </span>
          </div>
          <h1 className="text-xl font-bold">Laporan Akhir Shift ({isPagi ? 'Pagi' : 'Sore'})</h1>
          <p className="mt-1 text-xs text-slate-300 flex items-center gap-1">
            {assignment?.boothName || 'Booth Teh Baling'}
          </p>
        </div>

        <div className="rounded-2xl border border-indigo-200 bg-white p-6 shadow-sm text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center mx-auto shadow-xs">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-0.5 text-xs font-bold text-indigo-900">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Shift Telah Ditutup & Laporan Dikunci
            </span>
            <h2 className="text-lg font-extrabold text-slate-900 pt-1">Closing Shift Selesai</h2>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
              Laporan tutup shift dan rekonsiliasi kasir telah difinalisasi secara permanen ke database dan tidak dapat diedit ulang.
            </p>
          </div>

          {/* Ringkasan Data Closing Tersimpan */}
          <div className="rounded-xl bg-slate-900 text-white p-5 text-left space-y-3 text-xs shadow-xs">
            <div className="flex justify-between items-center text-slate-300">
              <span>Modal Awal Kasir:</span>
              <span className="font-semibold text-white">{formatRupiah(recordedModal)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Uang Fisik Akhir Kasir:</span>
              <span className="font-bold text-sm text-emerald-400">{formatRupiah(recordedFinal)}</span>
            </div>
            <div className="flex justify-between items-center font-bold text-white pt-1.5 border-t border-slate-800">
              <span>Selisih Kasir:</span>
              <span className={recordedVariance >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                {formatRupiah(recordedVariance)}
              </span>
            </div>
            {todayReport.notes && (
              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                <span className="font-bold text-slate-300">Catatan:</span> {todayReport.notes}
              </div>
            )}
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <Link
              href="/attendant"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 px-4 text-sm font-bold text-white hover:bg-slate-800 transition"
            >
              Kembali ke Beranda Attendant
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. JIKA AKSES DILUAR JADWAL ATAU TERKUNCI JAM OPERASIONAL -> LAYAR LOCK
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
              {getWibDateFormatted()}
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

  // 3. FORM CLOSING SHIFT
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
            {getWibDateFormatted()}
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
        {/* 1. Input Penjualan Produk Teh & Pilihan Ukuran Cup */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Coffee className="w-4 h-4 text-emerald-600" />
              <h2 className="font-bold text-slate-900 text-sm">1. Penjualan Produk & Ukuran Cup</h2>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              {totalProductsSold} Cup Terjual
            </span>
          </div>

          <div className="space-y-4">
            {products.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">Memuat daftar menu produk...</p>
            ) : (
              products.map((product) => {
                const productVariants = salesItems.filter((s) => s.productId === product.id);
                const productSoldTotal = productVariants.reduce((sum, v) => sum + v.qtySold, 0);

                return (
                  <div
                    key={product.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-xs text-slate-900">{product.name}</h3>
                      {productSoldTotal > 0 && (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                          {productSoldTotal} Cup
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      {productVariants.map((variant) => (
                        <div
                          key={variant.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/90 shadow-2xs"
                        >
                          <div>
                            <p className="text-xs font-semibold text-slate-800">{variant.cupTypeName}</p>
                            <p className="text-[11px] font-bold text-emerald-700">{formatRupiah(variant.price)}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              inputMode="numeric"
                              min="0"
                              value={variant.qtySold === 0 ? '' : variant.qtySold}
                              onChange={(e) => handleQtyChange(variant.id, e.target.value)}
                              placeholder="0"
                              className="w-16 rounded-md border border-slate-300 px-2 py-1 text-sm font-bold text-center text-slate-900 focus:border-emerald-500 focus:outline-none"
                            />
                            <span className="text-xs font-medium text-slate-500">Cup</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 2. Sisa Stok Cup Akhir Shift (Closing Cup) */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" />
              <h2 className="font-bold text-slate-900 text-sm">2. Sisa Stok Cup Akhir Shift</h2>
            </div>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
              {totalCupsUsed} Cup Terpakai
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Hitung sisa fisik cup di laci/booth. Sistem mencocokkan otomatis antara cup terpakai vs menu terjual.
          </p>

          <div className="space-y-3">
            {cupStocks.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">Memuat varian cup...</p>
            ) : (
              cupStocks.map((c) => {
                const finalNum = parseInt(c.qtyFinal, 10) || 0;
                const used = Math.max(0, c.qtyInitial - finalNum);
                const soldFromMenu = cupsSoldMap[c.cupTypeId] || 0;
                const diff = used - soldFromMenu;

                return (
                  <div
                    key={c.cupTypeId}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-900">{c.cupTypeName}</span>
                      <span className="text-[11px] text-slate-500">
                        Awal: <strong className="text-slate-800">{c.qtyInitial}</strong> | Terjual Menu: <strong className="text-emerald-700">{soldFromMenu}</strong>
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Sisa Cup Fisik:
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            inputMode="numeric"
                            min="0"
                            value={c.qtyFinal}
                            onChange={(e) => handleCupFinalChange(c.cupTypeId, e.target.value)}
                            placeholder="0"
                            className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm font-bold text-center text-slate-900 focus:border-emerald-500 focus:outline-none"
                          />
                          <span className="text-xs font-medium text-slate-500">pcs</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="block text-[11px] font-medium text-slate-500">Cup Terpakai</span>
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-sm font-extrabold text-slate-900">
                            {used} <span className="text-xs font-normal text-slate-500">pcs</span>
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              diff === 0
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {diff === 0 ? '✓ Cocok' : `${diff > 0 ? `+${diff}` : diff} cup`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 3. Input Uang Fisik Kasir */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="font-bold text-slate-900 text-sm">3. Uang Fisik Akhir di Laci Kasir</h2>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Total Uang Kasir Fisik (Modal Shift Pagi + Omzet Penjualan)
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

        {/* 4. Rekonsiliasi Kasir & Stok Otomatis */}
        <div className="rounded-xl border border-slate-200 bg-slate-900 p-5 text-white shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <Calculator className="w-4 h-4 text-emerald-400" />
            <h2 className="font-bold text-sm text-white">4. Rekonsiliasi Kasir & Stok Otomatis</h2>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Modal Awal Kas (Shift Pagi):</span>
              <span className="font-semibold text-white">{formatRupiah(cashModal)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Total Omzet Penjualan:</span>
              <span className="font-semibold text-emerald-400">{formatRupiah(totalSalesRevenue)}</span>
            </div>
            <div className="flex justify-between font-bold text-white pt-1.5 border-t border-slate-800">
              <span>Uang Kas Seharusnya:</span>
              <span>{formatRupiah(expectedTotalCash)}</span>
            </div>
            <div className="flex justify-between font-bold pt-1">
              <span>Selisih Kasir (Cash Variance):</span>
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

            {/* Rekonsiliasi Cup Fisik vs Produk Terjual */}
            <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-300">Rekonsiliasi Cup Fisik vs Penjualan:</span>
              <span className={`font-semibold ${cupVariance === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {totalCupsUsed} cup fisik / {totalProductsSold} porsi ({cupVariance === 0 ? 'Cocok ✓' : `${cupVariance > 0 ? `+${cupVariance}` : cupVariance} cup selisih`})
              </span>
            </div>
          </div>
        </div>

        {/* 5. Catatan Operasional Shift */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
          <h2 className="font-bold text-slate-900 text-sm">5. Catatan Operasional Shift</h2>
          <textarea
            data-testid="shift-notes-input"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Catatan kendala / sisa cup rusak / kompor..."
            className="block w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        {/* 6. Validasi Geolocation Radius 200m */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-sm">6. Validasi Lokasi Geolocation (GPS)</h2>
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
            disabled={submitting || (currentDistance !== null && currentDistance > 200)}
            className="flex-1 rounded-xl bg-indigo-800 py-3.5 text-base font-bold text-white shadow-md hover:bg-indigo-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            <Save className="w-5 h-5" />
            {submitting ? 'Menyimpan...' : currentDistance !== null && currentDistance > 200 ? '⚠️ Lokasi di Luar Radius (Terkunci)' : 'Simpan & Finalisasi Tutup Shift (Kunci)'}
          </button>
        </div>
      </form>
    </div>
  );
}