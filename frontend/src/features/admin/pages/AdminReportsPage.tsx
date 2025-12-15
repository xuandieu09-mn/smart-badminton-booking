import React from 'react';

export const AdminReportsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Báo cáo & Thống kê
        </h1>
        <p className="text-gray-600">
          Phân tích dữ liệu, heatmap, và báo cáo doanh thu
        </p>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="text-3xl">📈</div>
          <div>
            <h3 className="font-semibold text-red-900 mb-2">
              Tính năng đang phát triển
            </h3>
            <p className="text-red-800 text-sm mb-3">Trang này sẽ hiển thị:</p>
            <ul className="list-disc list-inside text-red-800 text-sm space-y-1">
              <li>Heatmap khung giờ đặt nhiều nhất</li>
              <li>Biểu đồ doanh thu theo tháng</li>
              <li>Top 5 sân được đặt nhiều nhất</li>
              <li>Tỷ lệ giữ chân khách hàng</li>
              <li>Xuất báo cáo Excel/PDF</li>
              <li>So sánh theo khoảng thời gian</li>
            </ul>
            <p className="text-red-700 text-xs mt-3">
              📅 Dự kiến hoàn thành: Day 20 (Business Intelligence & Heatmap)
            </p>
          </div>
        </div>
      </div>

      {/* Report Preview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-800 mb-4">
          📊 Preview: Analytics Dashboard
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Heatmap Preview */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium text-gray-700 mb-3">
              🔥 Heatmap: Booking theo giờ
            </h4>
            <div className="space-y-2">
              {['06:00', '09:00', '12:00', '15:00', '18:00', '21:00'].map(
                (time) => (
                  <div key={time} className="flex items-center gap-3">
                    <span className="text-sm font-mono w-16">{time}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                      <div
                        className={`h-full ${
                          time === '18:00'
                            ? 'bg-red-500 w-full'
                            : time === '15:00'
                              ? 'bg-orange-500 w-4/5'
                              : time === '09:00'
                                ? 'bg-yellow-500 w-3/5'
                                : 'bg-green-500 w-2/5'
                        }`}
                      />
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>

          {/* Revenue Chart Preview */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium text-gray-700 mb-3">
              💰 Doanh thu 6 tháng
            </h4>
            <div className="space-y-2">
              {['T7', 'T8', 'T9', 'T10', 'T11', 'T12'].map((month, idx) => (
                <div key={month} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-8">{month}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${(idx + 1) * 15}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-600">
                    {(idx + 1) * 10}M
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminReportsPage;
