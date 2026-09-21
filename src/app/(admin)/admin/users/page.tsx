'use client';

import { useState, useEffect, useCallback } from 'react';
import { Pencil, Trash2, Power, UserPlus, RefreshCw, CheckCircle2, AlertCircle, FlaskConical, EyeOff } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'BOOTH_ATTENDANT' | 'PRODUCTION';
  isActive: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const currentUser = useAuthStore((state) => state.user);
  const [userList, setUserList] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'ALL' | 'INACTIVE'>('ACTIVE');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [showTestUsers, setShowTestUsers] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'BOOTH_ATTENDANT' | 'PRODUCTION'>('BOOTH_ATTENDANT');
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isTestUser = (u: UserItem) =>
    u.name.toLowerCase().includes('test') || u.email.toLowerCase().includes('test');

  const testUsersCount = userList.filter(isTestUser).length;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<UserItem[]>('/users');
      if (res.success && Array.isArray(res.data)) {
        setUserList(res.data);
      }
    } catch {
      setFeedback({ type: 'error', message: 'Gagal memuat data pengguna dari server.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const visibleUsersPool = userList.filter((u) => showTestUsers || !isTestUser(u));

  const countActive = visibleUsersPool.filter((u) => u.isActive).length;
  const countInactive = visibleUsersPool.filter((u) => !u.isActive).length;
  const countAll = visibleUsersPool.length;

  const filteredUsers = visibleUsersPool.filter((u) => {
    if (statusFilter === 'ACTIVE' && !u.isActive) return false;
    if (statusFilter === 'INACTIVE' && u.isActive) return false;
    if (selectedRole !== 'ALL' && u.role !== selectedRole) return false;
    return true;
  });

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('BOOTH_ATTENDANT');
    setError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (u: UserItem) => {
    setEditingId(u.id);
    setName(u.name);
    setEmail(u.email);
    setPassword('');
    setRole(u.role);
    setError(null);
    setShowModal(true);
  };

  const handleToggleStatus = async (user: UserItem) => {
    if (currentUser && user.id === currentUser.id) {
      alert('Anda tidak dapat menonaktifkan akun yang sedang digunakan saat ini.');
      return;
    }

    const actionText = user.isActive ? 'menonaktifkan' : 'mengaktifkan kembali';
    if (!confirm(`Apakah Anda yakin ingin ${actionText} akun "${user.name}"?`)) {
      return;
    }

    setActionLoadingId(user.id);
    try {
      const res = await api.patch<UserItem>(`/users/${user.id}/toggle-status`, {});
      if (res.success && res.data) {
        const updated = res.data;
        setUserList((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
        setFeedback({
          type: 'success',
          message: `Akun "${user.name}" berhasil ${updated.isActive ? 'diaktifkan' : 'dinonaktifkan'}.`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: res.error?.message || 'Gagal mengubah status akun pengguna.',
        });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Gagal mengubah status akun pengguna.' });
    } finally {
      setActionLoadingId(null);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleDelete = async (user: UserItem) => {
    if (currentUser && user.id === currentUser.id) {
      alert('Anda tidak dapat menghapus akun yang sedang Anda gunakan.');
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus akun "${user.name}"?`)) {
      return;
    }

    setActionLoadingId(user.id);
    try {
      const res = await api.delete(`/users/${user.id}`);
      if (res.success) {
        setUserList((prev) => prev.filter((u) => u.id !== user.id));
        setFeedback({ type: 'success', message: `Akun "${user.name}" berhasil dihapus.` });
      } else {
        setFeedback({ type: 'error', message: res.error?.message || 'Gagal menghapus pengguna.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Gagal menghapus pengguna.' });
    } finally {
      setActionLoadingId(null);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama pengguna wajib diisi');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Email pengguna tidak valid');
      return;
    }
    if (!editingId && password.length < 6) {
      setError('Password minimal 6 karakter');
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        const payload: { name: string; email: string; role: 'ADMIN' | 'BOOTH_ATTENDANT' | 'PRODUCTION'; password?: string } = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
        };
        if (password.trim()) payload.password = password.trim();

        const res = await api.patch<UserItem>(`/users/${editingId}`, payload);
        if (res.success && res.data) {
          setUserList((prev) => prev.map((u) => (u.id === editingId ? res.data! : u)));
          setFeedback({ type: 'success', message: `Data akun "${name}" berhasil diperbarui.` });
          setName('');
          setEmail('');
          setPassword('');
          setEditingId(null);
          setShowModal(false);
          setError(null);
        } else {
          setError(res.error?.message || 'Gagal memperbarui pengguna');
        }
      } else {
        const res = await api.post<UserItem>('/users', {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
        });

        if (res.success && res.data) {
          setUserList((prev) => [res.data!, ...prev]);
          setFeedback({ type: 'success', message: `Akun pengguna "${name}" berhasil dibuat.` });
          setName('');
          setEmail('');
          setPassword('');
          setEditingId(null);
          setShowModal(false);
          setError(null);
        } else {
          setError(res.error?.message || 'Gagal membuat pengguna baru');
        }
      }
    } catch {
      setError('Gagal menyimpan data akun pengguna.');
    } finally {
      setLoading(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800">
            👑 Administrator
          </span>
        );
      case 'BOOTH_ATTENDANT':
        return (
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
            🏪 Staf Stand (Attendant)
          </span>
        );
      case 'PRODUCTION':
        return (
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            🍵 Staf Dapur Produksi
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-800">
            {role}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manajemen Pengguna & Hak Akses</h1>
          <p className="text-sm text-slate-500">
            Kelola akun staf, hak akses peran sistem, dan status aktif/non-aktif akun login langsung dari database
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            disabled={loading}
            title="Muat Ulang Data"
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
            Refresh
          </button>
          <button
            data-testid="add-user-btn"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 transition"
          >
            <UserPlus className="h-4 w-4" />
            + Tambah Pengguna Baru
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

      {/* Filter Controls (Status Tabs, Role Selector, and Secret Testing Toggle) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200">
          <button
            type="button"
            data-testid="filter-active-users"
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'ACTIVE'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50'
            }`}
          >
            <span>🟢 Aktif</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                statusFilter === 'ACTIVE' ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {countActive}
            </span>
          </button>
          <button
            type="button"
            data-testid="filter-all-users"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50'
            }`}
          >
            <span>Semua</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                statusFilter === 'ALL' ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {countAll}
            </span>
          </button>
          <button
            type="button"
            data-testid="filter-inactive-users"
            onClick={() => setStatusFilter('INACTIVE')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'INACTIVE'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-rose-800 hover:bg-rose-50'
            }`}
          >
            <span>🔴 Non-Aktif</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                statusFilter === 'INACTIVE' ? 'bg-rose-800 text-rose-100' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {countInactive}
            </span>
          </button>
        </div>

        {/* Role Filter & Secret Testing Toggle */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">Peran:</label>
            <select
              data-testid="user-role-filter"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-emerald-500 focus:outline-none"
            >
              <option value="ALL">Semua Peran</option>
              <option value="ADMIN">Administrator</option>
              <option value="BOOTH_ATTENDANT">Staf Stand (Attendant)</option>
              <option value="PRODUCTION">Staf Dapur Produksi</option>
            </select>
          </div>

          {/* Pencetan Tersembunyi / Discrete Toggle Akun Testing */}
          <button
            type="button"
            data-testid="toggle-test-users-btn"
            onClick={() => setShowTestUsers((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition cursor-pointer ${
              showTestUsers
                ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
            title={showTestUsers ? 'Sembunyikan akun testing' : 'Pencetan tersembunyi: Klik untuk menampilkan akun testing'}
          >
            {showTestUsers ? (
              <>
                <EyeOff className="h-3.5 w-3.5 text-amber-700" />
                <span>Sembunyikan Akun Testing ({testUsersCount})</span>
              </>
            ) : (
              <>
                <FlaskConical className="h-3.5 w-3.5 opacity-60" />
                <span className="opacity-70">🧪</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal Tambah / Edit Pengguna */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={handleSave} className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">
              {editingId ? 'Edit Akun Pengguna' : 'Tambah Akun Pengguna Baru'}
            </h2>

            {error && (
              <p data-testid="user-error" className="text-sm text-red-600 bg-red-50 p-2.5 rounded-md border border-red-200">
                {error}
              </p>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700">Nama Lengkap *</label>
              <input
                data-testid="user-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
                placeholder="misal: Budi Santoso"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Alamat Email (Login) *</label>
              <input
                data-testid="user-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
                placeholder="budi@tehbaling.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Password {editingId ? <span className="text-xs text-slate-400">(Biarkan kosong jika tidak diubah)</span> : '*'}
              </label>
              <input
                data-testid="user-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
                placeholder={editingId ? '••••••••' : 'Minimal 6 karakter'}
                required={!editingId}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Hak Akses / Peran *</label>
              <select
                data-testid="user-role-select"
                value={role}
                onChange={(e) => setRole(e.target.value as 'ADMIN' | 'BOOTH_ATTENDANT' | 'PRODUCTION')}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
              >
                <option value="BOOTH_ATTENDANT">Staf Stand (Booth Attendant)</option>
                <option value="PRODUCTION">Staf Dapur Produksi (Production Staff)</option>
                <option value="ADMIN">Administrator / Pemilik (Admin)</option>
              </select>
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
                data-testid="user-save-btn"
                disabled={loading}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {loading ? 'Menyimpan...' : editingId ? 'Update Pengguna' : 'Simpan Pengguna'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabel Users */}
      <div className="w-full max-w-full space-y-2">
        <div className="w-full max-w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="w-full max-w-full overflow-x-auto block">
            <table data-testid="users-table" className="w-full min-w-[700px] text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3 whitespace-nowrap">Nama Pengguna</th>
                  <th className="px-6 py-3 whitespace-nowrap">Email</th>
                  <th className="px-6 py-3 whitespace-nowrap">Peran / Hak Akses</th>
                  <th className="px-6 py-3 whitespace-nowrap">Status Akun</th>
                  <th className="px-6 py-3 text-right whitespace-nowrap">Aksi Manajemen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading && userList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
                        <span>Memuat data pengguna dari database...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      Tidak ada data pengguna yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelf = currentUser?.id === user.id;
                    const isActionLoading = actionLoadingId === user.id;

                    return (
                      <tr
                        key={user.id}
                        className={`hover:bg-slate-50 transition ${!user.isActive ? 'bg-slate-50/60 opacity-85' : ''}`}
                      >
                        <td className="px-6 py-4 font-semibold text-slate-900 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span>{user.name}</span>
                            {isSelf && (
                              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                Anda
                              </span>
                            )}
                            {isTestUser(user) && (
                              <span className="rounded bg-amber-100 border border-amber-300 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                                🧪 Testing
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-700 whitespace-nowrap">{user.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{getRoleBadge(user.role)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                              user.isActive
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}
                            ></span>
                            {user.isActive ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              title={
                                isSelf
                                  ? 'Anda tidak dapat menonaktifkan akun sendiri'
                                  : user.isActive
                                  ? 'Nonaktifkan akun pengguna ini (mencegah login)'
                                  : 'Aktifkan kembali akun pengguna ini'
                              }
                              disabled={isSelf || isActionLoading}
                              onClick={() => handleToggleStatus(user)}
                              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition shadow-xs disabled:opacity-40 disabled:cursor-not-allowed ${
                                user.isActive
                                  ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                                  : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                              }`}
                            >
                              <Power className={`h-3.5 w-3.5 ${isActionLoading ? 'animate-spin' : ''}`} />
                              {user.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                            </button>

                            <button
                              data-testid={`edit-user-btn-${user.id}`}
                              onClick={() => handleOpenEdit(user)}
                              className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition shadow-xs"
                            >
                              <Pencil className="h-3.5 w-3.5 text-slate-500" />
                              Edit
                            </button>

                            <button
                              data-testid={`delete-user-btn-${user.id}`}
                              disabled={isSelf || isActionLoading}
                              onClick={() => handleDelete(user)}
                              title={isSelf ? 'Anda tidak dapat menghapus akun sendiri' : 'Hapus akun pengguna'}
                              className="flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
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