import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import apiClient from '../../../services/api/client';

interface User {
  id: number;
  email: string;
  name: string | null;
  role: 'CUSTOMER' | 'STAFF' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
  wallet?: {
    balance: number;
  };
  _count?: {
    bookings: number;
  };
}

interface UserBooking {
  id: number;
  bookingCode: string;
  startTime: string;
  endTime: string;
  status: string;
  totalPrice: number;
  court: {
    name: string;
  };
}

const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBookingsModal, setShowBookingsModal] = useState(false);
  const [userBookings, setUserBookings] = useState<UserBooking[]>([]);
  const [editForm, setEditForm] = useState({ name: '', role: '', isActive: true });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, searchTerm, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/users/list');
      setUsers(data.users || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      alert('❌ Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = users;

    // Search by name or email
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.email.toLowerCase().includes(term) ||
          u.name?.toLowerCase().includes(term)
      );
    }

    // Filter by role
    if (roleFilter !== 'ALL') {
      filtered = filtered.filter((u) => u.role === roleFilter);
    }

    // Filter by status
    if (statusFilter !== 'ALL') {
      const isActive = statusFilter === 'ACTIVE';
      filtered = filtered.filter((u) => u.isActive === isActive);
    }

    setFilteredUsers(filtered);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name || '',
      role: user.role,
      isActive: user.isActive,
    });
    setShowEditModal(true);
  };

  const handleViewBookings = async (user: User) => {
    setSelectedUser(user);
    setShowBookingsModal(true);
    try {
      const { data } = await apiClient.get(`/bookings/user/${user.id}`);
      setUserBookings(data.bookings || []);
    } catch (error) {
      console.error('Failed to fetch user bookings:', error);
      setUserBookings([]);
    }
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;

    try {
      await apiClient.put(`/users/${selectedUser.id}`, editForm);
      alert('✅ Cập nhật người dùng thành công!');
      setShowEditModal(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Failed to update user:', error);
      alert('❌ Lỗi: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleToggleActive = async (user: User) => {
    const action = user.isActive ? 'vô hiệu hóa' : 'kích hoạt';
    if (!window.confirm(`Xác nhận ${action} tài khoản ${user.email}?`)) {
      return;
    }

    try {
      await apiClient.put(`/users/${user.id}`, { isActive: !user.isActive });
      alert(`✅ ${action} tài khoản thành công!`);
      fetchUsers();
    } catch (error: any) {
      console.error('Failed to toggle user status:', error);
      alert('❌ Lỗi: ' + (error.response?.data?.message || error.message));
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      CUSTOMER: '👤 Khách hàng',
      STAFF: '👔 Nhân viên',
      ADMIN: '👑 Admin',
    };
    return labels[role] || role;
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      CUSTOMER: 'bg-blue-100 text-blue-800',
      STAFF: 'bg-green-100 text-green-800',
      ADMIN: 'bg-purple-100 text-purple-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  // Calculate stats
  const stats = {
    total: users.length,
    customers: users.filter((u) => u.role === 'CUSTOMER').length,
    staff: users.filter((u) => u.role === 'STAFF').length,
    admins: users.filter((u) => u.role === 'ADMIN').length,
    active: users.filter((u) => u.isActive).length,
    inactive: users.filter((u) => !u.isActive).length,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            👥 Quản lý Người dùng
          </h1>
          <p className="text-gray-600">
            Quản lý tài khoản, phân quyền, và theo dõi hoạt động
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-4 text-white">
            <div className="text-2xl mb-1">📊</div>
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs opacity-90">Tổng</div>
          </div>

          <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl shadow-lg p-4 text-white">
            <div className="text-2xl mb-1">👤</div>
            <div className="text-2xl font-bold">{stats.customers}</div>
            <div className="text-xs opacity-90">Khách hàng</div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-4 text-white">
            <div className="text-2xl mb-1">👔</div>
            <div className="text-2xl font-bold">{stats.staff}</div>
            <div className="text-xs opacity-90">Nhân viên</div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-4 text-white">
            <div className="text-2xl mb-1">👑</div>
            <div className="text-2xl font-bold">{stats.admins}</div>
            <div className="text-xs opacity-90">Admin</div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg p-4 text-white">
            <div className="text-2xl mb-1">✅</div>
            <div className="text-2xl font-bold">{stats.active}</div>
            <div className="text-xs opacity-90">Hoạt động</div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-4 text-white">
            <div className="text-2xl mb-1">❌</div>
            <div className="text-2xl font-bold">{stats.inactive}</div>
            <div className="text-xs opacity-90">Khóa</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🔍 Tìm kiếm
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo email hoặc tên..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vai trò
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              >
                <option value="ALL">Tất cả</option>
                <option value="CUSTOMER">Khách hàng</option>
                <option value="STAFF">Nhân viên</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trạng thái
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              >
                <option value="ALL">Tất cả</option>
                <option value="ACTIVE">Hoạt động</option>
                <option value="INACTIVE">Đã khóa</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Người dùng
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Vai trò
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Ngày tạo
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      🔄 Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        #{user.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {user.name || 'Chưa cập nhật'}
                        </div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadge(user.role)}`}
                        >
                          {getRoleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(user.isActive)}`}
                        >
                          {user.isActive ? '✅ Hoạt động' : '❌ Đã khóa'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(user.createdAt), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="text-indigo-600 hover:text-indigo-900 transition"
                        >
                          ✏️ Sửa
                        </button>
                        <button
                          onClick={() => handleToggleActive(user)}
                          className={`${
                            user.isActive
                              ? 'text-red-600 hover:text-red-900'
                              : 'text-green-600 hover:text-green-900'
                          } transition`}
                        >
                          {user.isActive ? '🔒 Khóa' : '🔓 Mở'}
                        </button>
                        <button
                          onClick={() => handleViewBookings(user)}
                          className="text-blue-600 hover:text-blue-900 transition"
                        >
                          📅 Lịch sử
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      ❌ Không tìm thấy người dùng nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Modal */}
        {showEditModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                ✏️ Chỉnh sửa người dùng
              </h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="text"
                    value={selectedUser.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vai trò
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) =>
                      setEditForm({ ...editForm, role: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="CUSTOMER">👤 Khách hàng</option>
                    <option value="STAFF">👔 Nhân viên</option>
                    <option value="ADMIN">👑 Admin</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) =>
                      setEditForm({ ...editForm, isActive: e.target.checked })
                    }
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Tài khoản hoạt động
                  </label>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveUser}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  ✓ Lưu
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bookings Modal */}
        {showBookingsModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-6 max-h-[80vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                📅 Lịch sử booking - {selectedUser.name || selectedUser.email}
              </h2>

              {userBookings.length > 0 ? (
                <div className="space-y-3">
                  {userBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-900">
                            {booking.bookingCode} - {booking.court.name}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {format(new Date(booking.startTime), 'dd/MM/yyyy HH:mm')} -{' '}
                            {format(new Date(booking.endTime), 'HH:mm')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-900">
                            {formatCurrency(Number(booking.totalPrice))}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {booking.status}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Chưa có booking nào
                </div>
              )}

              <button
                onClick={() => setShowBookingsModal(false)}
                className="w-full mt-6 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsersPage;
