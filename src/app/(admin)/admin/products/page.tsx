'use client';

import { useState, useEffect, useCallback } from 'react';
import { Pencil, Trash2, RefreshCw, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '@/lib/api-client';

interface ProductItem {
  id: string;
  name: string;
  seriesId: string;
  seriesName?: string | null;
  description?: string | null;
  isActive?: boolean;
}

interface SeriesOption {
  id: string;
  name: string;
}

export default function ProductsPage() {
  const [productList, setProductList] = useState<ProductItem[]>([]);
  const [seriesOptions, setSeriesOptions] = useState<SeriesOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [selectedSeries, setSelectedSeries] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [seriesId, setSeriesId] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [prodRes, seriesRes] = await Promise.all([
      api.get<ProductItem[]>('/tea-products?all=true'),
      api.get<SeriesOption[]>('/tea-series?all=true'),
    ]);

    if (prodRes.success && prodRes.data) {
      setProductList(prodRes.data);
    }
    if (seriesRes.success && seriesRes.data) {
      setSeriesOptions(seriesRes.data);
      if (seriesRes.data.length > 0 && !seriesId) {
        setSeriesId(seriesRes.data[0].id);
      }
    }
    setLoading(false);
  }, [seriesId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredProducts = selectedSeries === 'ALL'
    ? productList
    : productList.filter((p) => p.seriesId === selectedSeries);

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    if (seriesOptions.length > 0) {
      setSeriesId(seriesOptions[0].id);
    } else {
      setSeriesId('');
    }
    setDescription('');
    setIsActive(true);
    setError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (item: ProductItem) => {
    setEditingId(item.id);
    setName(item.name);
    setSeriesId(item.seriesId || (seriesOptions[0]?.id || ''));
    setDescription(item.description || '');
    setIsActive(item.isActive !== false);
    setError(null);
    setShowModal(true);
  };

  const handleToggleStatus = async (item: ProductItem) => {
    const newStatus = item.isActive === false ? true : false;
    setTogglingId(item.id);
    const res = await api.patch(`/tea-products/${item.id}`, {
      isActive: newStatus,
    });
    setTogglingId(null);

    if (res.success) {
      setProductList((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, isActive: newStatus } : p))
      );
    } else {
      alert(res.error?.message || 'Gagal mengubah status aktif produk');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus produk teh ini?')) return;
    const res = await api.delete(`/tea-products/${id}`);
    if (res.success) {
      await fetchData();
    } else {
      alert(res.error?.message || 'Gagal menghapus produk');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama produk wajib diisi');
      return;
    }
    if (!seriesId) {
      setError('Pilih kategori series teh terlebih dahulu');
      return;
    }

    setSubmitting(true);
    setError(null);

    let res;
    if (editingId) {
      res = await api.patch(`/tea-products/${editingId}`, {
        name: name.trim(),
        seriesId,
        description: description.trim() || undefined,
        isActive,
      });
    } else {
      res = await api.post('/tea-products', {
        name: name.trim(),
        seriesId,
        description: description.trim() || undefined,
      });
    }

    setSubmitting(false);

    if (res.success) {
      setName('');
      setDescription('');
      setIsActive(true);
      setEditingId(null);
      setShowModal(false);
      await fetchData();
    } else {
      setError(res.error?.message || 'Gagal menyimpan produk');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Katalog Produk Teh</h1>
          <p className="text-sm text-slate-500">Kelola daftar produk minuman Teh Baling dan status aktif/non-aktif</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            data-testid="add-product-btn"
            onClick={handleOpenAdd}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 transition"
          >
            + Tambah Produk
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="text-sm font-medium text-slate-700">Filter Series:</label>
        <select
          data-testid="product-series-filter"
          value={selectedSeries}
          onChange={(e) => setSelectedSeries(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
        >
          <option value="ALL">Semua Series ({productList.length})</option>
          {seriesOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Modal Tambah / Edit Produk */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={handleSave} className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">
              {editingId ? 'Edit Produk Minuman' : 'Tambah Produk Minuman'}
            </h2>

            {error && (
              <div data-testid="product-error" className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-sm text-red-700 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700">Kategori Series *</label>
              {seriesOptions.length === 0 ? (
                <p className="text-xs text-amber-600 mt-1">Belum ada data series. Silakan buat Series Teh terlebih dahulu di menu Series.</p>
              ) : (
                <select
                  data-testid="product-series-select"
                  value={seriesId}
                  onChange={(e) => setSeriesId(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
                  required
                >
                  {seriesOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Nama Produk *</label>
              <input
                data-testid="product-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
                placeholder="misal: Teh Baling Cheese Tea"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Deskripsi (Opsional)</label>
              <textarea
                data-testid="product-desc-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
                placeholder="Komposisi atau keunikan rasa..."
                rows={3}
              />
            </div>

            {editingId && (
              <div className="pt-1">
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="text-sm font-semibold text-slate-800">Status Aktif</span>
                    <p className="text-xs text-slate-500">Non-aktifkan jika menu produk ini sedang kosong / tidak dijual.</p>
                  </div>
                </label>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={submitting}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                data-testid="product-save-btn"
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {submitting ? 'Menyimpan...' : editingId ? 'Update' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabel Produk */}
      <div className="w-full max-w-full space-y-2">
        <div className="w-full max-w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="w-full max-w-full overflow-x-auto block">
            <table data-testid="products-table" className="w-full min-w-[700px] text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3 whitespace-nowrap">Nama Produk</th>
                  <th className="px-6 py-3 whitespace-nowrap">Series</th>
                  <th className="px-6 py-3 whitespace-nowrap">Deskripsi</th>
                  <th className="px-6 py-3 whitespace-nowrap">Status</th>
                  <th className="px-6 py-3 text-right whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading && productList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
                        <span>Memuat data produk teh dari database...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      Belum ada data produk minuman teh di database. Klik tombol &quot;+ Tambah Produk&quot; di atas.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const active = p.isActive !== false;
                    return (
                      <tr key={p.id} className={`hover:bg-slate-50 transition ${!active ? 'bg-slate-50/60 opacity-75' : ''}`}>
                        <td className="px-6 py-4 font-semibold text-slate-900 whitespace-nowrap">{p.name}</td>
                        <td className="px-6 py-4 font-medium text-emerald-700 whitespace-nowrap">{p.seriesName || '-'}</td>
                        <td className="px-6 py-4 min-w-[200px]">{p.description || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(p)}
                            disabled={togglingId === p.id}
                            title={active ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'}
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition border ${
                              active
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                            }`}
                          >
                            {active ? (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Aktif</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3.5 w-3.5 text-slate-400" />
                                <span>Non-Aktif</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              data-testid={`edit-product-btn-${p.id}`}
                              onClick={() => handleOpenEdit(p)}
                              className="flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                            >
                              <Pencil className="h-3.5 w-3.5 text-slate-500" />
                              Edit
                            </button>
                            <button
                              data-testid={`delete-product-btn-${p.id}`}
                              onClick={() => handleDelete(p.id)}
                              className="flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}