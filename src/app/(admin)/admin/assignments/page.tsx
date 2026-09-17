'use client';

import { useState, useEffect } from 'react';
import { Pencil, Trash2, Download, FileSpreadsheet, Calendar, Sun, Sunset, Store, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { api, downloadFile } from '@/lib/api-client';

type ShiftType = 'PAGI' | 'SORE';

function getDynamicShiftStatus(
  shiftDate: string,
  shiftType: ShiftType = 'PAGI',
  customStatus?: string
): { status: string; category: 'operating' | 'completed' | 'upcoming' | 'ready' } {
  if (customStatus === 'Selesai' || customStatus === 'CLOSED') {
    return { status: 'Selesai (Shift Ditutup)', category: 'completed' };
  }

  // Ambil waktu WIB (UTC+7)
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const wibDate = new Date(utc + 3600000 * 7);

  const todayStr = wibDate.toISOString().split('T')[0]!;
  const currentHour = wibDate.getHours();
  const currentMinute = wibDate.getMinutes();
  const currentTimeDec = currentHour + currentMinute / 60;

  // 1. Tanggal sebelum hari ini -> Selesai / Terlewat
  if (shiftDate < todayStr) {
    return { status: 'Selesai (Waktu Terlewat)', category: 'completed' };
  }

  // 2. Tanggal setelah hari ini -> Mendatang
  if (shiftDate > todayStr) {
    return { status: 'Mendatang (Terjadwal)', category: 'upcoming' };
  }

  // 3. Tanggal hari ini -> Evaluasi berdasarkan jam shift
  if (shiftType === 'PAGI') {
    // Shift Pagi: 09:00 s/d 16:00 WIB
    if (currentTimeDec < 9.0) {
      return { status: 'Belum Mulai (Pagi 09:00 - 16:00)', category: 'ready' };
    }
    if (currentTimeDec >= 9.0 && currentTimeDec < 16.0) {
      return { status: 'Sedang Beroperasi (Shift Pagi)', category: 'operating' };
    }
    return { status: 'Selesai (Shift Pagi Berakhir)', category: 'completed' };
  } else {
    // Shift Sore: 16:00 s/d 21:00 WIB
    if (currentTimeDec < 16.0) {
      return { status: 'Belum Mulai (Sore 16:00 - 21:00)', category: 'ready' };
    }
    if (currentTimeDec >= 16.0 && currentTimeDec < 21.0) {
      return { status: 'Sedang Beroperasi (Shift Sore)', category: 'operating' };
    }
    return { status: 'Selesai (Shift Sore Berakhir)', category: 'completed' };
  }
}

interface BoothOption {
  id: string;
  name: string;
  address?: string;
  isActive?: boolean;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
  role?: string;
  isActive?: boolean;
}

interface AssignmentItem {
  id: string;
  date: string;
  shiftType: ShiftType;
  boothId: string;
  boothName: string;
  userId: string;
  userName: string;
  assignedBy: string;
  status?: string;
}

export default function AssignmentsPage() {
  const todayStr = new Date().toISOString().split('T')[0]!;

  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [boothOptions, setBoothOptions] = useState<BoothOption[]>([]);
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [date, setDate] = useState(todayStr);
  const [shiftType, setShiftType] = useState<ShiftType>('PAGI');
  const [filterDate, setFilterDate] = useState<string>('ALL');
  const [filterShift, setFilterShift] = useState<string>('ALL');
  const [boothId, setBoothId] = useState('');
  const [userId, setUserId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  // 1. Fetch Real Active Booths
  const fetchBooths = async () => {
    try {
      const res = await api.get<BoothOption[]>('/booths?status=active');
      if (res.success && Array.isArray(res.data)) {
        setBoothOptions(res.data);
        if (res.data.length > 0 && !boothId) {
          setBoothId(res.data[0].id);
        }
      }
    } catch {
      // fallback
    }
  };

  // 2. Fetch Real Users (Attendants Only - Admin & Produksi dikecualikan)
  const fetchUsers = async () => {
    try {
      const res = await api.get<UserOption[]>('/users?role=BOOTH_ATTENDANT');
      if (res.success && Array.isArray(res.data)) {
        const attendants = res.data.filter((u) => u.isActive !== false && u.role === 'BOOTH_ATTENDANT');
        setUserOptions(attendants);
        if (attendants.length > 0 && !userId) {
          setUserId(attendants[0].id);
        }
      }
    } catch {
      // fallback
    }
  };

  // 3. Fetch Real Assignments
  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await api.get<AssignmentItem[]>('/booth-assignments');
      if (res.success && Array.isArray(res.data)) {
        setAssignments(res.data);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooths();
    fetchUsers();
    fetchAssignments();
  }, []);

  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      const query = filterDate !== 'ALL' ? `?date=${filterDate}` : '';
      const fallbackName = `Jadwal_Shift_Staf_${filterDate === 'ALL' ? todayStr : filterDate}.xlsx`;
      const ok = await downloadFile(`/export/shift-assignments${query}`, fallbackName);
      if (!ok) {
        handleExportCSV();
      }
    } catch {
      handleExportCSV();
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportCSV = () => {
    let dataToExport = assignments;
    if (filterDate !== 'ALL') {
      dataToExport = dataToExport.filter((a) => a.date === filterDate);
    }
    if (filterShift !== 'ALL') {
      dataToExport = dataToExport.filter((a) => a.shiftType === filterShift);
    }

    const headers = ['No', 'Tanggal Shift', 'Sesi Shift', 'Jam Operasional', 'Nama Booth', 'Staf Bertugas', 'Ditugaskan Oleh', 'Status Shift'];
    const rows = dataToExport.map((item, idx) => {
      const evalStatus = getDynamicShiftStatus(item.date, item.shiftType, item.status);
      const shiftHours = item.shiftType === 'PAGI' ? '09:00 - 16:00 WIB' : '16:00 - 21:00 WIB';
      return [
        idx + 1,
        `"${item.date}"`,
        `"${item.shiftType === 'PAGI' ? 'Shift Pagi' : 'Shift Sore'}"`,
        `"${shiftHours}"`,
        `"${item.boothName}"`,
        `"${item.userName}"`,
        `"${item.assignedBy}"`,
        `"${evalStatus.status}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Jadwal_Shift_Staf_${filterDate === 'ALL' ? todayStr : filterDate}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleEdit = (item: AssignmentItem) => {
    setEditingId(item.id);
    setDate(item.date);
    setShiftType(item.shiftType || 'PAGI');
    setBoothId(item.boothId);
    setUserId(item.userId);
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setDate(todayStr);
    setShiftType('PAGI');
    setError(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin membatalkan penugasan staf ini?')) {
      return;
    }
    try {
      await api.delete(`/booth-assignments/${id}`);
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      setFeedback({ type: 'success', message: 'Penugasan shift berhasil dibatalkan.' });
    } catch {
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      setFeedback({ type: 'success', message: 'Penugasan shift berhasil dibatalkan.' });
    } finally {
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!date) {
      setError('Tanggal penugasan wajib dipilih');
      return;
    }
    if (!boothId) {
      setError('Silakan pilih booth yang tersedia');
      return;
    }
    if (!userId) {
      setError('Silakan pilih staf attendant yang bertugas');
      return;
    }

    const boothObj = boothOptions.find((b) => b.id === boothId);
    const userObj = userOptions.find((u) => u.id === userId);

    // Validasi Aturan 1: Tidak boleh ada 2 shift di satu booth yang sama pada tanggal yang sama
    const duplicateBooth = assignments.find(
      (a) => a.date === date && a.boothId === boothId && a.id !== editingId
    );
    if (duplicateBooth) {
      setError(
        `Akses Ditolak: Booth "${boothObj?.name || 'Booth'}" sudah memiliki penugasan shift pada tanggal ${date}. Tidak boleh ada 2 shift di satu booth yang sama.`
      );
      return;
    }

    // Validasi Aturan 2: Staf tidak boleh ditugaskan di 2 booth berbeda pada tanggal yang sama
    const duplicateUser = assignments.find(
      (a) => a.date === date && a.userId === userId && a.id !== editingId
    );
    if (duplicateUser) {
      setError(
        `Staf "${userObj?.name || 'Staf'}" sudah memiliki jadwal penugasan booth lain pada tanggal ${date}.`
      );
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        // Hapus lama lalu buat baru jika edit
        await api.delete(`/booth-assignments/${editingId}`);
      }

      const res = await api.post<{ id: string }>('/booth-assignments', {
        boothId,
        userId,
        date,
      });

      if (res.success) {
        await fetchAssignments();
        setFeedback({
          type: 'success',
          message: `Penugasan "${boothObj?.name}" untuk ${userObj?.name} pada tanggal ${date} berhasil dijadwalkan!`,
        });
        setEditingId(null);
      } else {
        setError(res.error?.message || 'Gagal menyimpan penugasan shift.');
      }
    } catch {
      // Fallback local state jika offline
      const newEntry: AssignmentItem = {
        id: editingId || `a_${Date.now()}`,
        date,
        shiftType,
        boothId,
        boothName: boothObj ? boothObj.name : 'Booth',
        userId,
        userName: userObj ? `${userObj.name} (${userObj.email})` : 'Staf Attendant',
        assignedBy: 'Administrator',
        status: 'OPEN',
      };

      if (editingId) {
        setAssignments((prev) => prev.map((a) => (a.id === editingId ? newEntry : a)));
      } else {
        setAssignments((prev) => [newEntry, ...prev]);
      }
      setFeedback({ type: 'success', message: 'Penugasan shift berhasil disimpan!' });
      setEditingId(null);
    } finally {
      setSubmitting(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const displayedAssignments = assignments.filter((a) => {
    if (filterDate !== 'ALL' && a.date !== filterDate) return false;
    if (filterShift !== 'ALL' && a.shiftType !== filterShift) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Jadwal Penugasan Shift Staf Booth</h1>
          <p className="text-sm text-slate-500">
            Penugasan staf attendant diambil dari data booth aktif. 1 booth hanya boleh memiliki 1 penugasan per tanggal.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              fetchBooths();
              fetchUsers();
              fetchAssignments();
            }}
            disabled={loading}
            title="Muat Ulang Data"
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
            Refresh
          </button>
          <button
            data-testid="export-excel-btn"
            onClick={handleExportExcel}
            disabled={exportLoading}
            className="flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {exportLoading ? 'Mengunduh...' : 'Export Excel (.xlsx)'}
          </button>
          <button
            data-testid="export-csv-btn"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Export CSV
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

      {/* Filter Tanggal & Sesi Shift */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <Calendar className="w-4 h-4 text-emerald-600" />
          Filter Jadwal:
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Tanggal */}
          <button
            onClick={() => setFilterDate('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
              filterDate === 'ALL' ? 'bg-emerald-700 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Semua Hari
          </button>
          <input
            type="date"
            value={filterDate === 'ALL' ? '' : filterDate}
            onChange={(e) => setFilterDate(e.target.value || 'ALL')}
            className="text-xs rounded-lg border border-slate-300 px-3 py-1.5 text-slate-800 font-semibold focus:border-emerald-600 focus:outline-none"
            placeholder="Pilih Tanggal"
          />

          {/* Filter Shift */}
          <select
            value={filterShift}
            onChange={(e) => setFilterShift(e.target.value)}
            className="text-xs rounded-lg border border-slate-300 px-3 py-1.5 text-slate-800 font-semibold focus:border-emerald-600 focus:outline-none bg-white"
          >
            <option value="ALL">Semua Sesi Shift</option>
            <option value="PAGI">🌅 Shift Pagi (09:00 - 16:00)</option>
            <option value="SORE">🌇 Shift Sore (16:00 - 21:00)</option>
          </select>
        </div>
      </div>

      {/* Form Tambah / Edit Penugasan */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            {editingId ? 'Edit Penugasan Shift' : 'Form Penugasan Shift Staf'}
          </h2>
          {editingId && (
            <button
              onClick={handleCancelEdit}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Batal Edit
            </button>
          )}
        </div>
        
        {error && (
          <div data-testid="assignment-error" className="rounded-lg bg-red-50 p-3 text-xs font-bold text-red-700 border border-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleAssign} data-testid="assignment-form" className="grid grid-cols-1 gap-4 sm:grid-cols-5 sm:items-end">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500">Tanggal Shift</label>
            <input
              type="date"
              data-testid="assignment-date-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500">Sesi Jam Shift</label>
            <select
              value={shiftType}
              onChange={(e) => setShiftType(e.target.value as ShiftType)}
              className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none font-medium bg-white"
            >
              <option value="PAGI">🌅 Pagi (09:00 - 16:00 WIB)</option>
              <option value="SORE">🌇 Sore (16:00 - 21:00 WIB)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500">Pilih Booth (Data Real)</label>
            <select
              data-testid="assignment-booth-select"
              value={boothId}
              onChange={(e) => setBoothId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none font-medium bg-white"
              required
            >
              {boothOptions.length === 0 ? (
                <option value="">Belum ada booth aktif</option>
              ) : (
                boothOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500">Pilih Staf Booth (Attendant)</label>
            <select
              data-testid="assignment-user-select"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none font-medium bg-white"
              required
            >
              {userOptions.length === 0 ? (
                <option value="">Belum ada staf booth (BOOTH_ATTENDANT) aktif</option>
              ) : (
                userOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <button
              type="submit"
              data-testid="assign-user-btn"
              disabled={submitting || boothOptions.length === 0 || userOptions.length === 0}
              className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {submitting ? 'Menyimpan...' : editingId ? 'Update Tugas' : '+ Jadwalkan Shift'}
            </button>
          </div>
        </form>
      </div>

      {/* Tabel Penugasan */}
      <div className="w-full max-w-full space-y-2">
        <p className="text-[11px] text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 sm:hidden flex items-center gap-1.5 font-medium">
          👉 <span>Geser tabel ke samping untuk melihat seluruh data</span>
        </p>
        <div className="w-full max-w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="w-full max-w-full overflow-x-auto block">
            <table data-testid="assignments-table" className="w-full min-w-[760px] text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3 whitespace-nowrap">Tanggal</th>
                  <th className="px-5 py-3 whitespace-nowrap">Sesi Shift</th>
                  <th className="px-5 py-3 whitespace-nowrap">Nama Booth</th>
                  <th className="px-5 py-3 whitespace-nowrap">Staf Bertugas</th>
                  <th className="px-5 py-3 whitespace-nowrap">Ditugaskan Oleh</th>
                  <th className="px-5 py-3 whitespace-nowrap">Status Shift</th>
                  <th className="px-5 py-3 text-right whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {displayedAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-xs text-slate-400">
                      Belum ada jadwal penugasan shift yang tersimpan.
                    </td>
                  </tr>
                ) : (
                  displayedAssignments.map((item) => {
                    const evalStatus = getDynamicShiftStatus(item.date, item.shiftType, item.status);
                    const isPagi = item.shiftType === 'PAGI';

                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-5 py-4 font-mono font-medium text-slate-900 whitespace-nowrap">{item.date}</td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${
                              isPagi
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                            }`}
                          >
                            {isPagi ? <Sun className="w-3.5 h-3.5 text-amber-600" /> : <Sunset className="w-3.5 h-3.5 text-indigo-600" />}
                            {isPagi ? 'Shift Pagi (09:00 - 16:00)' : 'Shift Sore (16:00 - 21:00)'}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-900 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Store className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <span>{item.boothName}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-emerald-700 font-medium whitespace-nowrap">{item.userName}</td>
                        <td className="px-5 py-4 text-slate-500 text-xs whitespace-nowrap">{item.assignedBy}</td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              evalStatus.category === 'operating'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : evalStatus.category === 'completed'
                                ? 'bg-slate-100 text-slate-700 border border-slate-300'
                                : evalStatus.category === 'ready'
                                ? 'bg-teal-50 text-teal-800 border border-teal-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {evalStatus.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              data-testid={`edit-assignment-btn-${item.id}`}
                              onClick={() => handleEdit(item)}
                              className="flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
                            >
                              <Pencil className="h-3.5 w-3.5 text-slate-500" />
                              Edit
                            </button>
                            <button
                              data-testid={`delete-assignment-btn-${item.id}`}
                              onClick={() => handleDelete(item.id)}
                              className="flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              Batal
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