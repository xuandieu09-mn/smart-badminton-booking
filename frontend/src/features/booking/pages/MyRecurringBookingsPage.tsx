import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
import { RecurringBookingCard } from '../components/RecurringBookingCard';

const API = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 30000,
});

interface Booking {
  id: number;
  bookingCode: string;
  startTime: string;
  endTime: string;
  status:
    | 'PENDING_PAYMENT'
    | 'CONFIRMED'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'EXPIRED';
  expiresAt?: string | null;
  courtId: number;
  court: {
    id: number;
    name: string;
    pricePerHour: number;
  };
  isRecurring: boolean;
  recurrenceGroupId: string | null;
  recurrencePattern: string | null;
  recurrenceDayOfWeek: number | null;
  totalPrice: number;
}

interface RecurringGroup {
  recurrenceGroupId: string;
  courtName: string;
  pattern: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  dayOfWeek: number;
  totalPrice: number;
  bookings: Array<{
    id: number;
    bookingCode: string;
    startTime: string;
    endTime: string;
    status:
      | 'PENDING_PAYMENT'
      | 'CONFIRMED'
      | 'COMPLETED'
      | 'CANCELLED'
      | 'EXPIRED';
    expiresAt?: string | null;
  }>;
}

export const MyRecurringBookingsPage: React.FC = () => {
  const { accessToken } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<RecurringGroup[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecurringBookings();
  }, []);

  const fetchRecurringBookings = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all user's bookings
      const response = await API.get('/bookings/my-bookings', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const bookings: Booking[] = response.data;

      // Filter recurring bookings and group them
      const recurringBookings = bookings.filter(
        (b) => b.isRecurring && b.recurrenceGroupId,
      );

      // Group by recurrenceGroupId
      const groupedMap = new Map<string, RecurringGroup>();

      recurringBookings.forEach((booking) => {
        const groupId = booking.recurrenceGroupId!;

        if (!groupedMap.has(groupId)) {
          groupedMap.set(groupId, {
            recurrenceGroupId: groupId,
            courtName: booking.court.name,
            pattern: booking.recurrencePattern as any,
            dayOfWeek: booking.recurrenceDayOfWeek!,
            totalPrice: 0,
            bookings: [],
          });
        }

        const group = groupedMap.get(groupId)!;
        group.bookings.push({
          id: booking.id,
          bookingCode: booking.bookingCode,
          startTime: booking.startTime,
          endTime: booking.endTime,
          status: booking.status,
          expiresAt: booking.expiresAt,
        });
        group.totalPrice += Number(booking.totalPrice);
      });

      // Sort bookings within each group
      groupedMap.forEach((group) => {
        group.bookings.sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
        );
      });

      const groupsArray = Array.from(groupedMap.values());
      setGroups(groupsArray);
    } catch (error: any) {
      console.error('Failed to fetch recurring bookings:', error);
      setError(
        error.response?.data?.message ||
          'Không thể tải danh sách đặt lịch cố định',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancelGroup = async (groupId: string) => {
    if (!confirm('Bạn có chắc muốn hủy toàn bộ lịch cố định này?')) return;

    try {
      await API.post(
        `/bookings/recurring/${groupId}/cancel-all`,
        {},
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      alert('Đã hủy toàn bộ lịch cố định thành công!');
      fetchRecurringBookings();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Không thể hủy lịch cố định');
    }
  };

  const handlePayAll = async (groupId: string) => {
    alert('Chức năng thanh toán sẽ được triển khai ở Day 21 - Payment Gateway');
    // TODO: Implement payment for all bookings in group
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Đang tải...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
            <p className="text-red-800">{error}</p>
            <button
              onClick={fetchRecurringBookings}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg p-6 mb-6 shadow-lg">
          <h1 className="text-3xl font-bold mb-2">🔄 Lịch Cố định của tôi</h1>
          <p className="text-purple-100">Quản lý các lịch đặt sân định kỳ</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
            <div className="text-sm text-gray-600">Tổng nhóm lịch</div>
            <div className="text-2xl font-bold text-gray-900">
              {groups.length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <div className="text-sm text-gray-600">Tổng số buổi</div>
            <div className="text-2xl font-bold text-gray-900">
              {groups.reduce((sum, g) => sum + g.bookings.length, 0)}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <div className="text-sm text-gray-600">Tổng giá trị</div>
            <div className="text-2xl font-bold text-gray-900">
              {new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND',
              }).format(groups.reduce((sum, g) => sum + g.totalPrice, 0))}
            </div>
          </div>
        </div>

        {/* Recurring groups */}
        {groups.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Chưa có lịch cố định nào
            </h3>
            <p className="text-gray-600 mb-6">
              Đặt lịch cố định để đảm bảo có sân mỗi tuần!
            </p>
            <a
              href="/recurring-bookings"
              className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
            >
              ➕ Tạo lịch cố định mới
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <RecurringBookingCard
                key={group.recurrenceGroupId}
                recurrenceGroupId={group.recurrenceGroupId}
                courtName={group.courtName}
                pattern={group.pattern}
                dayOfWeek={group.dayOfWeek}
                totalPrice={group.totalPrice}
                bookings={group.bookings}
                onCancelGroup={handleCancelGroup}
                onPayAll={handlePayAll}
              />
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-6 flex gap-4">
          <a
            href="/recurring-bookings"
            className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium text-center"
          >
            ➕ Tạo lịch cố định mới
          </a>
          <button
            onClick={fetchRecurringBookings}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium"
          >
            🔄 Làm mới
          </button>
        </div>
      </div>
    </div>
  );
};

export default MyRecurringBookingsPage;
