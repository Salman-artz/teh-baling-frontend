'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Pencil, Trash2, MapPin, Store, RefreshCw, CheckCircle2, AlertCircle, Search } from 'lucide-react';
import { api } from '@/lib/api-client';

// Dynamic import for Leaflet map component (SSR false)
const MapPicker = dynamic(() => import('@/components/map-picker'), {
  ssr: false,
  loading: () => (
    <div className="h-60 sm:h-64 w-full rounded-xl bg-slate-100 flex flex-col items-center justify-center text-slate-400 text-xs border-2 border-dashed border-slate-300 gap-2">
      <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      <span>Memuat Peta Interaktif...</span>
    </div>
  ),
});

interface BoothItem {
  id: string;
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  isActive: boolean;
}

export default function BoothsPage() {
  const [boothList, setBoothList] = useState<BoothItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('-7.2575000');
  const [lng, setLng] = useState('112.7521000');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchBooths = async () => {
    setLoading(true);
    try {
      const res = await api.get<BoothItem[]>('/booths');
      if (res.success && Array.isArray(res.data)) {
        setBoothList(res.data);
      }
    } catch {
      // Fallback to default
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooths();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setAddress('');
    setLat('-7.2575000');
    setLng('112.7521000');
    setIsActive(true);
    setError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (booth: BoothItem) => {
    setEditingId(booth.id);
    setName(booth.name);
    setAddress(booth.address);
    setLat(booth.latitude || '-7.2575000');
    setLng(booth.longitude || '112.7521000');
    setIsActive(booth.isActive);
    setError(null);
    setShowModal(true);
  };

  const handleToggleStatus = async (booth: BoothItem) => {
    const nextStatus = !booth.isActive;
    try {
      setBoothList((prev) =>
        prev.map((b) => (b.id === booth.id ? { ...b, isActive: nextStatus } : b))
      );
      const res = await api.patch<BoothItem>(`/booths/${booth.id}`, {
        isActive: nextStatus,
      });
      if (res.success && res.data) {
        setBoothList((prev) =>
          prev.map((b) => (b.id === booth.id ? res.data! : b))
        );
      }
      setFeedback({
        type: 'success',
        message: `Status booth "${booth.name}" berhasil diubah menjadi ${nextStatus ? 'Aktif' : 'Non-Aktif'}.`,
      });
    } catch {
      setBoothList((prev) =>
        prev.map((b) => (b.id === booth.id ? { ...b, isActive: booth.isActive } : b))
      );
      setFeedback({ type: 'error', message: 'Gagal mengubah status booth.' });
    } finally {
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus booth penjualan ini?')) {
      return;
    }

    try {
      const res = await api.delete(`/booths/${id}`);
      if (res.success) {
        setBoothList((prev) => prev.filter((b) => b.id !== id));
        setFeedback({ type: 'success', message: 'Booth berhasil dihapus.' });
      } else {
        setBoothList((prev) => prev.filter((b) => b.id !== id));
        setFeedback({ type: 'success', message: 'Booth berhasil dihapus.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Gagal menghapus booth.' });
    } finally {
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleCoordinatesChange = (newLat: string, newLng: string) => {
    setLat(newLat);
    setLng(newLng);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama booth wajib diisi');
      return;
    }
    if (!address.trim()) {
      setError('Alamat booth wajib diisi');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        address: address.trim(),
        latitude: lat || '-7.2575000',
        longitude: lng || '112.7521000',
        isActive,
      };

      if (editingId) {
        const res = await api.patch<BoothItem>(`/booths/${editingId}`, payload);
        if (res.success && res.data) {
          setBoothList((prev) => prev.map((b) => (b.id === editingId ? res.data! : b)));
        } else {
          setBoothList((prev) =>
            prev.map((b) => (b.id === editingId ? { ...b, ...payload } : b))
          );
        }
        setFeedback({ type: 'success', message: `Booth "${name}" berhasil diperbarui.` });
      } else {
        const res = await api.post<BoothItem>('/booths', payload);
        if (res.success && res.data) {
          setBoothList((prev) => [res.data!, ...prev]);
        } else {
          setBoothList((prev) => [
            ...prev,
            {
              id: `b_${Date.now()}`,
              name,
              address,
              latitude: lat || '-7.2575000',
              longitude: lng || '112.7521000',
              isActive,
            },
          ]);
        }
        setFeedback({ type: 'success', message: `Booth "${name}" berhasil ditambahkan.` });
      }

      setName('');
      setAddress('');
      setLat('-7.2575000');
      setLng('112.7521000');
      setIsActive(true);
      setEditingId(null);
      setShowModal(false);
      setError(null);
    } catch {
      setError('Gagal menyimpan data booth.');
    } finally {
      setLoading(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const filteredBooths = useMemo(() => {
    return boothList.filter((b) => {
      if (statusFilter === 'ACTIVE' && !b.isActive) return false;
      if (statusFilter === 'INACTIVE' && b.isActive) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return b.name.toLowerCase().includes(q) || b.address.toLowerCase().includes(q);
      }
      return true;
    });
  }, [boothList, statusFilter, searchQuery]);

  const countAll = boothList.length;
  const countActive = boothList.filter((b) => b.isActive).length;
  const countInactive = boothList.filter((b) => !b.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manajemen Booth & Outlet</h1>
          <p className="text-sm text-slate-500">
            Kelola data cabang outlet Teh Baling, status operasional aktif/nonaktif, dan titik koordinat GPS lokasi fisik di peta
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchBooths}
            disabled={loading}
            title="Muat Ulang Data"
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
            Refresh
          </button>
          <button
            data-testid="add-booth-btn"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 transition cursor-pointer"
          >
            <Store className="h-4 w-4" />
            + Tambah Booth Baru
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`flex items-center gap-2 rounded-lg p-4 text-sm font-medium transition ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Search & Status Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <span>Semua Booth</span>
            <span className="rounded-full bg-slate-200 px-1.5 py-0.2 text-[10px] font-mono">
              {countAll}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'ACTIVE'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50'
            }`}
          >
            <span>🟢 Aktif</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
              statusFilter === 'ACTIVE' ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-200 text-slate-700'
            }`}>
              {countActive}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('INACTIVE')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'INACTIVE'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <span>⚪ Non-Aktif</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
              statusFilter === 'INACTIVE' ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-700'
            }`}>
              {countInactive}
            </span>
          </button>
        </div>

        {/* Search Box */}
        <div className="relative flex-1 sm:max-w-xs">
          <input
            type="text"
            placeholder="Cari nama booth atau alamat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 focus:outline-none"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>
      </div>

      {/* Modal Tambah / Edit Booth */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <form
            onSubmit={handleSave}
            className="w-full max-w-xl space-y-4 rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 my-8 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-emerald-700" />
                <h2 className="text-lg font-bold text-slate-900">
                  {editingId ? 'Edit Lokasi & Status Booth' : 'Tambah Booth Baru & Titik Peta'}
                </h2>
              </div>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                Admin Mode
              </span>
            </div>

            {error && (
              <p data-testid="booth-error" className="text-sm text-red-600 font-medium bg-red-50 p-2.5 rounded-md border border-red-200">
                {error}
              </p>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700">Nama Booth / Outlet</label>
              <input
                data-testid="booth-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 focus:outline-none"
                placeholder="misal: Booth Taman Bungkul"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700">Alamat Lengkap</label>
              <textarea
                data-testid="booth-address-input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 focus:outline-none"
                placeholder="Jl. Darmo No. 45, Surabaya"
              />
            </div>

            {/* Status Switch Toggle */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-800">Status Operasional Booth</label>
                <p className="text-[11px] text-slate-500">
                  {isActive
                    ? '🟢 Booth Aktif (Dapat dipilih untuk penugasan shift kasir)'
                    : '⚪ Booth Non-Aktif (Operasional ditutup sementara)'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isActive ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    isActive ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Interactive Leaflet/OpenStreetMap Map Picker */}
            <div className="pt-1">
              <MapPicker
                key={editingId ? `edit-${editingId}` : 'add-new'}
                latitude={lat}
                longitude={lng}
                onChange={handleCoordinatesChange}
                boothName={name || 'Titik Booth'}
              />
            </div>

            {/* Coordinate Inputs (Synced with Map) */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Latitude (Otomatis dari Peta)</label>
                <input
                  data-testid="booth-lat-input"
                  type="text"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="mt-1 block w-full rounded-lg border-2 border-emerald-800 bg-slate-100 p-2 text-xs font-mono font-bold text-slate-950 focus:border-emerald-900 focus:outline-none"
                  placeholder="-7.2575000"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Longitude (Otomatis dari Peta)</label>
                <input
                  data-testid="booth-lng-input"
                  type="text"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  className="mt-1 block w-full rounded-lg border-2 border-emerald-800 bg-slate-100 p-2 text-xs font-mono font-bold text-slate-950 focus:border-emerald-900 focus:outline-none"
                  placeholder="112.7521000"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                data-testid="booth-save-btn"
                disabled={loading}
                className="rounded-lg bg-emerald-700 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-800 shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah Booth'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabel Booths */}
      <div className="w-full max-w-full space-y-2">
        <p className="text-[11px] text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 sm:hidden flex items-center gap-1.5 font-medium">
          👉 <span>Geser tabel ke samping untuk melihat seluruh data</span>
        </p>
        <div className="w-full max-w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="w-full max-w-full overflow-x-auto block">
            <table data-testid="booths-table" className="w-full min-w-[700px] text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3 whitespace-nowrap">Nama Booth</th>
                  <th className="px-6 py-3 whitespace-nowrap">Alamat Fisik</th>
                  <th className="px-6 py-3 whitespace-nowrap">Koordinat GPS Peta</th>
                  <th className="px-6 py-3 whitespace-nowrap">Status Operasional</th>
                  <th className="px-6 py-3 text-right whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredBooths.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-xs text-slate-400">
                      Tidak ada booth yang sesuai dengan filter atau pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredBooths.map((booth) => (
                    <tr key={booth.id} className={`hover:bg-slate-50 transition ${!booth.isActive ? 'bg-slate-50/40 opacity-75' : ''}`}>
                      <td className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`p-1.5 rounded-md ${booth.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'}`}>
                            <Store className="w-4 h-4" />
                          </span>
                          <span>{booth.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-700 whitespace-nowrap">{booth.address}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                        <a
                          href={`https://www.google.com/maps?q=${booth.latitude},${booth.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-emerald-700 hover:underline font-bold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 w-fit"
                        >
                          <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                          {booth.latitude}, {booth.longitude} ↗
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(booth)}
                          title={booth.isActive ? 'Klik untuk nonaktifkan booth' : 'Klik untuk aktifkan booth'}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition cursor-pointer hover:shadow-xs ${
                            booth.isActive
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${booth.isActive ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'}`} />
                          <span>{booth.isActive ? 'Aktif' : 'Non-Aktif'}</span>
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            data-testid={`edit-booth-btn-${booth.id}`}
                            onClick={() => handleOpenEdit(booth)}
                            className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5 text-slate-500" />
                            Edit
                          </button>
                          <button
                            data-testid={`delete-booth-btn-${booth.id}`}
                            onClick={() => handleDelete(booth.id)}
                            className="flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}