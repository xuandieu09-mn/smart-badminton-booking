import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import NotificationBell from '../components/common/NotificationBell';
import { cn } from '../lib/utils';

/**
 * 👑 Admin Layout
 *
 * Phong cách: Analytical & Control
 * - Full Sidebar với nhiều cấp menu
 * - Tập trung vào báo cáo và cấu hình hệ thống
 * - Nhiều không gian cho charts & stats
 */
const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  // Multi-level Menu Structure
  const menuGroups = [
    {
      title: 'Tổng quan',
      items: [{ label: 'Dashboard', icon: '📊', path: '/admin' }],
    },
    {
      title: 'Quản lý',
      items: [
        { label: 'Đặt sân', icon: '🏸', path: '/admin/bookings' },
        { label: 'Sân cầu lông', icon: '🏟️', path: '/admin/courts' },
        { label: 'Thanh toán', icon: '💳', path: '/admin/payments' },
        { label: 'Người dùng', icon: '👥', path: '/admin/users' },
      ],
    },
    {
      title: 'Kho & Bán hàng',
      items: [{ label: 'Quản lý kho', icon: '📦', path: '/admin/inventory' }],
    },
    {
      title: 'Báo cáo',
      items: [{ label: 'Thống kê', icon: '📈', path: '/admin/reports' }],
    },
  ];

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-white overflow-hidden" data-layout="admin">
      {/* ==================== FULL SIDEBAR (Premium Dark) ==================== */}
      <aside
        className={cn(
          'bg-gradient-to-b from-indigo-950 via-indigo-900 to-slate-900 text-white flex flex-col transition-all duration-500 ease-out relative shadow-2xl',
          sidebarOpen ? 'w-64' : 'w-20'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20">
              <span className="text-2xl">🏸</span>
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="font-bold text-lg tracking-tight">SmartBooking</h1>
                <p className="text-xs text-indigo-300/80">Admin Panel</p>
              </div>
            )}
          </div>
        </div>

        {/* Menu - Full with Groups */}
        <nav className="flex-1 py-4 px-3 space-y-6 overflow-y-auto scrollbar-hide">
          {menuGroups.map((group) => (
            <div key={group.title}>
              {sidebarOpen && (
                <h3 className="px-3 mb-2 text-[10px] font-bold text-indigo-400/70 uppercase tracking-widest">
                  {group.title}
                </h3>
              )}
              <div className="space-y-1">
                {group.items.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    title={!sidebarOpen ? item.label : undefined}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300',
                      isActive(item.path)
                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                        : 'text-indigo-200/80 hover:bg-white/10 hover:text-white',
                      !sidebarOpen && 'justify-center px-0'
                    )}
                  >
                    <span className="text-lg flex-shrink-0">{item.icon}</span>
                    {sidebarOpen && (
                      <span className="text-sm font-medium tracking-wide">{item.label}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-white/10">
          <div
            className={cn(
              'flex items-center gap-3 mb-3',
              !sidebarOpen && 'justify-center'
            )}
          >
            <div className="w-10 h-10 bg-indigo-700 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-lg">👤</span>
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name || 'Admin'}</p>
                <p className="text-xs text-indigo-300">Quản trị viên</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            <span>🚪</span>
            {sidebarOpen && <span className="text-sm">Đăng xuất</span>}
          </button>
        </div>

        {/* Toggle Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-20 w-7 h-7 bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/40 hover:shadow-xl hover:scale-110 transition-all duration-300 z-10"
        >
          <span className="text-white text-xs">{sidebarOpen ? '◀' : '▶'}</span>
        </button>
      </aside>

      {/* ==================== MAIN AREA ==================== */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar (Glassmorphism) */}
        <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 flex items-center justify-between px-6 flex-shrink-0 shadow-soft">
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              {menuGroups.flatMap((g) => g.items).find((item) => isActive(item.path))
                ?.label || 'Admin'}
            </h1>
            <p className="text-sm text-slate-500">
              {new Date().toLocaleDateString('vi-VN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Global Search (Premium) */}
            <div className="hidden lg:block">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  className="w-64 pl-10 pr-4 py-2.5 bg-slate-50/80 border border-slate-200/60 rounded-xl text-sm focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none focus:bg-white transition-all duration-300"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            <NotificationBell />

            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <span>⚙️</span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
