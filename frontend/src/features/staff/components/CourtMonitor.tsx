import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000,
});

interface CourtStatus {
  courtId: number;
  courtName: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';
  currentBooking: {
    id: number;
    bookingCode: string;
    startTime: string;
    endTime: string;
    status: string;
    userName: string;
    userEmail?: string;
  } | null;
  nextBooking: {
    id: number;
    bookingCode: string;
    startTime: string;
    endTime: string;
    status: string;
    userName: string;
  } | null;
  todayBookings: number;
}

interface RealtimeStatusResponse {
  timestamp: string;
  courts: CourtStatus[];
  summary: {
    totalCourts: number;
    available: number;
    occupied: number;
    reserved: number;
  };
}

export const CourtMonitor: React.FC = () => {
  const token = localStorage.getItem('access_token');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['courts', 'realtime-status'],
    queryFn: async () => {
      const response = await API.get<RealtimeStatusResponse>(
        '/courts/realtime-status',
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      return response.data;
    },
    enabled: !!token,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'OCCUPIED':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'RESERVED':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return '✅';
      case 'OCCUPIED':
        return '🏸';
      case 'RESERVED':
        return '📅';
      default:
        return '❓';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'Trống';
      case 'OCCUPIED':
        return 'Đang chơi';
      case 'RESERVED':
        return 'Đã đặt';
      default:
        return 'Không xác định';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Đang tải trạng thái sân...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="text-red-800">Lỗi: Không thể tải trạng thái sân</div>
        <button
          onClick={() => refetch()}
          className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="text-sm text-gray-600">Tổng số sân</div>
          <div className="text-2xl font-bold text-gray-900">
            {data?.summary.totalCourts || 0}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="text-sm text-gray-600">Sân trống</div>
          <div className="text-2xl font-bold text-green-600">
            {data?.summary.available || 0}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
          <div className="text-sm text-gray-600">Đang chơi</div>
          <div className="text-2xl font-bold text-red-600">
            {data?.summary.occupied || 0}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
          <div className="text-sm text-gray-600">Đã đặt</div>
          <div className="text-2xl font-bold text-yellow-600">
            {data?.summary.reserved || 0}
          </div>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Cập nhật lúc:{' '}
          {data ? new Date(data.timestamp).toLocaleTimeString('vi-VN') : '--'}
        </div>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          🔄 Làm mới
        </button>
      </div>

      {/* Courts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.courts.map((court) => (
          <div
            key={court.courtId}
            className="bg-white rounded-lg shadow-md overflow-hidden border-2 hover:shadow-lg transition-shadow"
          >
            {/* Header */}
            <div
              className={`px-4 py-3 ${getStatusColor(court.status)} border-b-2`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">{court.courtName}</h3>
                <span className="text-2xl">{getStatusIcon(court.status)}</span>
              </div>
              <div className="text-sm font-medium mt-1">
                {getStatusText(court.status)}
              </div>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3">
              {/* Current Booking */}
              {court.currentBooking ? (
                <div className="bg-gray-50 rounded-lg p-3 border">
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                    Hiện tại
                  </div>
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">
                      {court.currentBooking.userName}
                    </div>
                    <div className="text-gray-600">
                      {formatTime(court.currentBooking.startTime)} -{' '}
                      {formatTime(court.currentBooking.endTime)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {court.currentBooking.bookingCode}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <div className="text-sm text-green-700 font-medium">
                    ✨ Sân đang trống
                  </div>
                </div>
              )}

              {/* Next Booking */}
              {court.nextBooking && (
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                    Tiếp theo
                  </div>
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">
                      {court.nextBooking.userName}
                    </div>
                    <div className="text-gray-600">
                      {formatTime(court.nextBooking.startTime)} -{' '}
                      {formatTime(court.nextBooking.endTime)}
                    </div>
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="text-xs text-gray-500 pt-2 border-t">
                📊 {court.todayBookings} đặt sân hôm nay
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
