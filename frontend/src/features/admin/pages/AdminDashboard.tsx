import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import DashboardStats from '../components/DashboardStats';
import BookingsList from '../components/BookingsList';
import CourtManagement from '../components/CourtManagement';
import PaymentAnalytics from '../components/PaymentAnalytics';

const API = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000,
});

interface DashboardData {
  totalBookings: number;
  totalRevenue: number;
  totalUsers: number;
  occupancyRate: number;
  todayBookings: number;
  pendingPayments: number;
}

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'bookings' | 'courts' | 'analytics'
  >('overview');
  const token = localStorage.getItem('access_token');

  const {
    data: stats,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin', 'dashboard-stats'],
    queryFn: async () => {
      const response = await API.get<DashboardData>('/users/dashboard/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    enabled: !!token,
  });

  const { data: bookingsData } = useQuery({
    queryKey: ['admin', 'bookings'],
    queryFn: async () => {
      const response = await API.get('/bookings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    enabled: !!token,
  });

  // Extract bookings array from response (API returns { message, total, bookings })
  const bookings = Array.isArray(bookingsData) 
    ? bookingsData 
    : (bookingsData?.bookings || []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Đang tải dữ liệu...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="text-red-800">Lỗi: Không thể tải dữ liệu dashboard</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Bảng điều khiển quản lý
          </h1>
          <p className="text-gray-600 mt-1">
            Theo dõi hoạt động kinh doanh của sân cầu lông
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-3 font-medium text-sm ${
            activeTab === 'overview'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Tổng quan
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`px-4 py-3 font-medium text-sm ${
            activeTab === 'bookings'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Đặt sân
        </button>
        <button
          onClick={() => setActiveTab('courts')}
          className={`px-4 py-3 font-medium text-sm ${
            activeTab === 'courts'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Quản lý sân
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-3 font-medium text-sm ${
            activeTab === 'analytics'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Phân tích
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && stats && (
          <>
            <DashboardStats stats={stats} />
            <div className="mt-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Đặt sân gần đây
              </h2>
              <BookingsList bookings={bookings?.slice(0, 5) || []} />
            </div>
          </>
        )}

        {activeTab === 'bookings' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Quản lý đặt sân
            </h2>
            <BookingsList bookings={bookings || []} isEditable={true} />
          </div>
        )}

        {activeTab === 'courts' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Quản lý sân cầu lông
            </h2>
            <CourtManagement />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Phân tích doanh thu
            </h2>
            <PaymentAnalytics />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
