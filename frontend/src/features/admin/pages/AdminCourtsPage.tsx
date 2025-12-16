import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import apiClient from '../../../services/api/client';

interface Court {
  id: number;
  name: string;
  description: string | null;
  pricePerHour: number;
  isActive: boolean;
  createdAt: string;
  _count?: {
    bookings: number;
    pricingRules: number;
  };
}

interface PricingRule {
  id: number;
  courtId: number | null;
  name: string;
  dayOfWeek: number | null;
  startTime: string;
  endTime: string;
  pricePerHour: number;
  priority: number;
  isActive: boolean;
}

interface CourtStats {
  totalBookings: number;
  todayBookings: number;
  revenue: number;
  utilizationRate: number;
}

const AdminCourtsPage: React.FC = () => {
  const [courts, setCourts] = useState<Court[]>([]);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCourtModal, setShowCourtModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [courtStats, setCourtStats] = useState<CourtStats | null>(null);
  
  const [courtForm, setCourtForm] = useState({
    name: '',
    description: '',
    pricePerHour: 50000,
    isActive: true,
  });

  const [maintenanceForm, setMaintenanceForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '08:00',
    endTime: '10:00',
    reason: 'Bảo trì định kỳ',
  });

  useEffect(() => {
    fetchCourts();
  }, []);

  const fetchCourts = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/courts');
      setCourts(data || []);
    } catch (error) {
      console.error('Failed to fetch courts:', error);
      alert('❌ Không thể tải danh sách sân');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourt = () => {
    setSelectedCourt(null);
    setCourtForm({
      name: '',
      description: '',
      pricePerHour: 50000,
      isActive: true,
    });
    setShowCourtModal(true);
  };

  const handleEditCourt = (court: Court) => {
    setSelectedCourt(court);
    setCourtForm({
      name: court.name,
      description: court.description || '',
      pricePerHour: Number(court.pricePerHour),
      isActive: court.isActive,
    });
    setShowCourtModal(true);
  };

  const handleSaveCourt = async () => {
    try {
      // Ensure pricePerHour is a valid number
      const payload = {
        ...courtForm,
        pricePerHour: Number(courtForm.pricePerHour) || 0,
      };
      
      console.log('📤 Sending court payload:', payload);
      
      if (selectedCourt) {
        // Update
        await apiClient.put(`/courts/${selectedCourt.id}`, payload);
        alert('✅ Cập nhật sân thành công!');
      } else {
        // Create
        await apiClient.post('/courts', payload);
        alert('✅ Tạo sân mới thành công!');
      }
      setShowCourtModal(false);
      fetchCourts();
    } catch (error: any) {
      console.error('❌ Failed to save court:', error);
      console.error('📋 Error response:', error.response?.data);
      alert('❌ Lỗi: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteCourt = async (court: Court) => {
    if (!window.confirm(`Xác nhận xóa sân "${court.name}"? Hành động này không thể hoàn tác!`)) {
      return;
    }

    try {
      await apiClient.delete(`/courts/${court.id}`);
      alert('✅ Xóa sân thành công!');
      fetchCourts();
    } catch (error: any) {
      console.error('Failed to delete court:', error);
      alert('❌ Lỗi: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleToggleActive = async (court: Court) => {
    const action = court.isActive ? 'vô hiệu hóa' : 'kích hoạt';
    if (!window.confirm(`Xác nhận ${action} sân "${court.name}"?`)) {
      return;
    }

    try {
      await apiClient.put(`/courts/${court.id}`, { isActive: !court.isActive });
      alert(`✅ ${action} sân thành công!`);
      fetchCourts();
    } catch (error: any) {
      console.error('Failed to toggle court:', error);
      alert('❌ Lỗi: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleScheduleMaintenance = (court: Court) => {
    setSelectedCourt(court);
    setMaintenanceForm({
      date: format(new Date(), 'yyyy-MM-dd'),
      startTime: '08:00',
      endTime: '10:00',
      reason: 'Bảo trì định kỳ',
    });
    setShowMaintenanceModal(true);
  };

  const handleSaveMaintenance = async () => {
    if (!selectedCourt) return;

    const startDateTime = `${maintenanceForm.date}T${maintenanceForm.startTime}:00`;
    const endDateTime = `${maintenanceForm.date}T${maintenanceForm.endTime}:00`;

    try {
      await apiClient.post('/bookings', {
        courtId: selectedCourt.id,
        startTime: startDateTime,
        endTime: endDateTime,
        type: 'MAINTENANCE',
        guestName: 'Bảo trì',
        guestPhone: maintenanceForm.reason,
        paymentMethod: 'CASH',
      });
      alert('✅ Lên lịch bảo trì thành công!');
      setShowMaintenanceModal(false);
    } catch (error: any) {
      console.error('Failed to schedule maintenance:', error);
      alert('❌ Lỗi: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleViewStats = async (court: Court) => {
    setSelectedCourt(court);
    setShowStatsModal(true);
    try {
      // Mock stats - in real app, call API endpoint
      const stats: CourtStats = {
        totalBookings: Math.floor(Math.random() * 100) + 50,
        todayBookings: Math.floor(Math.random() * 10),
        revenue: Math.floor(Math.random() * 10000000) + 5000000,
        utilizationRate: Math.floor(Math.random() * 40) + 60,
      };
      setCourtStats(stats);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const getDayLabel = (day: number | null) => {
    if (day === null) return 'Tất cả';
    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return days[day];
  };

  // Calculate stats
  const stats = {
    total: courts.length,
    active: courts.filter((c) => c.isActive).length,
    inactive: courts.filter((c) => !c.isActive).length,
    avgPrice: courts.length > 0 
      ? courts.reduce((sum, c) => sum + Number(c.pricePerHour), 0) / courts.length 
      : 0,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              🏟️ Quản lý Sân
            </h1>
            <p className="text-gray-600">
              CRUD sân, cấu hình giá, lịch bảo trì và thống kê
            </p>
          </div>
          <button
            onClick={handleCreateCourt}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 shadow-lg transition flex items-center gap-2"
          >
            <span className="text-xl">➕</span>
            <span>Tạo sân mới</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="text-2xl mb-1">🏟️</div>
            <div className="text-3xl font-bold">{stats.total}</div>
            <div className="text-sm opacity-90">Tổng số sân</div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="text-2xl mb-1">✅</div>
            <div className="text-3xl font-bold">{stats.active}</div>
            <div className="text-sm opacity-90">Đang hoạt động</div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
            <div className="text-2xl mb-1">❌</div>
            <div className="text-3xl font-bold">{stats.inactive}</div>
            <div className="text-sm opacity-90">Tạm đóng</div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="text-2xl mb-1">💰</div>
            <div className="text-xl font-bold">{formatCurrency(stats.avgPrice)}</div>
            <div className="text-sm opacity-90">Giá TB/giờ</div>
          </div>
        </div>

        {/* Courts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              🔄 Đang tải dữ liệu...
            </div>
          ) : courts.length > 0 ? (
            courts.map((court) => (
              <div
                key={court.id}
                className={`bg-white rounded-xl shadow-lg overflow-hidden transition-transform hover:scale-105 ${
                  !court.isActive ? 'opacity-60' : ''
                }`}
              >
                {/* Header */}
                <div
                  className={`p-4 ${
                    court.isActive
                      ? 'bg-gradient-to-r from-green-500 to-green-600'
                      : 'bg-gradient-to-r from-gray-500 to-gray-600'
                  } text-white`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-3xl">🏸</div>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        court.isActive
                          ? 'bg-green-200 text-green-800'
                          : 'bg-red-200 text-red-800'
                      }`}
                    >
                      {court.isActive ? '✅ Hoạt động' : '❌ Đóng'}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold">{court.name}</h3>
                  <p className="text-sm opacity-90 mt-1">
                    {court.description || 'Sân cầu lông chuyên nghiệp'}
                  </p>
                </div>

                {/* Body */}
                <div className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-600">Giá cơ bản:</span>
                    <span className="text-xl font-bold text-green-600">
                      {formatCurrency(Number(court.pricePerHour))}/h
                    </span>
                  </div>

                  <div className="text-sm text-gray-500 space-y-1 mb-4">
                    <div className="flex justify-between">
                      <span>Ngày tạo:</span>
                      <span>{format(new Date(court.createdAt), 'dd/MM/yyyy')}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleEditCourt(court)}
                      className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition text-sm"
                    >
                      ✏️ Sửa
                    </button>
                    <button
                      onClick={() => handleToggleActive(court)}
                      className={`px-3 py-2 rounded-lg transition text-sm ${
                        court.isActive
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {court.isActive ? '🔒 Đóng' : '🔓 Mở'}
                    </button>
                    <button
                      onClick={() => setSelectedCourt(court)}
                      className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition text-sm"
                    >
                      💰 Giá
                    </button>
                    <button
                      onClick={() => handleScheduleMaintenance(court)}
                      className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition text-sm"
                    >
                      🔧 Bảo trì
                    </button>
                    <button
                      onClick={() => handleViewStats(court)}
                      className="px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition text-sm"
                    >
                      📊 Thống kê
                    </button>
                    <button
                      onClick={() => handleDeleteCourt(court)}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition text-sm"
                    >
                      🗑️ Xóa
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-gray-500">
              ❌ Chưa có sân nào. Tạo sân mới để bắt đầu!
            </div>
          )}
        </div>

        {/* Court Modal (Create/Edit) */}
        {showCourtModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {selectedCourt ? '✏️ Chỉnh sửa sân' : '➕ Tạo sân mới'}
              </h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên sân *
                  </label>
                  <input
                    type="text"
                    value={courtForm.name}
                    onChange={(e) =>
                      setCourtForm({ ...courtForm, name: e.target.value })
                    }
                    placeholder="VD: Sân 1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mô tả
                  </label>
                  <textarea
                    value={courtForm.description}
                    onChange={(e) =>
                      setCourtForm({ ...courtForm, description: e.target.value })
                    }
                    placeholder="VD: Sân cầu lông chuẩn quốc tế"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Giá cơ bản (VNĐ/giờ) *
                  </label>
                  <input
                    type="number"
                    value={courtForm.pricePerHour}
                    onChange={(e) =>
                      setCourtForm({
                        ...courtForm,
                        pricePerHour: Number(e.target.value),
                      })
                    }
                    min="0"
                    step="10000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={courtForm.isActive}
                    onChange={(e) =>
                      setCourtForm({ ...courtForm, isActive: e.target.checked })
                    }
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Sân hoạt động (có thể đặt)
                  </label>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCourtModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveCourt}
                  disabled={!courtForm.name}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  ✓ Lưu
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Maintenance Modal */}
        {showMaintenanceModal && selectedCourt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                🔧 Lên lịch bảo trì - {selectedCourt.name}
              </h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ngày bảo trì
                  </label>
                  <input
                    type="date"
                    value={maintenanceForm.date}
                    onChange={(e) =>
                      setMaintenanceForm({ ...maintenanceForm, date: e.target.value })
                    }
                    min={format(new Date(), 'yyyy-MM-dd')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Từ giờ
                    </label>
                    <input
                      type="time"
                      value={maintenanceForm.startTime}
                      onChange={(e) =>
                        setMaintenanceForm({
                          ...maintenanceForm,
                          startTime: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Đến giờ
                    </label>
                    <input
                      type="time"
                      value={maintenanceForm.endTime}
                      onChange={(e) =>
                        setMaintenanceForm({
                          ...maintenanceForm,
                          endTime: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lý do
                  </label>
                  <input
                    type="text"
                    value={maintenanceForm.reason}
                    onChange={(e) =>
                      setMaintenanceForm({
                        ...maintenanceForm,
                        reason: e.target.value,
                      })
                    }
                    placeholder="VD: Bảo trì định kỳ, Sửa lưới, Lau sàn..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    ⚠️ <strong>Lưu ý:</strong> Sân sẽ bị chặn trong khung giờ này. Khách hàng
                    không thể đặt.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowMaintenanceModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveMaintenance}
                  className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition"
                >
                  ✓ Xác nhận
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Modal */}
        {showStatsModal && selectedCourt && courtStats && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                📊 Thống kê - {selectedCourt.name}
              </h2>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-2xl mb-2">📅</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {courtStats.totalBookings}
                  </div>
                  <div className="text-sm text-gray-600">Tổng lượt đặt</div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-2xl mb-2">🎯</div>
                  <div className="text-2xl font-bold text-green-600">
                    {courtStats.todayBookings}
                  </div>
                  <div className="text-sm text-gray-600">Đặt hôm nay</div>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-2xl mb-2">💰</div>
                  <div className="text-lg font-bold text-purple-600">
                    {formatCurrency(courtStats.revenue)}
                  </div>
                  <div className="text-sm text-gray-600">Doanh thu</div>
                </div>

                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="text-2xl mb-2">📈</div>
                  <div className="text-2xl font-bold text-orange-600">
                    {courtStats.utilizationRate}%
                  </div>
                  <div className="text-sm text-gray-600">Tỷ lệ sử dụng</div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-800 mb-2">🎯 Đánh giá</h3>
                <p className="text-sm text-gray-600">
                  {courtStats.utilizationRate >= 80
                    ? '🔥 Sân rất được ưa chuộng! Cân nhắc tăng giá giờ cao điểm.'
                    : courtStats.utilizationRate >= 60
                    ? '✅ Sân đang hoạt động tốt.'
                    : '⚠️ Tỷ lệ sử dụng thấp. Cân nhắc giảm giá hoặc khuyến mãi.'}
                </p>
              </div>

              <button
                onClick={() => setShowStatsModal(false)}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
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

export default AdminCourtsPage;
