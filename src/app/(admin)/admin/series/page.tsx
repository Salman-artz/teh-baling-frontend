'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

export default function SeriesPage() {
  const [seriesList, setSeriesList] = useState([
    { id: '1', name: 'Original Tea Series', description: 'Teh Asli Melati Khas Baling', isActive: true },
    { id: '2', name: 'Yakult Series', description: 'Perpaduan Teh Segar dan Yakult', isActive: true },
    { id: '3', name: 'Fruity Series', description: 'Varian Rasa Buah-Buahan Segar', isActive: true },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (item: { id: string; name: string; description: string }) => {
    setEditingId(item.id);
    setName(item.name);
    setDescription(item.description);
    setError(null);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus series teh ini?')) {
      setSeriesList((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama series wajib diisi');
      return;
    }

    if (editingId) {
      setSeriesList((prev) =>
        prev.map((s) => (s.id === editingId ? { ...s, name, description } : s))
      );
    } else {
      setSeriesList((prev) => [
        ...prev,
        { id: String(Date.now()), name, description, isActive: true },
      ]);
    }

    setName('');
    setDescription('');
    setEditingId(null);
    setShowModal(false);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Katalog Series Teh</h1>
          <p className="text-sm text-slate-500">Kelola kelompok/kategori rasa teh minuman</p>
        </div>
        <button
          data-testid="add-series-btn"
          onClick={handleOpenAdd}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 transition"
        >
          + Tambah Series
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4 z-50">
          <form onSubmit={handleSave} className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">
              {editingId ? 'Edit Series Teh' : 'Tambah Series Teh'}
            </h2>

            {error && <p data-testid="series-error" className="text-sm text-red-600">{error}</p>}

            <div>
              <label className="block text-sm font-medium text-slate-700">Nama Series</label>
              <input
                data-testid="series-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                placeholder="misal: Special Blend"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Deskripsi</label>
              <textarea
                data-testid="series-desc-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                placeholder="Deskripsi varian series..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                data-testid="series-save-btn"
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                {editingId ? 'Update' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="w-full max-w-full space-y-2">
        <p className="text-[11px] text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 sm:hidden flex items-center gap-1.5 font-medium">
          👉 <span>Geser tabel ke samping untuk melihat seluruh data</span>
        </p>
        <div className="w-full max-w-full rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="w-full max-w-full overflow-x-auto block">
            <table data-testid="series-table" className="w-full min-w-[600px] text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3 whitespace-nowrap">Nama Series</th>
                  <th className="px-6 py-3 whitespace-nowrap">Deskripsi</th>
                  <th className="px-6 py-3 whitespace-nowrap">Status</th>
                  <th className="px-6 py-3 text-right whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {seriesList.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-semibold text-slate-900 whitespace-nowrap">{s.name}</td>
                    <td className="px-6 py-4 min-w-[200px]">{s.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                        Aktif
                      </span>
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}