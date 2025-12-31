import { useState } from 'react';
import {
  DatePicker,
  TimePicker,
  Select,
  Checkbox,
  Button,
  Alert,
  Card,
  message,
  Spin,
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../../services/api/client';

const { RangePicker } = DatePicker;

interface Court {
  id: number;
  name: string;
  description?: string;
  pricePerHour: number;
  isActive: boolean;
}

interface BookingSummary {
  totalSessions: number;
  originalPrice: number;
  discountRate: number;
  discountAmount: number;
  finalPrice: number;
  courtName: string;
  schedule: string;
  period: string;
  discount: string;
}

interface ConflictDate {
  date: string;
  day: string;
  bookingCode: string;
}

interface CheckAvailabilityResponse {
  success: boolean;
  summary?: BookingSummary;
  conflicts?: ConflictDate[];
  message?: string;
}

const WEEKDAYS = [
  { value: 1, label: 'Thứ 2' },
  { value: 2, label: 'Thứ 3' },
  { value: 3, label: 'Thứ 4' },
  { value: 4, label: 'Thứ 5' },
  { value: 5, label: 'Thứ 6' },
  { value: 6, label: 'Thứ 7' },
  { value: 0, label: 'Chủ nhật' },
];

export default function FixedScheduleBooking() {
  const [selectedCourt, setSelectedCourt] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [timeRange, setTimeRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [summary, setSummary] = useState<BookingSummary | null>(null);
  const [conflicts, setConflicts] = useState<ConflictDate[]>([]);
  const [successData, setSuccessData] = useState<any>(null);

  // Fetch courts
  const { data: courts, isLoading: courtsLoading } = useQuery<Court[]>({
    queryKey: ['courts'],
    queryFn: async () => {
      const response = await apiClient.get('/courts');
      return response.data;
    },
  });

  // Check availability mutation
  const checkAvailabilityMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCourt || !dateRange || !timeRange || selectedWeekdays.length === 0) {
        throw new Error('Vui lòng điền đầy đủ thông tin');
      }

      const [startDate, endDate] = dateRange;
      const [startTime, endTime] = timeRange;

      const payload = {
        courtId: selectedCourt,
        startDate: startDate.format('YYYY-MM-DD'),
        endDate: endDate.format('YYYY-MM-DD'),
        daysOfWeek: selectedWeekdays,
        startTime: startTime.format('HH:mm'),
        endTime: endTime.format('HH:mm'),
      };

      // Simulate API call - you can replace with actual endpoint
      const response = await apiClient.post('/bookings/fixed/check', payload);
      return response.data;
    },
    onSuccess: (data: CheckAvailabilityResponse) => {
      if (data.success && data.summary) {
        setSummary(data.summary);
        setConflicts([]);
        message.success('Kiểm tra thành công! Lịch trống.');
      } else if (data.conflicts && data.conflicts.length > 0) {
        setConflicts(data.conflicts);
        setSummary(null);
        message.error(`Có ${data.conflicts.length} ngày bị trùng lịch`);
      }
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error.message || 'Có lỗi xảy ra';
      message.error(errorMsg);
      setSummary(null);
      setConflicts([]);
    },
  });

  // Create fixed booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCourt || !dateRange || !timeRange || selectedWeekdays.length === 0) {
        throw new Error('Vui lòng điền đầy đủ thông tin');
      }

      const [startDate, endDate] = dateRange;
      const [startTime, endTime] = timeRange;

      const payload = {
        courtId: selectedCourt,
        startDate: startDate.format('YYYY-MM-DD'),
        endDate: endDate.format('YYYY-MM-DD'),
        daysOfWeek: selectedWeekdays,
        startTime: startTime.format('HH:mm'),
        endTime: endTime.format('HH:mm'),
      };

      const response = await apiClient.post('/bookings/fixed', payload);
      return response.data;
    },
    onSuccess: (data) => {
      message.success('Đặt lịch cố định thành công! 🎉');
      setSuccessData(data); // Store response data including QR code
      // Don't reset form immediately, let user see the QR code
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || 'Đặt lịch thất bại';
      message.error(errorMsg);
    },
  });

  const handleCheckAvailability = () => {
    checkAvailabilityMutation.mutate();
  };

  const handleCreateBooking = () => {
    if (!summary) {
      message.warning('Vui lòng kiểm tra tình trạng trước khi đặt');
      return;
    }
    createBookingMutation.mutate();
  };

  const handleWeekdayChange = (checkedValues: number[]) => {
    setSelectedWeekdays(checkedValues);
    // Reset summary when changing weekdays
    setSummary(null);
    setConflicts([]);
  };

  const isFormValid =
    selectedCourt !== null &&
    dateRange !== null &&
    timeRange !== null &&
    selectedWeekdays.length > 0;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <Card className="shadow-lg">
        <div className="space-y-6">
          {/* Header */}
          <div className="border-b pb-4">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <CalendarOutlined className="text-blue-500" />
              Đặt lịch cố định
            </h2>
            <p className="text-gray-500 mt-1">
              Đặt nhiều buổi cùng lúc và nhận ưu đãi giảm giá
            </p>
          </div>

          {/* Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Court Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chọn sân <span className="text-red-500">*</span>
                  </label>
                  <Select
                    className="w-full"
                    size="large"
                    placeholder="Chọn sân chơi"
                    loading={courtsLoading}
                    value={selectedCourt}
                    onChange={(value) => {
                      setSelectedCourt(value);
                      setSummary(null);
                      setConflicts([]);
                    }}
                    options={courts
                      ?.filter((court) => court.isActive)
                      .map((court) => ({
                        value: court.id,
                        label: `${court.name} - ${court.pricePerHour.toLocaleString('vi-VN')}đ/giờ`,
                      }))}
                  />
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Khoảng thời gian <span className="text-red-500">*</span>
                  </label>
                  <RangePicker
                    className="w-full"
                    size="large"
                    format="DD/MM/YYYY"
                    placeholder={['Ngày bắt đầu', 'Ngày kết thúc']}
                    disabledDate={(current) =>
                      current && current < dayjs().startOf('day')
                    }
                    value={dateRange}
                    onChange={(dates) => {
                      setDateRange(dates as [Dayjs, Dayjs]);
                      setSummary(null);
                      setConflicts([]);
                    }}
                  />
                </div>

                {/* Time Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Giờ chơi <span className="text-red-500">*</span>
                  </label>
                  <TimePicker.RangePicker
                    className="w-full"
                    size="large"
                    format="HH:mm"
                    placeholder={['Giờ bắt đầu', 'Giờ kết thúc']}
                    minuteStep={30}
                    value={timeRange}
                    onChange={(times) => {
                      setTimeRange(times as [Dayjs, Dayjs]);
                      setSummary(null);
                      setConflicts([]);
                    }}
                  />
                </div>

                {/* Weekdays Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Thứ trong tuần <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg">
                    <Checkbox.Group
                      value={selectedWeekdays}
                      onChange={handleWeekdayChange}
                      className="flex flex-wrap gap-3"
                    >
                      {WEEKDAYS.map((day) => (
                        <Checkbox
                          key={day.value}
                          value={day.value}
                          className="m-0"
                        >
                          <span className="font-medium">{day.label}</span>
                        </Checkbox>
                      ))}
                    </Checkbox.Group>
                  </div>
                </div>
              </div>

          {/* Check Availability Button */}
          <div className="flex justify-center pt-4">
                <Button
                  type="primary"
                  size="large"
                  icon={<CheckCircleOutlined />}
                  onClick={handleCheckAvailability}
                  loading={checkAvailabilityMutation.isPending}
                  disabled={!isFormValid}
                  className="px-8"
                >
                  Kiểm tra tình trạng
                </Button>
          </div>

          {/* Discount Info Banner */}
          <Alert
                title="💰 Ưu đãi giảm giá"
                description={
                  <div className="space-y-1">
                    <p>✅ Đặt trên 4 buổi: Giảm 5%</p>
                    <p>✅ Đặt trên 8 buổi: Giảm 10%</p>
                  </div>
                }
                type="info"
                showIcon
                className="bg-blue-50 border-blue-200"
          />

          {/* Conflicts Warning */}
          {conflicts.length > 0 && (
                <Alert
                  title="⚠️ Có ngày bị trùng lịch"
                  description={
                    <div className="space-y-2 mt-2">
                      <p className="font-medium">
                        Các ngày sau đã có lịch đặt trước:
                      </p>
                      <div className="space-y-1 max-h-60 overflow-y-auto">
                        {conflicts.map((conflict, index) => (
                          <div
                            key={index}
                            className="p-2 bg-red-50 rounded border border-red-200"
                          >
                            <span className="font-semibold text-red-700">
                              {dayjs(conflict.date).format('DD/MM/YYYY')}
                            </span>
                            <span className="text-gray-600 ml-2">
                              ({conflict.day})
                            </span>
                            <span className="text-xs text-gray-500 ml-2">
                              - Mã đặt: {conflict.bookingCode}
                            </span>
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-gray-600 mt-3">
                        💡 Vui lòng chọn sân khác hoặc đổi giờ chơi
                      </p>
                    </div>
                  }
                  type="error"
                  showIcon
                  icon={<WarningOutlined />}
            />
          )}

          {/* Success Summary */}
          {summary && (
                <Card className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-300">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-700 font-bold text-lg">
                      <CheckCircleOutlined className="text-2xl" />
                      <span>Lịch trống - Sẵn sàng đặt!</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Sân:</span>
                          <span className="font-semibold">
                            {summary.courtName}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Lịch chơi:</span>
                          <span className="font-semibold">
                            {summary.schedule}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Thời gian:</span>
                          <span className="font-semibold">{summary.period}</span>
                        </div>
                      </div>

                      <div className="space-y-2 bg-white p-4 rounded-lg shadow">
                        <div className="flex justify-between text-lg">
                          <span className="text-gray-600">Tổng số buổi:</span>
                          <span className="font-bold text-blue-600">
                            {summary.totalSessions} buổi
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tổng tiền gốc:</span>
                          <span className="font-semibold">
                            {summary.originalPrice.toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                        {summary.discountRate > 0 && (
                          <>
                            <div className="flex justify-between text-green-600">
                              <span>Giảm giá ({summary.discountRate}%):</span>
                              <span className="font-semibold">
                                -{summary.discountAmount.toLocaleString('vi-VN')}đ
                              </span>
                            </div>
                            <div className="border-t pt-2 mt-2"></div>
                          </>
                        )}
                        <div className="flex justify-between text-xl font-bold text-green-700">
                          <span>Thành tiền:</span>
                          <span>
                            {summary.finalPrice.toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Confirm Booking Button */}
                    <div className="flex justify-center pt-4">
                      <Button
                        type="primary"
                        size="large"
                        danger
                        onClick={handleCreateBooking}
                        loading={createBookingMutation.isPending}
                        className="px-12 h-12 text-lg font-semibold"
                      >
                        Xác nhận đặt lịch
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

          {/* Success Result with QR Code */}
          {successData && (
                <Card className="mt-6 bg-green-50 border-2 border-green-500">
                  <div className="text-center space-y-4">
                    <div className="flex justify-center">
                      <CheckCircleOutlined className="text-6xl text-green-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-green-700">
                      Đặt lịch thành công! 🎉
                    </h3>
                    <p className="text-gray-700">
                      Mã nhóm: <strong>#{successData.bookingGroup?.id}</strong>
                    </p>
                    <p className="text-gray-700">
                      Tổng {successData.bookingGroup?.totalSessions} buổi - 
                      Đã thanh toán {successData.bookingGroup?.finalPrice?.toLocaleString('vi-VN')}đ
                    </p>

                    {/* QR Code Display */}
                    {successData.bookingGroup?.qrCode && (
                      <div className="bg-white p-6 rounded-lg inline-block">
                        <p className="font-semibold mb-3 text-gray-800">
                          🎫 Mã QR Check-in (Dùng cho tất cả {successData.bookingGroup.totalSessions} buổi)
                        </p>
                        <img 
                          src={successData.bookingGroup.qrCode} 
                          alt="QR Code" 
                          className="mx-auto border-4 border-blue-500 rounded-lg"
                          style={{ width: '250px', height: '250px' }}
                        />
                        <p className="text-sm text-gray-600 mt-3">
                          Lưu mã QR này hoặc kiểm tra email để sử dụng khi check-in
                        </p>
                      </div>
                    )}

                    <Button
                      type="primary"
                      size="large"
                      onClick={() => {
                        setSuccessData(null);
                        setSelectedCourt(null);
                        setDateRange(null);
                        setSelectedWeekdays([]);
                        setTimeRange(null);
                        setSummary(null);
                        setConflicts([]);
                      }}
                      className="mt-4"
                    >
                      Đặt lịch mới
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </Card>
      </div>
  );
}