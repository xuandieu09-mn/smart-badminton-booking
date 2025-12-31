import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import NotificationBell from '../components/common/NotificationBell';
import { ChatWidget } from '../components/chat';
import { cn } from '../lib/utils';

/**
 * 🛒 Customer Layout
 * 
 * Phong cách: Modern B2C & Visual
 * - Top Navbar navigation
 * - Thoáng, nhiều khoảng trắng
 * - Tập trung vào trải nghiệm người dùng
 */
const CustomerLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Đặt sân', path: '/calendar', icon: '📅' },
    { label: 'Đặt lịch cố định', path: '/fixed-booking', icon: '📆' },
    { label: 'Lịch của tôi', path: '/my-bookings', icon: '📋' },
    { label: 'Ví tiền', path: '/dashboard', icon: '💰' },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100/50" data-layout="customer">
      {/* ==================== TOP NAVBAR (Glassmorphism) ==================== */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/calendar" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-xl group-hover:shadow-blue-500/40 transition-all duration-300 group-hover:-translate-y-0.5">
                <span className="text-white text-xl">🏸</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">SmartBooking</h1>
                <p className="text-xs text-slate-500">Đặt sân cầu lông</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300',
                    isActive(item.path)
                      ? 'bg-gradient-to-r from-blue-500/10 to-indigo-500/10 text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                  )}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Right Section */}
            <div className="flex items-center gap-3">
              <NotificationBell />

              {/* User Menu */}
              <div className="relative group">
                <button className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100/80 transition-all duration-300">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-md shadow-blue-500/20">
                    {user?.name?.charAt(0) || user?.email?.charAt(0) || '?'}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-slate-700 max-w-[120px] truncate">
                    {user?.name || user?.email}
                  </span>
                  <svg
                    className="w-4 h-4 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Dropdown (Glassmorphism) */}
                <div className="absolute right-0 mt-2 w-56 bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/60 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 animate-fadeIn">
                  <div className="p-4 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-900">
                      {user?.name || 'Người dùng'}
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{user?.email}</p>
                  </div>
                  <div className="p-2">
                    <Link
                      to="/settings"
                      className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100/80 rounded-xl transition-all duration-200"
                    >
                      <span>⚙️</span> Cài đặt
                    </Link>
                    <Link
                      to="/transaction-history"
                      className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100/80 rounded-xl transition-all duration-200"
                    >
                      <span>📜</span> Lịch sử giao dịch
                    </Link>
                    <hr className="my-2 border-slate-100" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
                    >
                      <span>🚪</span> Đăng xuất
                    </button>
                  </div>
                </div>
              </div>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={mobileMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-200">
              <nav className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'px-4 py-3 rounded-lg text-sm font-medium',
                      isActive(item.path)
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* ==================== MAIN CONTENT ==================== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* ==================== FOOTER (Glassmorphism) ==================== */}
      <footer className="bg-white/70 backdrop-blur-lg border-t border-slate-200/60 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-500">
              © 2025 SmartBooking. Đặt sân cầu lông thông minh.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-sm text-slate-500 hover:text-blue-600 transition-colors duration-200">
                Hỗ trợ
              </a>
              <a href="#" className="text-sm text-slate-500 hover:text-blue-600 transition-colors duration-200">
                Điều khoản
              </a>
              <a href="#" className="text-sm text-slate-500 hover:text-blue-600 transition-colors duration-200">
                Liên hệ
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* 🤖 AI Chat Assistant */}
      <ChatWidget />
    </div>
  );
};

export default CustomerLayout;
