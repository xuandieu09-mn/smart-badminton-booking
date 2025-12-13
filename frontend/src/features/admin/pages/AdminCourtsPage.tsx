import React from 'react';

export const AdminCourtsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Quản lý Sân</h1>
        <p className="text-gray-600">
          Quản lý thông tin sân, giá, và lịch bảo trì
        </p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="text-3xl">🏟️</div>
          <div>
            <h3 className="font-semibold text-green-900 mb-2">Tính năng đang phát triển</h3>
            <p className="text-green-800 text-sm mb-3">
              Trang này sẽ hiển thị:
            </p>
            <ul className="list-disc list-inside text-green-800 text-sm space-y-1">
              <li>CRUD sân cầu lông (Tạo, Sửa, Xóa)</li>
              <li>Cấu hình giá theo khung giờ</li>
              <li>Lên lịch bảo trì sân</li>
              <li>Chặn/Mở chặn sân tạm thời</li>
              <li>Thống kê tình trạng sử dụng sân</li>
            </ul>
            <p className="text-green-700 text-xs mt-3">
              📅 Dự kiến hoàn thành: Day 17 (Court Operations)
            </p>
          </div>
        </div>
      </div>

      {/* Quick Preview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-800 mb-4">🎯 Preview: Court Management</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
            <div className="text-2xl mb-2">🏸</div>
            <p className="font-medium">Court 1</p>
            <p className="text-sm text-gray-500">Available</p>
          </div>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
            <div className="text-2xl mb-2">🏸</div>
            <p className="font-medium">Court 2</p>
            <p className="text-sm text-gray-500">Available</p>
          </div>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
            <div className="text-2xl mb-2">🔧</div>
            <p className="font-medium">Court 3</p>
            <p className="text-sm text-red-500">Maintenance</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCourtsPage;
