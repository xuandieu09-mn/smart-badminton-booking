import React from 'react';

export const AdminPaymentsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Quản lý Thanh toán
        </h1>
        <p className="text-gray-600">
          Theo dõi giao dịch, doanh thu, và tích hợp cổng thanh toán
        </p>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="text-3xl">💳</div>
          <div>
            <h3 className="font-semibold text-purple-900 mb-2">
              Tính năng đang phát triển
            </h3>
            <p className="text-purple-800 text-sm mb-3">
              Trang này sẽ hiển thị:
            </p>
            <ul className="list-disc list-inside text-purple-800 text-sm space-y-1">
              <li>Lịch sử giao dịch chi tiết</li>
              <li>Thống kê doanh thu theo ngày/tháng</li>
              <li>Tích hợp VNPay, MoMo, ZaloPay</li>
              <li>Hoàn tiền và xử lý tranh chấp</li>
              <li>Xuất báo cáo tài chính</li>
            </ul>
            <p className="text-purple-700 text-xs mt-3">
              📅 Dự kiến hoàn thành: Day 21 (Payment Gateway Integration)
            </p>
          </div>
        </div>
      </div>

      {/* Stats Preview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-sm mb-1">Tổng doanh thu (tháng)</p>
          <p className="text-3xl font-bold text-gray-800">50,000,000 đ</p>
          <p className="text-green-600 text-sm mt-1">+12% so với tháng trước</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-sm mb-1">Giao dịch hôm nay</p>
          <p className="text-3xl font-bold text-gray-800">28</p>
          <p className="text-blue-600 text-sm mt-1">15 đã hoàn thành</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-sm mb-1">Chờ hoàn tiền</p>
          <p className="text-3xl font-bold text-gray-800">3</p>
          <p className="text-orange-600 text-sm mt-1">Cần xử lý</p>
        </div>
      </div>
    </div>
  );
};

export default AdminPaymentsPage;
