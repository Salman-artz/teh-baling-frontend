'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Layers,
  Coffee,
  CupSoda,
  Store,
  CalendarDays,
  Flame,
  Truck,
  FileSpreadsheet,
  Users,
  LogOut,
  Menu,
  X,
  User,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Series Teh', href: '/admin/series', icon: Layers },
  { label: 'Produk Teh', href: '/admin/products', icon: Coffee },
  { label: 'Cup & Mapping', href: '/admin/cups', icon: CupSoda },
  { label: 'Data Booth', href: '/admin/booths', icon: Store },
  { label: 'Jadwal Shift', href: '/admin/assignments', icon: CalendarDays },
  { label: 'Laporan Produksi', href: '/admin/production', icon: Flame },
  { label: 'Laporan Pengiriman', href: '/admin/deliveries', icon: Truck },
  { label: 'Ringkasan & Export', href: '/admin/summary', icon: FileSpreadsheet },
  { label: 'User Management', href: '/admin/users', icon: Users },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    window.location.replace('/login');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:pl-64 text-slate-900 max-w-full overflow-x-hidden">
      {/* Sidebar for Desktop (Fixed) */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-slate-900 text-white border-r border-slate-800 shadow-xl z-30">
        {/* Brand Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-emerald-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-md">
              🍵
            </div>
            <div>
              <h1 className="font-bold text-base leading-none text-white">Teh Baling</h1>
              <span className="text-[11px] font-semibold text-emerald-400 tracking-wider uppercase">Admin Portal</span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer User Info */}
        <div className="p-4 border-t border-slate-800 bg-slate-950">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-emerald-900 border border-emerald-700 flex items-center justify-center text-emerald-300 font-bold text-xs">
                {user?.name?.[0] || 'A'}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">{user?.name || 'Pak Budi (Owner)'}</p>
                <p className="text-[10px] text-emerald-400 font-medium">{user?.email || 'admin@tehbaling.com'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Keluar"
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <h2 className="text-lg font-bold text-slate-900 hidden sm:block">
              {navItems.find((n) => n.href === pathname)?.label || 'Admin Panel'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              System Active
            </span>

            <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                <User className="w-4 h-4" />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-slate-900">{user?.name || 'Pak Budi (Owner)'}</p>
                <p className="text-[10px] text-slate-500 font-semibold">ADMINISTRATOR</p>
              </div>
              <button
                onClick={handleLogout}
                className="ml-2 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                Keluar
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs flex">
            <div className="w-64 bg-slate-900 text-white flex flex-col h-full shadow-2xl">
              <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-emerald-950">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white">
                    🍵
                  </div>
                  <span className="font-bold text-sm">Teh Baling Admin</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium ${
                        isActive
                          ? 'bg-emerald-600 text-white font-semibold'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-slate-800 bg-slate-950">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm font-semibold text-red-400 bg-slate-900 rounded-lg border border-slate-800"
                >
                  <LogOut className="w-4 h-4" />
                  Keluar
                </button>
              </div>
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)}></div>
          </div>
        )}

        {/* Page Content Viewport */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto min-w-0 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
