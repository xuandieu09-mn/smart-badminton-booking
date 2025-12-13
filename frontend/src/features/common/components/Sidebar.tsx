import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuthStore();

  const isActive = (path: string) => location.pathname === path;

  const links = [
    { path: '/calendar', label: 'Đặt sân', icon: '📅' },
    { path: '/my-bookings', label: 'Lịch của tôi', icon: '📋' },
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  ];

  if (user?.role === 'ADMIN') {
    links.push({ path: '/admin', label: 'Admin', icon: '⚙️' });
  }

  return (
    <aside className="w-64 bg-white border-r min-h-screen p-4">
      <nav className="space-y-2">
        {links.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`flex items-center space-x-3 px-4 py-3 rounded-md transition-colors ${
              isActive(link.path)
                ? 'bg-blue-50 text-blue-600 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="text-xl">{link.icon}</span>
            <span>{link.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
};