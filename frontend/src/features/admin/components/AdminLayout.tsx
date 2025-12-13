import React, { useState } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';

const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  const menuItems = [
    { label: 'Dashboard', icon: '📊', path: '/admin' },
    { label: 'Đặt sân', icon: '🏸', path: '/admin/bookings' },
    { label: 'Sân cầu lông', icon: '🏟️', path: '/admin/courts' },
    { label: 'Thanh toán', icon: '💳', path: '/admin/payments' },
    { label: 'Người dùng', icon: '👥', path: '/admin/users' },
    { label: 'Báo cáo', icon: '📈', path: '/admin/reports' },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-indigo-900 text-white transition-all duration-300 ease-in-out flex flex-col`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-indigo-800">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">🏸</div>
            {sidebarOpen && <span className="font-bold text-lg">SmartBooking</span>}
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 px-3 py-6 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive(item.path)
                  ? 'bg-indigo-700 text-white font-semibold'
                  : 'hover:bg-indigo-800'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* User Section */}
        <div className="p-6 border-t border-indigo-800">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-indigo-800 rounded-full flex items-center justify-center">
              <span className="text-lg">👤</span>
            </div>
            {sidebarOpen && (
              <div className="text-sm">
                <p className="font-medium">{user?.fullName || user?.name || 'Admin'}</p>
                <p className="text-indigo-300 text-xs">Quản trị viên</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors"
          >
            {sidebarOpen ? '🚪 Đăng xuất' : '🚪'}
          </button>
        </div>

        {/* Toggle Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-24 bg-indigo-900 border border-indigo-800 rounded-full p-1 hover:bg-indigo-800"
        >
          <span className="text-white">{sidebarOpen ? '◀' : '▶'}</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="text-xl">☰</span>
            </button>
            <div>
              <h2 className="text-sm font-medium text-gray-600">Chào mừng bạn trở lại!</h2>
              <p className="text-xs text-gray-500">{new Date().toLocaleDateString('vi-VN')}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button className="p-2 hover:bg-gray-100 rounded-lg">🔔</button>
            <button className="p-2 hover:bg-gray-100 rounded-lg">⚙️</button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
