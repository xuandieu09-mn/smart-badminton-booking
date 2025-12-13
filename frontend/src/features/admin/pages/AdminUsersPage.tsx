import React from 'react';

export const AdminUsersPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Quản lý Người dùng</h1>
        <p className="text-gray-600">
          Quản lý tài khoản khách hàng, nhân viên, và admin
        </p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="text-3xl">👥</div>
          <div>
            <h3 className="font-semibold text-yellow-900 mb-2">Tính năng đang phát triển</h3>
            <p className="text-yellow-800 text-sm mb-3">
              Trang này sẽ hiển thị:
            </p>
            <ul className="list-disc list-inside text-yellow-800 text-sm space-y-1">
              <li>Danh sách người dùng theo role</li>
              <li>Tìm kiếm và filter nâng cao</li>
              <li>Kích hoạt/Vô hiệu hóa tài khoản</li>
              <li>Chỉnh sửa thông tin user</li>
              <li>Phân quyền admin/staff</li>
              <li>Xem lịch sử booking của user</li>
            </ul>
            <p className="text-yellow-700 text-xs mt-3">
              📅 Dự kiến hoàn thành: Day 16 (User Management)
            </p>
          </div>
        </div>
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-sm mb-1">Tổng người dùng</p>
          <p className="text-3xl font-bold text-gray-800">248</p>
          <p className="text-blue-600 text-sm mt-1">+12 tuần này</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-sm mb-1">Khách hàng</p>
          <p className="text-3xl font-bold text-gray-800">230</p>
          <p className="text-green-600 text-sm mt-1">Active</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-sm mb-1">Nhân viên</p>
          <p className="text-3xl font-bold text-gray-800">15</p>
          <p className="text-purple-600 text-sm mt-1">Staff</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-sm mb-1">Quản trị</p>
          <p className="text-3xl font-bold text-gray-800">3</p>
          <p className="text-red-600 text-sm mt-1">Admin</p>
        </div>
      </div>
    </div>
  );
};

export default AdminUsersPage;
