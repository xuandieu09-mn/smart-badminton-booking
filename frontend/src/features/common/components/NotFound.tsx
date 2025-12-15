import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { useEffect, useState } from 'react';

export const NotFound = () => {
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  // Determine redirect path based on user role
  const getRedirectPath = () => {
    if (!isAuthenticated) return '/auth/login';
    if (user?.role === 'ADMIN') return '/admin';
    if (user?.role === 'STAFF') return '/staff';
    return '/calendar';
  };

  const redirectPath = getRedirectPath();

  // Auto redirect after 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          navigate(redirectPath);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate, redirectPath]);

  const getRoleName = () => {
    if (!isAuthenticated) return 'Login';
    if (user?.role === 'ADMIN') return 'Admin Dashboard';
    if (user?.role === 'STAFF') return 'Staff Dashboard';
    return 'Calendar';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center max-w-md">
        <div className="text-8xl mb-4">🏸</div>
        <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-4">Trang không tồn tại</p>
        <p className="text-gray-500 mb-8">
          Đường dẫn bạn đang tìm không có trong hệ thống
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-800 text-sm">
            Tự động chuyển về <strong>{getRoleName()}</strong> sau{' '}
            <strong>{countdown}</strong> giây...
          </p>
        </div>

        <div className="flex gap-3 justify-center">
          <Link
            to={redirectPath}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Về {getRoleName()}
          </Link>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Quay lại
          </button>
        </div>

        {isAuthenticated && (
          <p className="text-xs text-gray-500 mt-4">
            Đang đăng nhập với vai trò: <strong>{user?.role}</strong>
          </p>
        )}
      </div>
    </div>
  );
};
