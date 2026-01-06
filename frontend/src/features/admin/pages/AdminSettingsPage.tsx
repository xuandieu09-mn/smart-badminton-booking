import React, { useState } from 'react';
import { useOperatingHours, useUpdateOperatingHours, useResetOperatingHours } from '../../../hooks/useOperatingHours';

const AdminSettingsPage: React.FC = () => {
  const { data: currentHours, isLoading } = useOperatingHours();
  const updateMutation = useUpdateOperatingHours();
  const resetMutation = useResetOperatingHours();

  const [openingHour, setOpeningHour] = useState(6);
  const [closingHour, setClosingHour] = useState(21);

  // Sync form with fetched data
  React.useEffect(() => {
    if (currentHours) {
      setOpeningHour(currentHours.openingHour);
      setClosingHour(currentHours.closingHour);
    }
  }, [currentHours]);

  const handleSave = () => {
    if (openingHour >= closingHour) {
      alert('❌ Giờ mở cửa phải nhỏ hơn giờ đóng cửa!');
      return;
    }

    if (closingHour - openingHour < 2) {
      alert('❌ Thời gian hoạt động phải ít nhất 2 giờ!');
      return;
    }

    updateMutation.mutate({ openingHour, closingHour });
  };

  const handleReset = () => {
    if (confirm('Bạn có chắc muốn đặt lại giờ hoạt động về mặc định (6:00 - 21:00)?')) {
      resetMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">⚙️ Cài đặt hệ thống</h1>
          <p className="text-gray-600">Quản lý giờ mở cửa và đóng cửa sân</p>
        </div>

        {/* Current Settings Display */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">ℹ️</span>
            <h3 className="font-bold text-blue-900">Cài đặt hiện tại</h3>
          </div>
          <p className="text-blue-800 text-sm">
            Giờ hoạt động: <strong>{currentHours?.openingHour}:00 - {currentHours?.closingHour}:00</strong>
          </p>
          <p className="text-blue-600 text-xs mt-1">
            Tất cả lịch đặt sân, bảo trì, và chức năng khác sẽ tuân theo khung giờ này.
          </p>
        </div>

        {/* Settings Form */}
        <div className="space-y-6">
          {/* Opening Hour */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🌅 Giờ mở cửa
            </label>
            <div className="flex items-center gap-4">
              <input
                type="number"
                min="5"
                max="23"
                value={openingHour}
                onChange={(e) => setOpeningHour(Number(e.target.value))}
                className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-bold text-lg"
              />
              <span className="text-gray-600">:00</span>
              <span className="text-sm text-gray-500">(Sớm nhất: 5:00)</span>
            </div>
          </div>

          {/* Closing Hour */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🌙 Giờ đóng cửa
            </label>
            <div className="flex items-center gap-4">
              <input
                type="number"
                min="6"
                max="24"
                value={closingHour}
                onChange={(e) => setClosingHour(Number(e.target.value))}
                className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-bold text-lg"
              />
              <span className="text-gray-600">:00</span>
              <span className="text-sm text-gray-500">(Muộn nhất: 24:00)</span>
            </div>
          </div>

          {/* Operating Hours Preview */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">📊 Xem trước</h4>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-8 bg-gradient-to-r from-gray-300 to-gray-300 rounded-lg relative">
                <div
                  className="absolute h-full bg-gradient-to-r from-green-400 to-blue-500 rounded-lg"
                  style={{
                    left: `${((openingHour - 5) / 19) * 100}%`,
                    width: `${((closingHour - openingHour) / 19) * 100}%`,
                  }}
                />
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>5:00</span>
              <span className="font-bold text-green-600">{openingHour}:00</span>
              <span className="font-bold text-blue-600">{closingHour}:00</span>
              <span>24:00</span>
            </div>
            <p className="text-center mt-3 font-bold text-lg text-gray-900">
              Thời gian hoạt động: {closingHour - openingHour} giờ
            </p>
          </div>

          {/* Validation Messages */}
          {openingHour >= closingHour && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              ⚠️ Giờ mở cửa phải nhỏ hơn giờ đóng cửa!
            </div>
          )}
          {closingHour - openingHour < 2 && openingHour < closingHour && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-yellow-700 text-sm">
              ⚠️ Thời gian hoạt động phải ít nhất 2 giờ!
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t">
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending || openingHour >= closingHour || closingHour - openingHour < 2}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {updateMutation.isPending ? '⏳ Đang lưu...' : '💾 Lưu thay đổi'}
            </button>
            <button
              onClick={handleReset}
              disabled={resetMutation.isPending}
              className="px-6 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 disabled:bg-gray-100 transition-colors"
            >
              {resetMutation.isPending ? '⏳ Đang đặt lại...' : '🔄 Đặt lại mặc định'}
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-5">
          <h4 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
            <span>💡</span>
            <span>Lưu ý quan trọng</span>
          </h4>
          <ul className="space-y-2 text-sm text-purple-800">
            <li className="flex items-start gap-2">
              <span className="text-purple-600">•</span>
              <span>Giờ mở cửa không được sớm hơn <strong>5:00</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600">•</span>
              <span>Giờ đóng cửa không được muộn hơn <strong>24:00</strong> (0:00 ngày hôm sau)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600">•</span>
              <span>Thời gian hoạt động tối thiểu: <strong>2 giờ</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600">•</span>
              <span>Tất cả trang (Customer, Staff, Admin) sẽ tự động cập nhật theo cài đặt này</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600">•</span>
              <span>Các chức năng đặt lịch, bảo trì, thêm giờ chơi sẽ bị giới hạn theo khung giờ này</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsPage;
