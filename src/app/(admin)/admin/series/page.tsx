'use client';

import { useState, useEffect, useCallback } from 'react';
import { Pencil, Trash2, RefreshCw, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '@/lib/api-client';

interface SeriesItem {
  id: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
}

export default function SeriesPage() {
  const [seriesList, setSeriesList] = useState<SeriesItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSeries = useCallback(async () => {
    setLoading(true);
    const res = await api.get<SeriesItem[]>('/tea-series?all=true');
    if (res.success && res.data) {
      setSeriesList(res.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSeries();
  }, [fetchSeries]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setIsActive(true);
    setError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (item: SeriesItem) => {
    setEditingId(item.id);
    setName(item.name);
    setDescription(item.description || '');
    setIsActive(item.isActive !== false);
    setError(null);
    setShowModal(true);
  };

  const handleToggleStatus = async (item: SeriesItem) => {
    const newStatus = item.isActive === false ? true : false;
    setTogglingId(item.id);
    const res = await api.patch(`/tea-series/${item.id}`, {
      isActive: newStatus,
    });
    setTogglingId(null);

    if (res.success) {
      setSeriesList((prev) =>
        prev.map((s) => (s.id === item.id ? { ...s, isActive: newStatus } : s))
      );
    } else {
      alert(res.error?.message || 'Gagal mengubah status aktif series teh');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus series teh ini?')) return;
    const res = await api.delete(`/tea-series/${id}`);
    if (res.success) {
      await fetchSeries();
    } else {
      alert(res.error?.message || 'Gagal menghapus series teh');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama series wajib diisi');
      return;
    }

    setSubmitting(true);
    setError(null);

    let res;
    if (editingId) {
      res = await api.patch(`/tea-series/${editingId}`, {
        name: name.trim(),
        description: description.trim() || undefined,
        isActive,
      });
    } else {
      res = await api.post('/tea-series', {
        name: name.trim(),
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
      await fetchSeries();
    } else {
      setError(res.error?.message || 'Gagal menyimpan data series');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Katalog Series Teh</h1>
          <p className="text-sm text-slate-500">Kelola kelompok/kategori rasa teh minuman dan status aktif/non-aktif</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchSeries}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            data-testid="add-series-btn"
            onClick={handleOpenAdd}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 transition shadow-sm"
          >
            + Tambah Series
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4 z-50">
          <form onSubmit={handleSave} className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">
              {editingId ? 'Edit Series Teh' : 'Tambah Series Teh'}
            </h2>

            {error && (
              <div data-testid="series-error" className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-sm text-red-700 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700">Nama Series *</label>
              <input
                data-testid="series-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                placeholder="misal: Special Blend Series"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Deskripsi (Opsional)</label>
              <textarea
                data-testid="series-desc-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                placeholder="Deskripsi varian series..."
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
                    <p className="text-xs text-slate-500">Non-aktifkan jika series ini sedang tidak dijual di outlet.</p>
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
                data-testid="series-save-btn"
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {submitting ? 'Menyimpan...' : editingId ? 'Update' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="w-full max-w-full space-y-2">
        <div className="w-full max-w-full rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="w-full max-w-full overflow-x-auto block">
            <table data-testid="series-table" className="w-full min-w-[650px] text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3 whitespace-nowrap">Nama Series</th>
                  <th className="px-6 py-3 whitespace-nowrap">Deskripsi</th>
                  <th className="px-6 py-3 whitespace-nowrap">Status</th>
                  <th className="px-6 py-3 text-right whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading && seriesList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
                        <span>Memuat data series dari database...</span>
                      </div>
                    </td>
                  </tr>
                ) : seriesList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                      Belum ada data series teh di database. Klik tombol &quot;+ Tambah Series&quot; di atas.
                    </td>
                  </tr>
                ) : (
                  seriesList.map((s) => {
                    const active = s.isActive !== false;
                    return (
                      <tr key={s.id} className={`hover:bg-slate-50 transition ${!active ? 'bg-slate-50/60 opacity-75' : ''}`}>
                        <td className="px-6 py-4 font-semibold text-slate-900 whitespace-nowrap">
                          {s.name}
                        </td>
                        <td className="px-6 py-4 min-w-[200px]">{s.description || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(s)}
                            disabled={togglingId === s.id}
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
                              data-testid={`edit-series-btn-${s.id}`}
                              onClick={() => handleOpenEdit(s)}
                              className="flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                            >
                              <Pencil className="h-3.5 w-3.5 text-slate-500" />
                              Edit
                            </button>
                            <button
                              data-testid={`delete-series-btn-${s.id}`}
                              onClick={() => handleDelete(s.id)}
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