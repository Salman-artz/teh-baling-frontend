'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { LogOut, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { user, accessToken, setAuth, logout } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getDashboardUrl = (role?: string) => {
    if (role === 'BOOTH_ATTENDANT') return '/attendant';
    if (role === 'PRODUCTION') return '/production';
    return '/admin';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    try {
      const res = await api.post<{
        accessToken: string;
        refreshToken?: string;
        user: { id: string; name: string; email: string; role: 'ADMIN' | 'BOOTH_ATTENDANT' | 'PRODUCTION' };
      }>('/auth/login', { email: cleanEmail, password });

      if (res.success && res.data) {
        setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
        window.location.href = getDashboardUrl(res.data.user.role);
      } else {
        setError(res.error?.message || 'Email atau password salah. Cek kembali kredensial Anda.');
      }
    } catch {
      setError('Terjadi kesalahan jaringan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleForceLogout = () => {
    logout();
    setEmail('');
    setPassword('');
    setError(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Teh Baling Admin</h1>
          <p className="mt-1 text-sm text-slate-500">Masukkan email dan password akun Anda</p>
        </div>

        {/* Active Session Warning Banner */}
        {user && accessToken && (
          <div className="rounded-lg bg-emerald-50 p-4 border border-emerald-200 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Sesi Anda Masih Aktif ({user.name})</span>
            </div>
            <p className="text-xs text-emerald-700">
              Anda telah masuk sebagai <strong>{user.email}</strong> [{user.role}].
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => router.push(getDashboardUrl(user.role))}
                className="flex-1 rounded-lg bg-emerald-700 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition flex items-center justify-center gap-1"
              >
                Ke Dashboard <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleForceLogout}
                className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 transition flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" /> Paksa Logout
              </button>
            </div>
          </div>
        )}

        {error && (
          <div data-testid="login-error" className="rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-800">Email</label>
            <input
              type="email"
              data-testid="email-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`mt-1.5 block w-full rounded-lg px-3.5 py-2.5 text-sm transition-all duration-200 focus:outline-none focus:ring-2 ${
                email
                  ? 'border-2 border-emerald-800 bg-slate-100 text-slate-950 font-bold shadow-xs focus:border-emerald-900 focus:ring-emerald-800/30 focus:bg-white'
                  : 'border border-slate-300 bg-slate-50 text-slate-900 focus:border-emerald-700 focus:ring-emerald-700/20 focus:bg-white'
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800">Password</label>
            <input
              type="password"
              data-testid="password-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={`mt-1.5 block w-full rounded-lg px-3.5 py-2.5 text-sm transition-all duration-200 focus:outline-none focus:ring-2 ${
                password
                  ? 'border-2 border-emerald-800 bg-slate-100 text-slate-950 font-bold shadow-xs focus:border-emerald-900 focus:ring-emerald-800/30 focus:bg-white'
                  : 'border border-slate-300 bg-slate-50 text-slate-900 focus:border-emerald-700 focus:ring-emerald-700/20 focus:bg-white'
              }`}
            />
          </div>

          <button
            type="submit"
            data-testid="login-submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-700 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}