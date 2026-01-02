import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import apiClient from '@/services/api/client';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Summary {
  totalRevenue: number;
  totalBookings: number;
  avgBookingValue: number;
  conversionRate: number;
}

interface RevenueTrend {
  date: string;
  revenue: number;
}

interface CourtRevenue {
  courtName: string;
  revenue: number;
  bookings: number;
  avgPerBooking: number;
}

interface PeakHour {
  hour: number;
  revenue: number;
  bookings: number;
}

interface ChatAnalytics {
  intent: string;
  count: number;
}

export const AdminReportsPage: React.FC = () => {
  const [range, setRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrend[]>([]);
  const [courtRevenue, setCourtRevenue] = useState<CourtRevenue[]>([]);
  const [peakHours, setPeakHours] = useState<PeakHour[]>([]);
  const [chatAnalytics, setChatAnalytics] = useState<ChatAnalytics[]>([]);

  useEffect(() => {
    fetchData();
  }, [range]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [summaryRes, revenueRes, courtRes, peakRes, chatRes] = await Promise.all([
        apiClient.get(`/reports/summary?range=${range}`),
        apiClient.get(`/reports/revenue?range=${range}`),
        apiClient.get(`/reports/court-revenue?range=${range}`),
        apiClient.get(`/reports/peak-hours?range=${range}`),
        apiClient.get(`/reports/chat-analytics?range=${range}`),
      ]);

      setSummary(summaryRes.data);
      setRevenueTrend(revenueRes.data);
      setCourtRevenue(courtRes.data);
      setPeakHours(peakRes.data);
      setChatAnalytics(chatRes.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Chart data
  const revenueChartData = {
    labels: revenueTrend.map((d) => new Date(d.date).toLocaleDateString('vi-VN')),
    datasets: [
      {
        label: 'Doanh thu',
        data: revenueTrend.map((d) => d.revenue),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const courtChartData = {
    labels: courtRevenue.map((c) => c.courtName),
    datasets: [
      {
        label: 'Doanh thu',
        data: courtRevenue.map((c) => c.revenue),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)',
        ],
      },
    ],
  };

  const peakHoursChartData = {
    labels: peakHours.map((h) => `${h.hour}:00`),
    datasets: [
      {
        label: 'Số booking',
        data: peakHours.map((h) => h.bookings),
        backgroundColor: 'rgba(251, 191, 36, 0.8)',
      },
    ],
  };

  const chatChartData = {
    labels: chatAnalytics.map((c) => c.intent),
    datasets: [
      {
        data: chatAnalytics.map((c) => c.count),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)',
        ],
      },
    ],
  };

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">📊 Báo cáo & Phân tích</h1>
        <p className="text-blue-100">Thống kê doanh thu, biểu đồ và xu hướng kinh doanh</p>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-3">
        {['7d', '30d', '90d'].map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              range === r
                ? 'bg-blue-600 text-white shadow-lg scale-105'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            {r === '7d' ? '7 ngày' : r === '30d' ? '30 ngày' : '90 ngày'}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-100 text-sm font-medium">Tổng doanh thu</span>
            <span className="text-3xl">💰</span>
          </div>
          <div className="text-3xl font-bold">{formatCurrency(summary?.totalRevenue || 0)}</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-green-100 text-sm font-medium">Tổng booking</span>
            <span className="text-3xl">📅</span>
          </div>
          <div className="text-3xl font-bold">{summary?.totalBookings || 0}</div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-yellow-100 text-sm font-medium">Giá trị TB/booking</span>
            <span className="text-3xl">💳</span>
          </div>
          <div className="text-3xl font-bold">{formatCurrency(summary?.avgBookingValue || 0)}</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-purple-100 text-sm font-medium">Tỷ lệ chuyển đổi</span>
            <span className="text-3xl">📈</span>
          </div>
          <div className="text-3xl font-bold">{summary?.conversionRate.toFixed(1) || 0}%</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">📈 Xu hướng doanh thu</h3>
          <Line
            data={revenueChartData}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              plugins: {
                legend: { display: false },
              },
            }}
          />
        </div>

        {/* Court Revenue */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">🏸 Doanh thu theo sân</h3>
          <Bar
            data={courtChartData}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              plugins: {
                legend: { display: false },
              },
            }}
          />
        </div>

        {/* Peak Hours */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">⏰ Khung giờ cao điểm</h3>
          <Bar
            data={peakHoursChartData}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              plugins: {
                legend: { display: false },
              },
            }}
          />
        </div>

        {/* Chat Analytics */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">💬 Phân tích chat</h3>
          <div className="flex justify-center">
            <div className="w-64 h-64">
              <Doughnut
                data={chatChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Top Courts Table */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">🏆 Top sân doanh thu cao</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Xếp hạng</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Tên sân</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Doanh thu</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Số booking</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">TB/booking</th>
              </tr>
            </thead>
            <tbody>
              {courtRevenue.map((court, index) => (
                <tr key={court.courtName} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <span className="text-2xl">{getMedalEmoji(index + 1)}</span>
                  </td>
                  <td className="py-3 px-4 font-medium text-gray-800">{court.courtName}</td>
                  <td className="py-3 px-4 text-right font-semibold text-blue-600">
                    {formatCurrency(court.revenue)}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-700">{court.bookings}</td>
                  <td className="py-3 px-4 text-right text-gray-600">
                    {formatCurrency(court.avgPerBooking)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminReportsPage;
