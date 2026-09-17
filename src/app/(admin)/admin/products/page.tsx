'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

export default function ProductsPage() {
  const [productList, setProductList] = useState([
    { id: 'p1', name: 'Teh Baling Ori Melati', seriesId: 's1', seriesName: 'Original Tea Series', description: 'Teh Asli Melati Khas Baling', isActive: true },
    { id: 'p2', name: 'Teh Baling Lemon Tea', seriesId: 's1', seriesName: 'Original Tea Series', description: 'Perpaduan Teh Melati dan Lemon Segar', isActive: true },
    { id: 'p3', name: 'Teh Baling Yakult Ori', seriesId: 's2', seriesName: 'Yakult Series', description: 'Perpaduan Teh Segar dan Yakult Asli', isActive: true },
    { id: 'p4', name: 'Teh Baling Yakult Lychee', seriesId: 's2', seriesName: 'Yakult Series', description: 'Teh Yakult dengan Sensasi Buah Leci', isActive: true },
    { id: 'p5', name: 'Teh Baling Fruity Mango', seriesId: 's3', seriesName: 'Fruity Series', description: 'Segarnya Teh dengan Sirup Mangga', isActive: true },
    { id: 'p6', name: 'Teh Baling Fruity Passion', seriesId: 's3', seriesName: 'Fruity Series', description: 'Segarnya Teh dengan Markisa Segar', isActive: true },
  ]);

  const [selectedSeries, setSelectedSeries] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [seriesId, setSeriesId] = useState('s1');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const seriesOptions = [
    { id: 's1', name: 'Original Tea Series' },
    { id: 's2', name: 'Yakult Series' },
    { id: 's3', name: 'Fruity Series' },
  ];

  const filteredProducts = selectedSeries === 'ALL'
    ? productList
    : productList.filter((p) => p.seriesId === selectedSeries);

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setSeriesId('s1');
    setDescription('');
    setError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (item: { id: string; name: string; seriesId: string; description: string }) => {
    setEditingId(item.id);
    setName(item.name);
    setSeriesId(item.seriesId);
    setDescription(item.description);
    setError(null);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus produk teh ini?')) {
      setProductList((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama produk wajib diisi');
      return;
    }
    const seriesObj = seriesOptions.find((s) => s.id === seriesId);
    const seriesName = seriesObj ? seriesObj.name : 'Series';

    if (editingId) {
      setProductList((prev) =>
        prev.map((p) => (p.id === editingId ? { ...p, name, seriesId, seriesName, description } : p))
      );
    } else {
      setProductList((prev) => [
        ...prev,
        {
          id: `p_${Date.now()}`,
          name,
          seriesId,
          seriesName,
          description,
          isActive: true,
        },
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Katalog Produk Teh</h1>
          <p className="text-sm text-slate-500">Kelola daftar produk minuman Teh Baling per kategori series</p>
        </div>
        <button
          data-testid="add-product-btn"
          onClick={handleOpenAdd}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 transition"
        >
          + Tambah Produk
        </button>
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

            {error && <p data-testid="product-error" className="text-sm text-red-600">{error}</p>}

            <div>
              <label className="block text-sm font-medium text-slate-700">Kategori Series</label>
              <select
                data-testid="product-series-select"
                value={seriesId}
                onChange={(e) => setSeriesId(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
              >
                {seriesOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Nama Produk</label>
              <input
                data-testid="product-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
                placeholder="misal: Teh Baling Cheese Tea"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Deskripsi</label>
              <textarea
                data-testid="product-desc-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
                placeholder="Komposisi atau keunikan rasa..."
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
                data-testid="product-save-btn"
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                {editingId ? 'Update' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabel Produk */}
      <div className="w-full max-w-full space-y-2">
        <p className="text-[11px] text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 sm:hidden flex items-center gap-1.5 font-medium">
          👉 <span>Geser tabel ke samping untuk melihat seluruh data</span>
        </p>
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
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-semibold text-slate-900 whitespace-nowrap">{p.name}</td>
                    <td className="px-6 py-4 font-medium text-emerald-700 whitespace-nowrap">{p.seriesName}</td>
                    <td className="px-6 py-4 min-w-[200px]">{p.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                        Aktif
                      </span>
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}