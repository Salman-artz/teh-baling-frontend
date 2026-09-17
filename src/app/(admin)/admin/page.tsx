'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { formatRupiah } from '@/lib/utils';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface ChartDataItem {
  label: string;
  revenue?: number;
  alunAlun?: number;
  unesa?: number;
  gubeng?: number;
  totalRevenue?: number;
  cups?: number;
}

export default function AdminDashboardPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [period, setPeriod] = useState<'hourly' | 'daily' | 'monthly'>('hourly');
  const [selectedBooth, setSelectedBooth] = useState('ALL');
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  const [isLoadingChart, setIsLoadingChart] = useState(false);

  const [dashboardData, setDashboardData] = useState<{
    totalRevenue: number;
    totalCupsSold: number;
    activeBooths: number;
    booths: Array<{ id: string; name: string; attendantName: string; status: string; revenue: number; variance: number }>;
  }>({
    totalRevenue: 3450000,
    totalCupsSold: 320,
    activeBooths: 2,
    booths: [
      { id: 'b1111111-1111-1111-1111-111111111111', name: 'Booth Alun-Alun Kota', attendantName: 'Rina', status: 'Beroperasi', revenue: 1850000, variance: 0 },
      { id: 'b2222222-2222-2222-2222-222222222222', name: 'Booth Kampus UNESA', attendantName: 'Siti', status: 'Beroperasi', revenue: 1600000, variance: -5000 },
    ],
  });

  useEffect(() => {
    setIsMounted(true);
    api.get<typeof dashboardData>('/dashboard/today').then((res) => {
      if (res.success && res.data) setDashboardData(res.data);
    });
  }, []);

  // Fetch dynamic chart data based on active filters
  useEffect(() => {
    if (!isMounted) return;
    setIsLoadingChart(true);
    api.get<ChartDataItem[]>(`/dashboard/chart?period=${period}&boothId=${selectedBooth}`)
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setChartData(res.data);
        }
      })
      .finally(() => setIsLoadingChart(false));
  }, [isMounted, period, selectedBooth]);

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ color?: string; name?: string; value?: number }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg text-xs space-y-1">
          <p className="font-bold text-slate-800">{label}</p>
          {payload.map((entry, index: number) => (
            <p key={`item-${index}`} style={{ color: entry.color }} className="font-semibold">
              {entry.name}: {typeof entry.value === 'number' && entry.value > 1000 ? formatRupiah(entry.value) : `${entry.value} Cup`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Penjualan Teh Baling</h1>
        <p className="text-sm text-slate-500">Ringkasan transaksi real-time & analisis tren penjualan harian dan mingguan</p>
      </div>

      {/* Ringkasan Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Revenue Hari Ini</p>
          <p data-testid="total-revenue" className="mt-2 text-3xl font-bold text-slate-900">
            {formatRupiah(dashboardData.totalRevenue)}
          </p>
          <p className="mt-1 text-xs text-emerald-600 font-semibold">▲ +12% dibanding kemarin</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Cup Terjual</p>
          <p data-testid="cups-sold" className="mt-2 text-3xl font-bold text-emerald-600">
            {dashboardData.totalCupsSold} Cup
          </p>
          <p className="mt-1 text-xs text-slate-500">Rata-rata 160 cup / booth</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Status Stand Penjualan</p>
          <p data-testid="active-booths" className="mt-2 text-3xl font-bold text-slate-900">
            {dashboardData.activeBooths} / 2 Booth
          </p>
          <p className="mt-1 text-xs text-emerald-600 font-semibold">● 100% Beroperasi Normal</p>
        </div>
      </div>

      {/* Section Graphic Charts Penjualan dengan Filter Dinamis */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Analisis Grafik Penjualan Dinamis</h2>
            <p className="text-xs text-slate-500">Visualisasi omzet pendapatan interaktif per outlet booth dan rentang waktu</p>
          </div>

          {/* Filter Bar Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Filter Booth:</label>
              <select
                value={selectedBooth}
                onChange={(e) => setSelectedBooth(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 font-medium focus:border-emerald-500 focus:outline-none"
              >
                <option value="ALL">Semua Booth (Komparasi)</option>
                <option value="b1111111-1111-1111-1111-111111111111">Booth Alun-Alun Kota</option>
                <option value="b2222222-2222-2222-2222-222222222222">Booth Kampus UNESA</option>
                <option value="b3333333-3333-3333-3333-333333333333">Booth Stasiun Gubeng</option>
              </select>
            </div>

            <div className="flex rounded-lg bg-slate-100 p-1">
              <button
                onClick={() => setPeriod('hourly')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  period === 'hourly'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Per Jam (Hari Ini)
              </button>
              <button
                onClick={() => setPeriod('daily')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  period === 'daily'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Per Hari (Minggu Ini)
              </button>
              <button
                onClick={() => setPeriod('monthly')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  period === 'monthly'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Per Minggu (Bulan Ini)
              </button>
            </div>
          </div>
        </div>

        <div className="h-[340px] w-full pt-2">
          {!isMounted || isLoadingChart ? (
            <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
              Memuat grafik data penjualan...
            </div>
          ) : selectedBooth !== 'ALL' ? (
            /* Grafik Single Booth (Revenue & Cups) */
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSingle" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickFormatter={(val) => `Rp${val / 1000}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Pendapatan (IDR)"
                  stroke="#059669"
                  fillOpacity={1}
                  fill="url(#colorSingle)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : period === 'hourly' ? (
            /* Grafik Komparasi Jam Multi-Booth */
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAlun" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorUnesa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorGubeng" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickFormatter={(val) => `Rp${val / 1000}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Area
                  type="monotone"
                  dataKey="alunAlun"
                  name="Booth Alun-Alun"
                  stroke="#059669"
                  fillOpacity={1}
                  fill="url(#colorAlun)"
                />
                <Area
                  type="monotone"
                  dataKey="unesa"
                  name="Booth Kampus UNESA"
                  stroke="#0284c7"
                  fillOpacity={1}
                  fill="url(#colorUnesa)"
                />
                <Area
                  type="monotone"
                  dataKey="gubeng"
                  name="Booth Stasiun Gubeng"
                  stroke="#d97706"
                  fillOpacity={1}
                  fill="url(#colorGubeng)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            /* Grafik Komparasi Bar Multi-Booth */
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickFormatter={(val) => (val >= 1000000 ? `Rp${val / 1000000}M` : `Rp${val / 1000}k`)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Bar dataKey="alunAlun" name="Booth Alun-Alun" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="unesa" name="Booth Kampus UNESA" fill="#0284c7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="gubeng" name="Booth Stasiun Gubeng" fill="#d97706" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Tabel Live Status Booth */}
      <div className="w-full max-w-full space-y-2">
        <p className="text-[11px] text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 sm:hidden flex items-center gap-1.5 font-medium">
          👉 <span>Geser tabel ke samping untuk melihat seluruh data</span>
        </p>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm w-full max-w-full">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-bold text-slate-900">Status Penjualan per Booth Hari Ini</h2>
          </div>
          <div className="overflow-x-auto w-full max-w-full block">
            <table data-testid="booth-table" className="w-full min-w-[650px] text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3 whitespace-nowrap">Nama Booth</th>
                <th className="px-6 py-3 whitespace-nowrap">Penjaga (Attendant)</th>
                <th className="px-6 py-3 whitespace-nowrap">Status</th>
                <th className="px-6 py-3 whitespace-nowrap">Total Revenue</th>
                <th className="px-6 py-3 whitespace-nowrap">Selisih Kas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {dashboardData.booths.map((booth) => (
                <tr key={booth.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-semibold text-slate-900">{booth.name}</td>
                  <td className="px-6 py-4">{booth.attendantName}</td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                      {booth.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-900">{formatRupiah(booth.revenue)}</td>
                  <td className={`px-6 py-4 font-semibold ${booth.variance < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {formatRupiah(booth.variance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
}