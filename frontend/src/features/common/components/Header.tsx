import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import NotificationBell from '@/components/common/NotificationBell';

export const Header = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/calendar" className="text-xl font-bold text-blue-600">
              🏸 Smart Badminton
            </Link>
          </div>

          <nav className="hidden md:flex space-x-8">
            <Link to="/calendar" className="text-gray-700 hover:text-blue-600">
              Calendar
            </Link>
            <Link to="/bookings" className="text-gray-700 hover:text-blue-600">
              My Bookings
            </Link>
            <Link to="/dashboard" className="text-gray-700 hover:text-blue-600">
              Dashboard
            </Link>
            {user?.role === 'ADMIN' && (
              <Link to="/admin" className="text-gray-700 hover:text-blue-600">
                Admin
              </Link>
            )}
          </nav>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-700">
              {user?.name || user?.email}
            </span>
            <NotificationBell />
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
