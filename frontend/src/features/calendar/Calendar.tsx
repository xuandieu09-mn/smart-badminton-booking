import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format, addDays, startOfDay, isSameDay, isToday } from 'date-fns';
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000,
});

interface Court {
  id: number;
  name: string;
  description?: string;
  pricePerHour: number;
}

interface AvailableSlot {
  startTime: string;
  endTime: string;
}

interface BookingData {
  courtId: number;
  startTime: Date;
  endTime: Date;
}

export const Calendar: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [bookingData, setBookingData] = useState<Partial<BookingData>>({});

  // Fetch courts
  const { data: courts, isLoading: courtsLoading } = useQuery({
    queryKey: ['courts'],
    queryFn: async () => {
      const res = await API.get<Court[]>('/courts');
      return res.data;
    },
  });

  // Fetch available slots for selected court and date
  const { data: availableSlots, isLoading: slotsLoading } = useQuery({
    queryKey: ['available-slots', selectedCourt?.id, selectedDate],
    queryFn: async () => {
      if (!selectedCourt) return [];
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const res = await API.get<AvailableSlot[]>(
        `/courts/${selectedCourt.id}/available-slots?date=${dateStr}`,
      );
      return res.data;
    },
    enabled: !!selectedCourt,
  });

  // Get pricing for selected slot
  const { data: pricing } = useQuery({
    queryKey: ['pricing', selectedCourt?.id, selectedSlot],
    queryFn: async () => {
      if (!selectedCourt || !selectedSlot) return null;
      const startTime = new Date(selectedDate);
      const [startHour] = selectedSlot.startTime.split(':').map(Number);
      startTime.setHours(startHour, 0, 0, 0);

      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 1);

      const res = await API.get('/courts/' + selectedCourt.id + '/pricing', {
        params: {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        },
      });
      return res.data;
    },
    enabled: !!selectedCourt && !!selectedSlot,
  });

  // Create booking mutation
  const { mutate: createBooking, isPending: isBooking } = useMutation({
    mutationFn: async () => {
      if (!selectedCourt || !selectedSlot) throw new Error('Missing booking data');

      const startTime = new Date(selectedDate);
      const [startHour] = selectedSlot.startTime.split(':').map(Number);
      startTime.setHours(startHour, 0, 0, 0);

      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 1);

      return API.post('/bookings', {
        courtId: selectedCourt.id,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        numberOfCourts: 1,
      });
    },
    onSuccess: (response) => {
      alert('Booking created! Booking ID: ' + response.data.id);
      // Reset form
      setSelectedCourt(null);
      setSelectedSlot(null);
    },
    onError: (error: any) => {
      alert('Error creating booking: ' + error.response?.data?.message);
    },
  });

  const handleDateChange = (days: number) => {
    setSelectedDate(addDays(selectedDate, days));
    setSelectedSlot(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            📅 Đặt Sân Badminton
          </h1>
          <p className="text-gray-600">Chọn sân, ngày, và giờ bạn muốn đặt</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Court Selection */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4">🏸 Chọn Sân</h2>

              {courtsLoading ? (
                <p className="text-gray-500">Đang tải sân...</p>
              ) : (
                <div className="space-y-2">
                  {courts?.map((court) => (
                    <button
                      key={court.id}
                      onClick={() => {
                        setSelectedCourt(court);
                        setSelectedSlot(null);
                      }}
                      className={`w-full p-3 rounded-lg text-left transition ${
                        selectedCourt?.id === court.id
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                      }`}
                    >
                      <div className="font-semibold">{court.name}</div>
                      <div className="text-sm">
                        {new Intl.NumberFormat('vi-VN', {
                          style: 'currency',
                          currency: 'VND',
                        }).format(Number(court.pricePerHour))}{' '}
                        /giờ
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Center: Date & Time Selection */}
          <div className="lg:col-span-2">
            {selectedCourt && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => handleDateChange(-1)}
                      className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                    >
                      ←
                    </button>
                    <h2 className="text-2xl font-bold">
                      {format(selectedDate, 'EEEE, dd MMMM yyyy', {
                        locale: vi,
                      })}
                    </h2>
                    <button
                      onClick={() => handleDateChange(1)}
                      className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                    >
                      →
                    </button>
                  </div>

                  {/* Quick date shortcuts */}
                  <div className="flex gap-2">
                    {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                      <button
                        key={day}
                        onClick={() => setSelectedDate(addDays(new Date(), day))}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                          format(selectedDate, 'yyyy-MM-dd') ===
                          format(addDays(new Date(), day), 'yyyy-MM-dd')
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                        }`}
                      >
                        {day === 0
                          ? 'Hôm nay'
                          : day === 1
                            ? 'Ngày mai'
                            : 'T' + (2 + day)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Available Slots */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">
                    ⏰ Giờ trống ({selectedCourt.name})
                  </h3>

                  {slotsLoading ? (
                    <p className="text-gray-500">Đang tải giờ trống...</p>
                  ) : availableSlots?.length === 0 ? (
                    <p className="text-gray-500">
                      Không có giờ trống cho ngày này
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {availableSlots?.map((slot, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedSlot(slot)}
                          className={`p-3 rounded-lg font-medium transition ${
                            selectedSlot?.startTime === slot.startTime
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-100 text-gray-900 hover:bg-indigo-100'
                          }`}
                        >
                          {slot.startTime} - {slot.endTime}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pricing Info */}
                {pricing && selectedSlot && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-indigo-100 to-blue-100 rounded-lg">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Giá/Giờ</p>
                        <p className="text-lg font-bold text-indigo-600">
                          {new Intl.NumberFormat('vi-VN', {
                            style: 'currency',
                            currency: 'VND',
                          }).format(pricing.pricePerHour)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Tổng Tiền</p>
                        <p className="text-lg font-bold text-indigo-600">
                          {new Intl.NumberFormat('vi-VN', {
                            style: 'currency',
                            currency: 'VND',
                          }).format(pricing.totalPrice)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Thời Gian</p>
                        <p className="text-lg font-bold text-indigo-600">1 giờ</p>
                      </div>
                    </div>

                    <button
                      onClick={() => createBooking()}
                      disabled={isBooking}
                      className="w-full mt-4 px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
                    >
                      {isBooking ? 'Đang tạo...' : '✓ Xác nhận đặt sân'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h3 className="text-lg font-bold text-blue-900 mb-2">ℹ️ Thông Tin</h3>
          <ul className="text-blue-800 space-y-1">
            <li>• Giờ hoạt động: 6:00 - 21:00</li>
            <li>• Giá cơ bản: 50,000 VND/giờ (6:00-17:00)</li>
            <li>• Giá cao điểm: 75,000 VND/giờ (17:00-21:00)</li>
            <li>• Thanh toán: Wallet hoặc VNPay/MoMo</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
