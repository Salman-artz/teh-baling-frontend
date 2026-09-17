'use client';

import { useState } from 'react';
import { Pencil, Trash2, Download, FileSpreadsheet, Calendar } from 'lucide-react';
import { downloadFile } from '@/lib/api-client';

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState([
    {
      id: 'a1',
      date: '2026-09-16',
      boothId: 'b1111111-1111-1111-1111-111111111111',
      boothName: 'Booth Alun-Alun Kota',
      userId: 'u2',
      userName: 'Rina Attendant (rina@tehbaling.com)',
      assignedBy: 'Pak Budi (Owner)',
      status: 'Sedang Beroperasi',
    },
    {
      id: 'a2',
      date: '2026-09-16',
      boothId: 'b2222222-2222-2222-2222-222222222222',
      boothName: 'Booth Kampus UNESA',
      userId: 'u3',
      userName: 'Siti Attendant (siti@tehbaling.com)',
      assignedBy: 'Pak Budi (Owner)',
      status: 'Sedang Beroperasi',
    },
  ]);

  const [date, setDate] = useState('2026-09-16');
  const [filterDate, setFilterDate] = useState<string>('ALL');
  const [boothId, setBoothId] = useState('b1111111-1111-1111-1111-111111111111');
  const [userId, setUserId] = useState('u2');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  const boothOptions = [
    { id: 'b1111111-1111-1111-1111-111111111111', name: 'Booth Alun-Alun Kota' },
    { id: 'b2222222-2222-2222-2222-222222222222', name: 'Booth Kampus UNESA' },
    { id: 'b3333333-3333-3333-3333-333333333333', name: 'Booth Stasiun Gubeng' },
  ];

  const userOptions = [
    { id: 'u2', name: 'Rina Attendant (rina@tehbaling.com)' },
    { id: 'u3', name: 'Siti Attendant (siti@tehbaling.com)' },
  ];

  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      const query = filterDate !== 'ALL' ? `?date=${filterDate}` : '';
      const fallbackName = `Jadwal_Shift_Staf_${filterDate === 'ALL' ? new Date().toISOString().split('T')[0] : filterDate}.xlsx`;
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
    const dataToExport = filterDate === 'ALL' ? assignments : assignments.filter((a) => a.date === filterDate);
    const headers = ['No', 'Tanggal Shift', 'Nama Booth', 'Staf Bertugas', 'Ditugaskan Oleh', 'Status Shift'];
    const rows = dataToExport.map((item, idx) => [
      idx + 1,
      `"${item.date}"`,
      `"${item.boothName}"`,
      `"${item.userName}"`,
      `"${item.assignedBy}"`,
      `"${item.status}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Jadwal_Shift_Staf_${filterDate === 'ALL' ? new Date().toISOString().split('T')[0] : filterDate}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleEdit = (item: (typeof assignments)[0]) => {
    setEditingId(item.id);
    setDate(item.date);
    setBoothId(item.boothId);
    setUserId(item.userId);
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setDate('2026-09-16');
    setError(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Apakah Anda yakin ingin membatalkan penugasan staf ini?')) {
      setAssignments((prev) => prev.filter((a) => a.id !== id));
    }
  };

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      setError('Tanggal penugasan wajib dipilih');
      return;
    }
    const boothObj = boothOptions.find((b) => b.id === boothId);
    const userObj = userOptions.find((u) => u.id === userId);

    if (editingId) {
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === editingId
            ? {
                ...a,
                date,
                boothId,
                boothName: boothObj ? boothObj.name : a.boothName,
                userId,
                userName: userObj ? userObj.name : a.userName,
              }
            : a
        )
      );
      setEditingId(null);
    } else {
      setAssignments((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          date,
          boothId,
          boothName: boothObj ? boothObj.name : 'Booth',
          userId,
          userName: userObj ? userObj.name : 'Staf',
          assignedBy: 'Pak Budi (Owner)',
          status: 'Belum Mulai',
        },
      ]);
    }
    setError(null);
  };

  const displayedAssignments = filterDate === 'ALL' ? assignments : assignments.filter((a) => a.date === filterDate);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Jadwal Penugasan Staf Booth</h1>
          <p className="text-sm text-slate-500">Tugaskan dan export rekap penjaga booth (attendant) harian</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            data-testid="export-excel-btn"
            onClick={handleExportExcel}
            disabled={exportLoading}
            className="flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50 transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {exportLoading ? 'Mengunduh...' : 'Export Excel (.xlsx)'}
          </button>
          <button
            data-testid="export-csv-btn"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter Tanggal Penugasan */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <Calendar className="w-4 h-4 text-emerald-600" />
          Filter Jadwal Berdasarkan Hari:
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterDate('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
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
        </div>
      </div>

      {/* Form Tambah / Edit Penugasan */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            {editingId ? 'Edit Penugasan Staf' : 'Form Penugasan Harian'}
          </h2>
          {editingId && (
            <button
              onClick={handleCancelEdit}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Batal Edit
            </button>
          )}
        </div>
        
        {error && <p data-testid="assignment-error" className="text-sm text-red-600">{error}</p>}

        <form onSubmit={handleAssign} data-testid="assignment-form" className="grid grid-cols-1 gap-4 sm:grid-cols-4 sm:items-end">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500">Tanggal Penugasan</label>
            <input
              type="date"
              data-testid="assignment-date-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500">Pilih Booth</label>
            <select
              data-testid="assignment-booth-select"
              value={boothId}
              onChange={(e) => setBoothId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
            >
              {boothOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500">Pilih Staf Stand</label>
            <select
              data-testid="assignment-user-select"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
            >
              {userOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <button
              type="submit"
              data-testid="assign-user-btn"
              className="w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 transition"
            >
              {editingId ? 'Update Tugas' : '+ Tugaskan Staf'}
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
            <table data-testid="assignments-table" className="w-full min-w-[700px] text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3 whitespace-nowrap">Tanggal</th>
                  <th className="px-6 py-3 whitespace-nowrap">Nama Booth</th>
                  <th className="px-6 py-3 whitespace-nowrap">Staf Bertugas</th>
                  <th className="px-6 py-3 whitespace-nowrap">Ditugaskan Oleh</th>
                  <th className="px-6 py-3 whitespace-nowrap">Status Shift</th>
                  <th className="px-6 py-3 text-right whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {displayedAssignments.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono font-medium text-slate-900 whitespace-nowrap">{item.date}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900 whitespace-nowrap">{item.boothName}</td>
                    <td className="px-6 py-4 text-emerald-700 font-medium whitespace-nowrap">{item.userName}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs whitespace-nowrap">{item.assignedBy}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          item.status === 'Sedang Beroperasi'
                            ? 'bg-blue-100 text-blue-800'
                            : item.status === 'Selesai'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          data-testid={`edit-assignment-btn-${item.id}`}
                          onClick={() => handleEdit(item)}
                          className="flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          <Pencil className="h-3.5 w-3.5 text-slate-500" />
                          Edit
                        </button>
                        <button
                          data-testid={`delete-assignment-btn-${item.id}`}
                          onClick={() => handleDelete(item.id)}
                          className="flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          Batal
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