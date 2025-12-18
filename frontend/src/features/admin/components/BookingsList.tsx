import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

interface Booking {
  id: number;
  userId: number;
  courtId: number;
  startTime: string;
  endTime: string;
  status: string;
  totalPrice?: number;
  user?: { fullName: string; email: string };
  court?: { name: string };
}

interface BookingsListProps {
  bookings: Booking[];
  isEditable?: boolean;
}

const API = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000,
});

const BookingsList: React.FC<BookingsListProps> = ({
  bookings,
  isEditable = false,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const token = localStorage.getItem('access_token');
  const queryClient = useQueryClient();

  const paginatedBookings = bookings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800';
      case 'PENDING_PAYMENT':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'EXPIRED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      CONFIRMED: '✓ Xác nhận',
      PENDING_PAYMENT: '⏳ Chờ thanh toán',
      CANCELLED: '✕ Hủy',
      EXPIRED: '⏱️ Hết hạn',
    };
    return labels[status] || status;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                #
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Khách hàng
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Sân
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Thời gian
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Giá
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Trạng thái
              </th>
              {isEditable && (
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Hành động
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedBookings.length > 0 ? (
              paginatedBookings.map((booking, index) => (
                <tr key={booking.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="text-gray-900 font-medium">
                      {booking.user?.fullName || 'N/A'}
                    </div>
                    <div className="text-gray-500 text-xs">
                      {booking.user?.email || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {booking.court?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div>
                      {new Date(booking.startTime).toLocaleString('vi-VN')}
                    </div>
                    <div className="text-xs text-gray-500">
                      đến{' '}
                      {new Date(booking.endTime).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {booking.totalPrice?.toLocaleString('vi-VN') || '0'} VND
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}
                    >
                      {getStatusLabel(booking.status)}
                    </span>
                  </td>
                  {isEditable && (
                    <td className="px-6 py-4 text-sm">
                      <button className="px-3 py-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors text-xs font-medium">
                        Chi tiết
                      </button>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={isEditable ? 7 : 6}
                  className="px-6 py-8 text-center text-gray-500"
                >
                  Không có đặt sân nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {bookings.length > itemsPerPage && (
        <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200 bg-gray-50">
          <span className="text-sm text-gray-600">
            Hiển thị {(currentPage - 1) * itemsPerPage + 1} đến{' '}
            {Math.min(currentPage * itemsPerPage, bookings.length)} trong{' '}
            {bookings.length}
          </span>
          <div className="flex space-x-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Trước
            </button>
            <button
              disabled={currentPage * itemsPerPage >= bookings.length}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Tiếp →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingsList;
