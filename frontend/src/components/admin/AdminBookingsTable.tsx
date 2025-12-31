import { useState } from 'react';
import { Table, Tag, Button, Space, Input, DatePicker } from 'antd';
import { CalendarOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import BookingGroupBadge from './BookingGroupBadge';
import BookingGroupModal from './BookingGroupModal';

interface Booking {
  id: number;
  bookingCode: string;
  userId: number;
  userName: string;
  courtId: number;
  courtName: string;
  startTime: string;
  endTime: string;
  status: string;
  totalPrice: number;
  bookingGroupId?: number | null;
  bookingGroup?: {
    id: number;
    totalSessions: number;
    status: string;
  };
}

interface AdminBookingsTableProps {
  bookings: Booking[];
  loading?: boolean;
}

/**
 * Admin bookings table with booking group badge integration
 * Shows "Lịch tháng" badge for fixed schedule bookings
 */
export default function AdminBookingsTable({
  bookings,
  loading,
}: AdminBookingsTableProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);

  // Filter bookings
  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      !searchText ||
      booking.bookingCode.toLowerCase().includes(searchText.toLowerCase()) ||
      booking.userName.toLowerCase().includes(searchText.toLowerCase());

    const matchesDate =
      !selectedDate ||
      dayjs(booking.startTime).isSame(selectedDate, 'day');

    return matchesSearch && matchesDate;
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      CONFIRMED: 'blue',
      CHECKED_IN: 'cyan',
      COMPLETED: 'green',
      CANCELLED: 'red',
      EXPIRED: 'gray',
      PENDING_PAYMENT: 'orange',
    };
    return colors[status] || 'default';
  };

  const columns = [
    {
      title: 'Mã booking',
      dataIndex: 'bookingCode',
      key: 'bookingCode',
      render: (code: string) => (
        <span className="font-mono text-sm">{code}</span>
      ),
    },
    {
      title: 'Khách hàng',
      dataIndex: 'userName',
      key: 'userName',
      render: (name: string, record: Booking) => (
        <div className="flex items-center gap-2">
          <span>{name}</span>
          {/* Badge for fixed schedule bookings */}
          <BookingGroupBadge
            bookingGroupId={record.bookingGroupId}
            totalSessions={record.bookingGroup?.totalSessions}
            onClick={() => {
              if (record.bookingGroupId) {
                setSelectedGroupId(record.bookingGroupId);
              }
            }}
          />
        </div>
      ),
    },
    {
      title: 'Sân',
      dataIndex: 'courtName',
      key: 'courtName',
    },
    {
      title: 'Ngày chơi',
      dataIndex: 'startTime',
      key: 'date',
      render: (startTime: string) => (
        <div>
          <div className="font-semibold">
            {dayjs(startTime).format('DD/MM/YYYY')}
          </div>
          <div className="text-xs text-gray-500">
            {dayjs(startTime).format('dddd')}
          </div>
        </div>
      ),
    },
    {
      title: 'Giờ',
      key: 'time',
      render: (record: Booking) => (
        <span>
          {dayjs(record.startTime).format('HH:mm')} -{' '}
          {dayjs(record.endTime).format('HH:mm')}
        </span>
      ),
    },
    {
      title: 'Giá',
      dataIndex: 'totalPrice',
      key: 'price',
      render: (price: number) => (
        <span className="font-semibold">
          {price.toLocaleString('vi-VN')}đ
        </span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status}</Tag>
      ),
    },
    {
      title: 'Hành động',
      key: 'actions',
      render: (record: Booking) => (
        <Space>
          <Button size="small" type="link">
            Chi tiết
          </Button>
          {record.bookingGroupId && (
            <Button
              size="small"
              type="link"
              icon={<CalendarOutlined />}
              onClick={() => setSelectedGroupId(record.bookingGroupId!)}
            >
              Xem nhóm
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4">
        <Input
          placeholder="Tìm mã booking hoặc tên khách..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-64"
        />
        <DatePicker
          placeholder="Chọn ngày"
          value={selectedDate}
          onChange={setSelectedDate}
          format="DD/MM/YYYY"
          allowClear
        />
      </div>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={filteredBookings}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `Tổng ${total} booking`,
        }}
      />

      {/* Booking Group Modal */}
      {selectedGroupId && (
        <BookingGroupModal
          groupId={selectedGroupId}
          visible={!!selectedGroupId}
          onClose={() => setSelectedGroupId(null)}
        />
      )}
    </div>
  );
}
