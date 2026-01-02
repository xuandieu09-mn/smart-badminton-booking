import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import apiClient from '@/services/api/client';

export const LoginPage = () => {
  const [email, setEmail] = useState('customer1@test.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { access_token, user } = response.data;

      setAuth(user, access_token);

      // Redirect based on user role
      if (user.role === 'ADMIN') {
        navigate('/admin');
      } else if (user.role === 'STAFF') {
        navigate('/staff');
      } else {
        navigate('/calendar');
      }
    } catch (err: any) {
      // ✅ Cải thiện message lỗi rõ ràng hơn
      const errorMessage = err.response?.data?.message || err.message;
      
      if (err.response?.status === 401) {
        setError('❌ Email hoặc mật khẩu không chính xác. Vui lòng thử lại!');
      } else if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        setError('⏱️ Kết nối timeout. Vui lòng kiểm tra mạng và thử lại!');
      } else if (err.response?.status === 403) {
        setError('🔒 Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên!');
      } else {
        setError(`❌ Đăng nhập thất bại: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-center mb-6">Login</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md animate-shake">
          <div className="flex items-start">
            <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
            </svg>
            <div className="flex-1">
              <p className="font-semibold text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(''); // ✅ Clear error khi user gõ lại
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(''); // ✅ Clear error khi user gõ lại
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        Don't have an account?{' '}
        <Link to="/auth/register" className="text-blue-600 hover:underline">
          Register
        </Link>
      </p>

      {/* Quick Login Section */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-sm text-gray-600 mb-3 text-center font-semibold">
          🚀 Quick Login (Test)
        </p>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => {
              setEmail('yunodarknight0000@gmail.com');
              setPassword('ben10dieu');
            }}
            className="px-3 py-2 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 border border-green-200"
          >
            👤 Customer
          </button>
          <button
            type="button"
            onClick={() => {
              setEmail('staff@badminton.com');
              setPassword('Staff@123');
            }}
            className="px-3 py-2 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 border border-blue-200"
          >
            👨‍✈️ Staff
          </button>
          <button
            type="button"
            onClick={() => {
              setEmail('admin@badminton.com');
              setPassword('Admin@123');
            }}
            className="px-3 py-2 text-xs bg-purple-50 text-purple-700 rounded hover:bg-purple-100 border border-purple-200"
          >
            👨‍💼 Admin
          </button>
        </div>
      </div>
    </div>
  );
};
