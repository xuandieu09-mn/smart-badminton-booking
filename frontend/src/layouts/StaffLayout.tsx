import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import NotificationBell from '../components/common/NotificationBell';
import { cn } from '../lib/utils';

/**
 * 👨‍💼 Staff Layout
 *
 * Phong cách: Operational & High Density
 * - Compact Sidebar (có thể thu gọn)
 * - Tối đa hóa diện tích làm việc
 * - Tập trung vào tốc độ thao tác (POS, Check-in)
 */
const StaffLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const menuItems = [
    { label: 'Dashboard', icon: '📊', path: '/staff', badge: null },
    { label: 'Check-in', icon: '✅', path: '/staff/checkin', badge: null },
    { label: 'Trạng thái sân', icon: '🏟️', path: '/staff/courts', badge: null },
    { label: 'POS Bán hàng', icon: '🛒', path: '/staff/pos', badge: null },
  ];

  const isActive = (path: string) => {
    if (path === '/staff') return location.pathname === '/staff';
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-white overflow-hidden" data-layout="staff">
      {/* ==================== COMPACT SIDEBAR (Premium Dark) ==================== */}
      <aside
        className={cn(
          'bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col transition-all duration-500 ease-out relative shadow-2xl',
          sidebarCollapsed ? 'w-16' : 'w-56'
        )}
      >
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-3 border-b border-white/10">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <span className="text-xl">🏸</span>
              <span className="font-bold text-sm tracking-tight">Staff Portal</span>
            </div>
          )}
          {sidebarCollapsed && <span className="text-xl mx-auto">🏸</span>}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={cn(
              'p-1.5 hover:bg-white/10 rounded-xl transition-all duration-300',
              sidebarCollapsed && 'absolute -right-3 top-4 bg-slate-700 shadow-lg shadow-slate-500/30'
            )}
          >
            {sidebarCollapsed ? '▶' : '◀'}
          </button>
        </div>

        {/* Menu - Compact Style */}
        <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto scrollbar-hide">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              title={sidebarCollapsed ? item.label : undefined}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300',
                isActive(item.path)
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30'
                  : 'text-slate-300/80 hover:bg-white/10 hover:text-white',
                sidebarCollapsed && 'justify-center px-0'
              )}
            >
              <span className="text-lg flex-shrink-0">{item.icon}</span>
              {!sidebarCollapsed && (
                <span className="text-sm font-medium tracking-wide truncate">{item.label}</span>
              )}
              {item.badge && !sidebarCollapsed && (
                <span className="ml-auto bg-gradient-to-r from-red-500 to-rose-500 text-white text-xs px-2 py-0.5 rounded-full shadow-sm">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* User Section - Compact */}
        <div className="p-2 border-t border-white/10">
          {!sidebarCollapsed && (
            <div className="px-3 py-2 mb-2">
              <p className="text-sm font-medium text-white truncate">
                {user?.name || user?.email}
              </p>
              <p className="text-xs text-slate-400/80">Nhân viên</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            title={sidebarCollapsed ? 'Đăng xuất' : undefined}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-300',
              sidebarCollapsed && 'px-0'
            )}
          >
            <span>🚪</span>
            {!sidebarCollapsed && <span className="text-sm">Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* ==================== MAIN AREA ==================== */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar - Compact (Glassmorphism) */}
        <header className="h-14 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 flex items-center justify-between px-4 flex-shrink-0 shadow-soft">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              {menuItems.find((item) => isActive(item.path))?.label || 'Staff'}
            </h1>
            <span className="text-xs text-slate-500 bg-slate-100/80 px-2.5 py-1 rounded-lg hidden sm:inline">
              {new Date().toLocaleDateString('vi-VN', {
                weekday: 'long',
                day: 'numeric',
                month: 'numeric',
              })}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Actions (Gradient Button) */}
            <button
              onClick={() => navigate('/staff/checkin')}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-400 hover:to-emerald-500 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all duration-300 text-sm font-semibold"
            >
              <span>✅</span> Check-in
            </button>
            <NotificationBell />
          </div>
        </header>

        {/* Content - High Density */}
        <main className="flex-1 overflow-auto p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default StaffLayout;
