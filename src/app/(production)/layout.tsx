'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flame, History, LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

const productionNavItems = [
  { label: 'Input Masak Teh', href: '/production', icon: Flame },
  { label: 'Riwayat Dapur', href: '/production/history', icon: History },
];

export default function ProductionLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    window.location.replace('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col pb-20">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-amber-900 text-white shadow-md px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-600 flex items-center justify-center font-bold text-white shadow-sm text-lg">
            🔥
          </div>
          <div>
            <h1 className="font-bold text-sm text-white leading-tight">Dapur Produksi Teh Baling</h1>
            <p className="text-[11px] text-amber-200 font-medium">Staf Produksi / Tim Dapur</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-white">{user?.name || 'Joko Produksi'}</p>
            <p className="text-[10px] text-amber-300 font-mono">PRODUCTION</p>
          </div>
          <button
            onClick={handleLogout}
            title="Keluar"
            className="p-2 rounded-lg bg-amber-950 text-amber-200 hover:text-white hover:bg-amber-800 transition"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Viewport Container */}
      <main className="flex-1 p-4 max-w-lg mx-auto w-full">{children}</main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg px-2 py-2 flex justify-around items-center">
        {productionNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-1 px-4 rounded-lg text-xs font-medium transition ${
                isActive
                  ? 'text-amber-700 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className={`h-5 w-5 mb-0.5 ${isActive ? 'text-amber-700 stroke-[2.5]' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
