'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { formatRupiah, getWibDateString, getWibDateFormatted } from '@/lib/utils';
import {
  Store,
  Calendar,
  Clock,
  User,
  Coffee,
  Package,
  Calculator,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Layers,
  ChevronDown,
  Droplets,
  CreditCard,
  Banknote,
  FileSpreadsheet,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface BoothItem {
  id: string;
  name: string;
  address?: string;
  isActive?: boolean;
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface SeriesItem {
  id: string;
  name: string;
  description?: string | null;
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
  id?: string;
  seriesId?: string;
  seriesName?: string;
  cupPrices: Record<string, { enabled: boolean; price: number }>;
}

interface ProductCupSaleItem {
  id: string; // `${productId}-${cupTypeId}`
  productId: string;
  productName: string;
  seriesId?: string;
  seriesName?: string | null;
  cupTypeId: string;
  cupTypeName: string;
  price: number;
  qtySold: number;
}

interface CupStockRow {
  cupTypeId: string;
  cupTypeName: string;
  qtyInitial: string;
  qtyAdded: string;
  qtyFinal: string;
}

interface ExistingReportDetail {
  id?: string;
  boothId: string;
  reportDate: string;
  shiftType: string;
  attendantId: string;
  attendantName?: string;
  cashModal: number;
  cashFinal: number | null;
  qrisFinal?: number | null;
  teaRemainingLiters: number;
  notes: string | null;
  status: string;
  stockItems?: { cupTypeId: string; qtyInitial: number; qtyAdded: number; qtySold: number; priceSnapshot?: number }[];
  saleItems?: { productId: string; cupTypeId: string; qtySold: number; priceSnapshot: number }[];
}

export default function AdminInputShiftPage() {
  // Selection states
  const [selectedBoothId, setSelectedBoothId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(getWibDateString());
  const [selectedShift, setSelectedShift] = useState<'PAGI' | 'SORE'>('PAGI');
  const [selectedAttendantId, setSelectedAttendantId] = useState<string>('');

  // Master Data
  const [booths, setBooths] = useState<BoothItem[]>([]);
  const [attendants, setAttendants] = useState<UserItem[]>([]);
  const [seriesList, setSeriesList] = useState<SeriesItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [cupTypes, setCupTypes] = useState<CupTypeItem[]>([]);
  const [cupRules, setCupRules] = useState<SeriesCupRule[]>([]);

  // Form states
  const [cashModal, setCashModal] = useState<string>('50000');
  const [cashFinal, setCashFinal] = useState<string>('50000');
  const [qrisFinal, setQrisFinal] = useState<string>('0');
  const [teaRemainingLiters, setTeaRemainingLiters] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');
  const [salesItems, setSalesItems] = useState<ProductCupSaleItem[]>([]);
  const [cupStocks, setCupStocks] = useState<CupStockRow[]>([]);

  // UI / Status states
  const [loadingMaster, setLoadingMaster] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [existingReport, setExistingReport] = useState<ExistingReportDetail | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [expandedSeries, setExpandedSeries] = useState<Record<string, boolean>>({});

  // 1. Muat Master Data awal
  const loadMasterData = useCallback(async () => {
    setLoadingMaster(true);
    try {
      const [boothRes, userRes, seriesRes, prodRes, cupRes, rulesRes] = await Promise.all([
        api.get<BoothItem[]>('/booths?status=active'),
        api.get<UserItem[]>('/users'),
        api.get<SeriesItem[]>('/tea-series'),
        api.get<ProductItem[]>('/tea-products'),
        api.get<CupTypeItem[]>('/cup-types'),
        api.get<SeriesCupRule[]>('/cup-rules'),
      ]);

      if (boothRes.success && Array.isArray(boothRes.data)) {
        setBooths(boothRes.data.filter((b) => b.isActive !== false));
        if (boothRes.data.length > 0 && !selectedBoothId) {
          setSelectedBoothId(boothRes.data[0].id);
        }
      }

      if (userRes.success && Array.isArray(userRes.data)) {
        // Filter users who can be attendants
        const eligibleUsers = userRes.data.filter(
          (u) => u.isActive && (u.role === 'BOOTH_ATTENDANT' || u.role === 'OPERATIONAL_ADMIN' || u.role === 'ADMIN')
        );
        setAttendants(eligibleUsers);
        if (eligibleUsers.length > 0 && !selectedAttendantId) {
          setSelectedAttendantId(eligibleUsers[0].id);
        }
      }

      const activeSeries = seriesRes.success && Array.isArray(seriesRes.data) ? seriesRes.data : [];
      setSeriesList(activeSeries);

      const activeProducts = prodRes.success && Array.isArray(prodRes.data) ? prodRes.data : [];
      setProducts(activeProducts);

      const activeCups = cupRes.success && Array.isArray(cupRes.data) ? cupRes.data.filter((c) => c.isActive !== false) : [];
      setCupTypes(activeCups);

      const loadedRules = rulesRes.success && Array.isArray(rulesRes.data) ? rulesRes.data : [];
      setCupRules(loadedRules);
    } catch (err) {
      console.error('[Load Master Data Error]:', err);
      setFeedback({ type: 'error', message: 'Gagal memuat master data untuk form laporan.' });
    } finally {
      setLoadingMaster(false);
    }
  }, [selectedBoothId, selectedAttendantId]);

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  // Inisialisasi daftar item menu x ukuran cup
  const buildInitialSaleItems = useCallback(
    (prods: ProductItem[], cups: CupTypeItem[], rules: SeriesCupRule[]) => {
      const items: ProductCupSaleItem[] = [];
      prods.forEach((p) => {
        const matchedRule = rules.find(
          (r) =>
            (r.seriesId && p.seriesId && r.seriesId === p.seriesId) ||
            (r.seriesName && p.seriesName && r.seriesName.trim().toLowerCase() === p.seriesName.trim().toLowerCase())
        );

        cups.forEach((cup) => {
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
            isEnabled = true;
            price = cup.price || 10000;
          }

          if (isEnabled) {
            items.push({
              id: `${p.id}-${cup.id}`,
              productId: p.id,
              productName: p.name,
              seriesId: p.seriesId,
              seriesName: p.seriesName,
              cupTypeId: cup.id,
              cupTypeName: cup.name,
              price,
              qtySold: 0,
            });
          }
        });
      });
      return items;
    },
    []
  );

  // 2. Fetch Detail Laporan berdasarkan Booth + Date + Shift
  const fetchReportDetail = useCallback(async () => {
    if (!selectedBoothId || !selectedDate || !selectedShift) return;

    setLoadingDetail(true);
    try {
      const res = await api.get<{
        report: ExistingReportDetail | null;
        assignment: { id: string; userId: string; userName: string; userEmail: string } | null;
      }>(`/daily-reports/admin-detail?boothId=${selectedBoothId}&date=${selectedDate}&shiftType=${selectedShift}`);

      const baseSaleItems = buildInitialSaleItems(products, cupTypes, cupRules);

      if (res.success && res.data) {
        const rep = res.data.report;
        const assign = res.data.assignment;

        if (rep) {
          setExistingReport(rep);
          setSelectedAttendantId(rep.attendantId);
          setCashModal(String(rep.cashModal ?? 50000));
          setCashFinal(String(rep.cashFinal ?? 50000));
          setQrisFinal(String(rep.qrisFinal ?? 0));
          setTeaRemainingLiters(String(rep.teaRemainingLiters ?? 0));
          setNotes(rep.notes || '');

          // Map stock items
          const stockMap = new Map<string, { qtyInitial: number; qtyAdded: number; qtySold: number }>();
          if (Array.isArray(rep.stockItems)) {
            rep.stockItems.forEach((st) => {
              stockMap.set(st.cupTypeId, {
                qtyInitial: st.qtyInitial,
                qtyAdded: st.qtyAdded || 0,
                qtySold: st.qtySold || 0,
              });
            });
          }

          const populatedStocks: CupStockRow[] = cupTypes.map((c) => {
            const found = stockMap.get(c.id);
            const initial = found !== undefined ? found.qtyInitial : 50;
            const added = found !== undefined ? found.qtyAdded : 0;
            const sold = found !== undefined ? found.qtySold : 0;
            const finalVal = Math.max(0, initial + added - sold);
            return {
              cupTypeId: c.id,
              cupTypeName: c.name,
              qtyInitial: String(initial),
              qtyAdded: String(added),
              qtyFinal: String(finalVal),
            };
          });
          setCupStocks(populatedStocks);

          // Map sale items
          const saleMap = new Map<string, number>();
          if (Array.isArray(rep.saleItems)) {
            rep.saleItems.forEach((si) => {
              saleMap.set(`${si.productId}-${si.cupTypeId}`, si.qtySold);
            });
          }

          const populatedSales = baseSaleItems.map((item) => ({
            ...item,
            qtySold: saleMap.get(item.id) || 0,
          }));
          setSalesItems(populatedSales);
        } else {
          // Tidak ada report sebelumnya
          setExistingReport(null);
          if (assign && assign.userId) {
            setSelectedAttendantId(assign.userId);
          }
          setCashModal('50000');
          setCashFinal('50000');
          setQrisFinal('0');
          setTeaRemainingLiters('0');
          setNotes('');

          const defaultStocks: CupStockRow[] = cupTypes.map((c) => ({
            cupTypeId: c.id,
            cupTypeName: c.name,
            qtyInitial: '50',
            qtyAdded: '0',
            qtyFinal: '50',
          }));
          setCupStocks(defaultStocks);
          setSalesItems(baseSaleItems);
        }
      }
    } catch (err) {
      console.error('[Fetch Report Detail Error]:', err);
    } finally {
      setLoadingDetail(false);
    }
  }, [selectedBoothId, selectedDate, selectedShift, products, cupTypes, cupRules, buildInitialSaleItems]);

  useEffect(() => {
    if (products.length > 0 && cupTypes.length > 0) {
      fetchReportDetail();
    }
  }, [fetchReportDetail, products.length, cupTypes.length]);

  // Kalkulasi Otomatis (Reconciliation)
  const totalSalesRevenue = useMemo(() => {
    return salesItems.reduce((acc, item) => acc + item.price * item.qtySold, 0);
  }, [salesItems]);

  const totalProductsSold = useMemo(() => {
    return salesItems.reduce((sum, item) => sum + item.qtySold, 0);
  }, [salesItems]);

  const modalNum = parseInt(cashModal, 10) || 0;
  const cashFinalNum = parseInt(cashFinal, 10) || 0;
  const qrisFinalNum = parseInt(qrisFinal, 10) || 0;
  const expectedTotalCash = modalNum + totalSalesRevenue;
  const totalActualReceived = cashFinalNum + qrisFinalNum;
  const cashVariance = totalActualReceived - expectedTotalCash;

  // Cup calculation
  const cupsSoldFromMenuMap = useMemo(() => {
    const map: Record<string, number> = {};
    salesItems.forEach((item) => {
      map[item.cupTypeId] = (map[item.cupTypeId] || 0) + item.qtySold;
    });
    return map;
  }, [salesItems]);

  const totalCupsUsed = useMemo(() => {
    return cupStocks.reduce((sum, c) => {
      const init = parseInt(c.qtyInitial, 10) || 0;
      const add = parseInt(c.qtyAdded, 10) || 0;
      const fin = parseInt(c.qtyFinal, 10) || 0;
      return sum + Math.max(0, init + add - fin);
    }, 0);
  }, [cupStocks]);

  const cupVariance = totalCupsUsed - totalProductsSold;

  // Handler helpers
  const handleQtyChange = (itemId: string, val: string) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setSalesItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, qtySold: num } : item)));
  };

  const handleQuickAddQty = (itemId: string, addAmount: number) => {
    setSalesItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, qtySold: Math.max(0, item.qtySold + addAmount) } : item))
    );
  };

  const handleStockChange = (cupTypeId: string, field: 'qtyInitial' | 'qtyAdded' | 'qtyFinal', val: string) => {
    setCupStocks((prev) => prev.map((c) => (c.cupTypeId === cupTypeId ? { ...c, [field]: val } : c)));
  };

  const toggleSeries = (seriesId: string) => {
    setExpandedSeries((prev) => ({ ...prev, [seriesId]: !prev[seriesId] }));
  };

  const handleExpandAll = () => {
    const all: Record<string, boolean> = {};
    seriesList.forEach((s) => {
      all[s.id] = true;
    });
    all['unassigned'] = true;
    setExpandedSeries(all);
  };

  const handleCollapseAll = () => {
    setExpandedSeries({});
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBoothId) {
      setFeedback({ type: 'error', message: 'Silakan pilih booth outlet terlebih dahulu.' });
      return;
    }
    if (!selectedAttendantId) {
      setFeedback({ type: 'error', message: 'Silakan pilih petugas staf penjaga shift.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const activeSales = salesItems
        .filter((s) => s.qtySold > 0)
        .map((s) => ({
          productId: s.productId,
          cupTypeId: s.cupTypeId,
          qtySold: s.qtySold,
          priceSnapshot: Number(s.price) || 0,
        }));

      const stockPayload = cupStocks.map((c) => {
        const init = parseInt(c.qtyInitial, 10) || 0;
        const add = parseInt(c.qtyAdded, 10) || 0;
        const fin = parseInt(c.qtyFinal, 10) || 0;
        const totalAvail = init + add;
        return {
          cupTypeId: c.cupTypeId,
          qtyInitial: init,
          qtyAdded: add,
          qtyFinal: fin,
          qtySold: Math.max(0, totalAvail - fin),
        };
      });

      const payload = {
        boothId: selectedBoothId,
        reportDate: selectedDate,
        shiftType: selectedShift,
        attendantId: selectedAttendantId,
        cashModal: modalNum,
        cashFinal: cashFinalNum,
        qrisFinal: qrisFinalNum,
        teaRemainingLiters: parseFloat(teaRemainingLiters) || 0,
        notes,
        stockItems: stockPayload,
        saleItems: activeSales,
      };

      const res = await api.post('/daily-reports/admin-entry', payload);

      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Laporan shift booth berhasil disimpan dan disinkronkan ke rekap penjualan!`,
        });
        // Refresh detail
        fetchReportDetail();
      } else {
        setFeedback({
          type: 'error',
          message: res.error?.message || 'Gagal menyimpan laporan shift.',
        });
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setFeedback({
        type: 'error',
        message: `Terjadi kesalahan saat menyimpan data: ${errorMsg}`,
      });
    } finally {
      setSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Grouping products by series
  const groupedBySeries = useMemo(() => {
    return seriesList.map((series) => {
      const seriesProducts = products.filter(
        (p) => p.seriesId === series.id || p.seriesName?.trim().toLowerCase() === series.name.trim().toLowerCase()
      );
      const seriesSoldTotal = salesItems
        .filter((si) => si.seriesId === series.id || si.seriesName?.trim().toLowerCase() === series.name.trim().toLowerCase())
        .reduce((sum, item) => sum + item.qtySold, 0);

      return {
        ...series,
        products: seriesProducts,
        totalSold: seriesSoldTotal,
      };
    });
  }, [seriesList, products, salesItems]);

  const unassignedProducts = useMemo(() => {
    return products.filter(
      (p) => !seriesList.some((s) => s.id === p.seriesId || s.name.trim().toLowerCase() === p.seriesName?.trim().toLowerCase())
    );
  }, [products, seriesList]);

  const unassignedSoldTotal = useMemo(() => {
    return salesItems
      .filter((si) => unassignedProducts.some((p) => p.id === si.productId))
      .reduce((sum, item) => sum + item.qtySold, 0);
  }, [salesItems, unassignedProducts]);

  if (loadingMaster) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-3">
        <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-sm font-medium text-slate-600">Memuat data outlet dan master formulir...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Mode Input & Edit Langsung
              </span>
              <span className="text-xs text-slate-300 font-mono">
                {getWibDateFormatted(new Date(selectedDate))}
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight mt-1 text-white">Input Laporan Shift & Penjualan</h1>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Kelola jadwal shift, modal awal kasir, stok cup, penjualan menu produk, setoran tunai & QRIS dalam satu halaman terpadu.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/summary"
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white border border-slate-700 transition flex items-center gap-1.5 shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Lihat Rekap
            </Link>
            <button
              type="button"
              onClick={fetchReportDetail}
              disabled={loadingDetail}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 text-slate-300 ${loadingDetail ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`rounded-xl p-4 text-sm font-medium border flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-bold px-2 py-1 rounded hover:bg-black/5"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Panel 1: Parameter Booth, Tanggal, Shift & Petugas */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold text-slate-900 text-base">1. Pilih Outlet Booth & Sesi Shift</h2>
            </div>
            {existingReport ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                Data Tersimpan (Mode Edit)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Laporan Baru
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Booth Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-emerald-600" />
                Pilih Booth Outlet *
              </label>
              <select
                value={selectedBoothId}
                onChange={(e) => setSelectedBoothId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none shadow-2xs"
                required
              >
                {booths.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                Tanggal Laporan *
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none shadow-2xs"
                required
              />
            </div>

            {/* Shift Type Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                Sesi Shift *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedShift('PAGI')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition border cursor-pointer text-center ${
                    selectedShift === 'PAGI'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Pagi (09-15)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedShift('SORE')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition border cursor-pointer text-center ${
                    selectedShift === 'SORE'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Sore (15-21)
                </button>
              </div>
            </div>

            {/* Attendant Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                Staf Penjaga (Attendant) *
              </label>
              <select
                value={selectedAttendantId}
                onChange={(e) => setSelectedAttendantId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none shadow-2xs"
                required
              >
                {attendants.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role === 'OPERATIONAL_ADMIN' ? 'Admin Ops' : u.role === 'ADMIN' ? 'Admin' : 'Attendant'})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Panel 2: Modal Kasir Awal & Stok Awal Cup */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold text-slate-900 text-base">2. Modal Kasir Awal & Stok Awal Cup (Manual)</h2>
            </div>
            <span className="text-xs text-slate-500">Input modal awal dan cup awal shift</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Modal Cash Awal */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                💵 Modal Kasir Awal (Rp) *
              </label>
              <p className="text-[11px] text-slate-500">Uang kembalian kasir saat membuka shift.</p>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={cashModal}
                onChange={(e) => setCashModal(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base font-bold text-slate-900 focus:border-emerald-500 focus:outline-none shadow-2xs"
                required
              />
              <div className="flex items-center gap-1.5 pt-1">
                {[50000, 100000, 200000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setCashModal(String(val))}
                    className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                  >
                    {val / 1000}k
                  </button>
                ))}
              </div>
            </div>

            {/* Stok Awal Cup per Varian Ukuran */}
            <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <label className="block text-xs font-bold text-slate-800">
                🥤 Stok Awal & Restock Cup Fisik (pcs)
              </label>
              <p className="text-[11px] text-slate-500">
                Tentukan jumlah cup awal saat outlet buka dan jika ada penambahan (restock) cup di tengah shift.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cupStocks.map((c) => (
                  <div
                    key={c.cupTypeId}
                    className="p-3 rounded-lg border border-slate-200 bg-white space-y-2 shadow-2xs"
                  >
                    <span className="font-bold text-xs text-slate-900">{c.cupTypeName}</span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Stok Awal:</label>
                        <input
                          type="number"
                          min="0"
                          value={c.qtyInitial}
                          onChange={(e) => handleStockChange(c.cupTypeId, 'qtyInitial', e.target.value)}
                          placeholder="50"
                          className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-bold text-center text-slate-900 focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-emerald-700 mb-0.5">+ Restock:</label>
                        <input
                          type="number"
                          min="0"
                          value={c.qtyAdded}
                          onChange={(e) => handleStockChange(c.cupTypeId, 'qtyAdded', e.target.value)}
                          placeholder="0"
                          className="w-full rounded border border-emerald-300 bg-emerald-50/40 px-2 py-1 text-xs font-bold text-center text-emerald-950 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Panel 3: Penjualan Produk Teh per Series */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Coffee className="w-5 h-5 text-emerald-600" />
              <div>
                <h2 className="font-bold text-slate-900 text-base">3. Hasil Penjualan Menu Teh per Series</h2>
                <p className="text-xs text-slate-500">Masukkan jumlah porsi terjual untuk tiap menu dan ukuran cup.</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                {totalProductsSold} Cup Terjual ({formatRupiah(totalSalesRevenue)})
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Buka atau tutup kelompok menu series:</span>
            <div className="flex items-center gap-2 font-semibold text-emerald-700">
              <button type="button" onClick={handleExpandAll} className="hover:underline cursor-pointer">
                Buka Semua
              </button>
              <span>•</span>
              <button type="button" onClick={handleCollapseAll} className="hover:underline cursor-pointer">
                Tutup Semua
              </button>
            </div>
          </div>

          {/* List Series Accordion */}
          <div className="space-y-3">
            {groupedBySeries.map((seriesGroup) => {
              const isOpen = Boolean(expandedSeries[seriesGroup.id]);

              return (
                <div
                  key={seriesGroup.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 overflow-hidden shadow-2xs transition"
                >
                  <button
                    type="button"
                    onClick={() => toggleSeries(seriesGroup.id)}
                    className="w-full flex items-center justify-between p-3.5 bg-white hover:bg-slate-50 transition text-left cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg ${isOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-xs text-slate-900">{seriesGroup.name}</h3>
                        <p className="text-[10px] text-slate-500">{seriesGroup.products.length} Varian Menu</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {seriesGroup.totalSold > 0 ? (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          {seriesGroup.totalSold} Cup Terjual
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                          0 Cup
                        </span>
                      )}
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-emerald-600' : ''
                        }`}
                      />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="p-3.5 space-y-3 border-t border-slate-100 bg-slate-50/30">
                      {seriesGroup.products.length === 0 ? (
                        <p className="text-xs text-slate-400 italic text-center py-2">Belum ada produk dalam series ini.</p>
                      ) : (
                        seriesGroup.products.map((product) => {
                          const variants = salesItems.filter((s) => s.productId === product.id);
                          const productTotalSold = variants.reduce((sum, v) => sum + v.qtySold, 0);

                          return (
                            <div
                              key={product.id}
                              className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5 shadow-2xs"
                            >
                              <div className="flex items-center justify-between">
                                <h4 className="font-bold text-xs text-slate-900">{product.name}</h4>
                                {productTotalSold > 0 && (
                                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    {productTotalSold} Cup
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {variants.map((variant) => (
                                  <div
                                    key={variant.id}
                                    className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-200 flex items-center justify-between gap-2"
                                  >
                                    <div className="min-w-0">
                                      <p className="text-xs font-semibold text-slate-800 truncate">{variant.cupTypeName}</p>
                                      <p className="text-[11px] font-bold text-emerald-700">{formatRupiah(variant.price)}</p>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => handleQuickAddQty(variant.id, -1)}
                                        className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 font-bold text-xs text-slate-700 flex items-center justify-center cursor-pointer"
                                      >
                                        -
                                      </button>
                                      <input
                                        type="number"
                                        inputMode="numeric"
                                        min="0"
                                        value={variant.qtySold === 0 ? '' : variant.qtySold}
                                        onChange={(e) => handleQtyChange(variant.id, e.target.value)}
                                        placeholder="0"
                                        className="w-12 rounded border border-slate-300 bg-white px-1 py-0.5 text-xs font-bold text-center text-slate-900 focus:border-emerald-500 focus:outline-none"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleQuickAddQty(variant.id, 1)}
                                        className="w-6 h-6 rounded bg-emerald-100 hover:bg-emerald-200 font-bold text-xs text-emerald-800 flex items-center justify-center cursor-pointer"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Unassigned products */}
            {unassignedProducts.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => toggleSeries('unassigned')}
                  className="w-full flex items-center justify-between p-3.5 bg-white hover:bg-slate-50 transition text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xs text-slate-900">Menu Lainnya</h3>
                      <p className="text-[10px] text-slate-500">{unassignedProducts.length} Varian</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {unassignedSoldTotal > 0 && (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        {unassignedSoldTotal} Cup
                      </span>
                    )}
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform ${
                        expandedSeries['unassigned'] ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Panel 4: Sisa Stok Cup Fisik Akhir Shift (Closing Cup) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-600" />
              <div>
                <h2 className="font-bold text-slate-900 text-base">4. Sisa Stok Cup Akhir Shift (Closing Cup)</h2>
                <p className="text-xs text-slate-500">
                  Hitung sisa fisik cup di booth. Sistem otomatis mencocokkan cup terpakai vs menu terjual.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">
              {totalCupsUsed} Cup Terpakai
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cupStocks.map((c) => {
              const init = parseInt(c.qtyInitial, 10) || 0;
              const add = parseInt(c.qtyAdded, 10) || 0;
              const fin = parseInt(c.qtyFinal, 10) || 0;
              const totalAvail = init + add;
              const used = Math.max(0, totalAvail - fin);
              const soldFromMenu = cupsSoldFromMenuMap[c.cupTypeId] || 0;
              const diff = used - soldFromMenu;

              return (
                <div
                  key={c.cupTypeId}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{c.cupTypeName}</span>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span>Awal: <strong>{init}</strong></span>
                      {add > 0 && <span className="text-emerald-700 font-bold">+{add}</span>}
                      <span>Total: <strong>{totalAvail}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-200/80">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Sisa Fisik Akhir:
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          value={c.qtyFinal}
                          onChange={(e) => handleStockChange(c.cupTypeId, 'qtyFinal', e.target.value)}
                          className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm font-bold text-center text-slate-900 focus:border-emerald-500"
                        />
                        <span className="text-xs text-slate-500">pcs</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="block text-[10px] text-slate-500">Terpakai vs Menu</span>
                      <div className="flex items-center justify-end gap-1.5 mt-0.5">
                        <span className="text-sm font-extrabold text-slate-900">{used} pcs</span>
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
            })}
          </div>
        </div>

        {/* Panel 5: Sisa Teh di Booth (Hanya saat Shift Sore / Closing Harian) */}
        {selectedShift === 'SORE' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Droplets className="w-5 h-5 text-emerald-600" />
                <div>
                  <h2 className="font-bold text-slate-900 text-base">5. Sisa Teh di Booth (Liter)</h2>
                  <p className="text-xs text-slate-500">
                    Sisa teh dispenser saat closing sore yang akan otomatis menjadi stok awal di dapur besok.
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                Stok Lanjutan
              </span>
            </div>

            <div className="space-y-2 max-w-sm">
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={teaRemainingLiters}
                  onChange={(e) => setTeaRemainingLiters(e.target.value)}
                  placeholder="0"
                  className="block w-full rounded-xl border border-slate-300 p-3 pr-14 text-lg font-bold text-slate-900 focus:border-emerald-500"
                />
                <span className="absolute right-3.5 top-3.5 text-xs font-bold text-slate-400">Liter</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setTeaRemainingLiters('0')}
                  className="px-2.5 py-1 rounded bg-slate-100 text-xs font-bold text-slate-700 hover:bg-slate-200"
                >
                  Habis (0L)
                </button>
                {[1, 2, 3, 5, 10].map((lit) => (
                  <button
                    key={lit}
                    type="button"
                    onClick={() => {
                      const cur = parseFloat(teaRemainingLiters) || 0;
                      setTeaRemainingLiters(String(cur + lit));
                    }}
                    className="px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                  >
                    +{lit}L
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Panel 6: Penerimaan Kasir (Uang Fisik Kasir & Setoran QRIS) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-600" />
              <div>
                <h2 className="font-bold text-slate-900 text-base">
                  {selectedShift === 'SORE' ? '6' : '5'}. Penerimaan Kasir Akhir Shift
                </h2>
                <p className="text-xs text-slate-500">
                  Hitung uang fisik tunai di laci kasir dan total penerimaan non-tunai (QRIS / transfer).
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Field A: Uang Fisik Kasir Tunai */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-emerald-600" />
                A. Uang Fisik Kasir di Laci (Modal + Omzet Tunai) *
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={cashFinal}
                onChange={(e) => setCashFinal(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-lg font-bold text-slate-900 focus:border-emerald-500 shadow-2xs"
                required
              />
            </div>

            {/* Field B: Setoran QRIS / Transfer */}
            <div className="rounded-xl border border-sky-200 bg-sky-50/40 p-4 space-y-2">
              <label className="block text-xs font-bold text-sky-950 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-sky-600" />
                  B. Setoran QRIS / Transfer Non-Tunai
                </span>
                <span className="text-[10px] font-normal text-slate-500">Isi 0 jika tidak ada</span>
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={qrisFinal}
                onChange={(e) => setQrisFinal(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-sky-300 bg-white px-3 py-2.5 text-lg font-bold text-sky-950 focus:border-sky-500 shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Panel 7: Rekonsiliasi Real-time & Selisih Kasir */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6 text-white shadow-md space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Calculator className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-base text-white">
              {selectedShift === 'SORE' ? '7' : '6'}. Rekonsiliasi Kasir & Stok Real-Time
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Kolom Kiri: Penjualan & Modal */}
            <div className="space-y-2.5">
              <div className="flex justify-between text-slate-300">
                <span>Modal Awal Kas:</span>
                <span className="font-bold text-white">{formatRupiah(modalNum)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Total Omzet Penjualan (Menu):</span>
                <span className="font-bold text-emerald-400">{formatRupiah(totalSalesRevenue)}</span>
              </div>
              <div className="flex justify-between font-bold text-white pt-2 border-t border-slate-800">
                <span>Total Uang Seharusnya:</span>
                <span className="text-base">{formatRupiah(expectedTotalCash)}</span>
              </div>
            </div>

            {/* Kolom Kanan: Uang Fisik, QRIS & Selisih */}
            <div className="space-y-2.5 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <div className="flex justify-between text-slate-300">
                <span>• Uang Fisik Kasir (Tunai):</span>
                <span className="font-bold text-white">{formatRupiah(cashFinalNum)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>• Setoran QRIS / Non-Tunai:</span>
                <span className="font-bold text-sky-400">{formatRupiah(qrisFinalNum)}</span>
              </div>
              <div className="flex justify-between text-white font-bold pt-1.5 border-t border-slate-800">
                <span>Total Penerimaan Aktual:</span>
                <span className="text-emerald-400 font-extrabold text-sm">{formatRupiah(totalActualReceived)}</span>
              </div>
              <div className="flex justify-between font-extrabold pt-2 border-t border-slate-800">
                <span>Selisih Kasir (Variance):</span>
                <span
                  className={`text-sm ${
                    cashVariance === 0 ? 'text-emerald-400' : cashVariance > 0 ? 'text-sky-400' : 'text-red-400'
                  }`}
                >
                  {cashVariance === 0 ? 'Rp 0 (Pas ✓)' : formatRupiah(cashVariance)}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 gap-2">
            <span>Rekonsiliasi Cup Fisik vs Penjualan:</span>
            <span className={`font-bold ${cupVariance === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {totalCupsUsed} cup fisik / {totalProductsSold} porsi menu ({cupVariance === 0 ? 'Cocok ✓' : `${cupVariance > 0 ? `+${cupVariance}` : cupVariance} cup selisih`})
            </span>
          </div>
        </div>

        {/* Panel 8: Catatan Operasional Shift */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-2">
          <label className="block text-sm font-bold text-slate-800">
            {selectedShift === 'SORE' ? '8' : '7'}. Catatan Operasional Shift (Opsional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Catatan kendala / sisa cup rusak / kompor / pesan operasional..."
            className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        {/* Submit Bar */}
        <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-300 shadow-xl flex items-center justify-between gap-4">
          <div className="hidden sm:block">
            <p className="text-xs text-slate-500">
              Menyimpan ke <strong>{booths.find((b) => b.id === selectedBoothId)?.name || 'Booth'}</strong> (Shift {selectedShift})
            </p>
            <p className="text-xs font-bold text-slate-900">
              Total Omzet: <span className="text-emerald-700">{formatRupiah(totalSalesRevenue)}</span> | Selisih:{' '}
              <span className={cashVariance === 0 ? 'text-emerald-700' : 'text-amber-700'}>
                {cashVariance === 0 ? 'Pas ✓' : formatRupiah(cashVariance)}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={fetchReportDetail}
              className="px-4 py-3 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Form
            </button>

            <button
              type="submit"
              disabled={submitting || loadingDetail}
              className="flex-1 sm:flex-none px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-sm font-extrabold text-white shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {submitting ? 'Menyimpan Laporan...' : 'Simpan Laporan Shift & Sinkronkan'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
