import React from 'react';

export const AdminBookingsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Quản lý Booking
        </h1>
        <p className="text-gray-600">
          Trang quản lý tất cả các booking trong hệ thống
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="text-3xl">🏸</div>
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">
              Tính năng đang phát triển
            </h3>
            <p className="text-blue-800 text-sm mb-3">Trang này sẽ hiển thị:</p>
            <ul className="list-disc list-inside text-blue-800 text-sm space-y-1">
              <li>Danh sách tất cả bookings với filter nâng cao</li>
              <li>Tìm kiếm theo mã booking, khách hàng, sân</li>
              <li>Chỉnh sửa và hủy booking</li>
              <li>Xuất báo cáo Excel</li>
              <li>Thống kê theo ngày/tuần/tháng</li>
            </ul>
            <p className="text-blue-700 text-xs mt-3">
              📅 Dự kiến hoàn thành: Day 15-16
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminBookingsPage;
