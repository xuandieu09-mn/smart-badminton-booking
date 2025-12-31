import { useState } from 'react';
import {
  Modal,
  Table,
  Tag,
  Button,
  Descriptions,
  Popconfirm,
  message,
  Input,
  Checkbox,
  Space,
  Statistic,
  Card,
  Row,
  Col,
} from 'antd';
import {
  CalendarOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../services/api/client';

interface BookingGroupModalProps {
  groupId: number;
  visible: boolean;
  onClose: () => void;
}

interface BookingGroupDetails {
  id: number;
  userId: number;
  courtId: number;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  totalSessions: number;
  originalPrice: number;
  discountRate: number;
  finalPrice: number;
  status: 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED';
  user: {
    id: number;
    email: string;
    name: string;
    phone: string;
  };
  court: {
    id: number;
    name: string;
  };
  bookings: Array<{
    id: number;
    bookingCode: string;
    startTime: string;
    endTime: string;
    status: string;
    totalPrice: number;
    paidAmount: number;
    paymentStatus: string;
  }>;
  stats: {
    total: number;
    confirmed: number;
    checkedIn: number;
    completed: number;
    cancelled: number;
    upcoming: number;
    past: number;
  };
}

const WEEKDAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export default function BookingGroupModal({
  groupId,
  visible,
  onClose,
}: BookingGroupModalProps) {
  const [cancelReason, setCancelReason] = useState('');
  const [refundToWallet, setRefundToWallet] = useState(true);
  const [cancelOnlyFuture, setCancelOnlyFuture] = useState(false);
  const [groupQRCode, setGroupQRCode] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch booking group details
  const { data: groupDetails, isLoading } = useQuery<BookingGroupDetails>({
    queryKey: ['bookingGroup', groupId],
    queryFn: async () => {
      const response = await apiClient.get(`/bookings/groups/${groupId}`);
      return response.data;
    },
    enabled: visible && !!groupId,
  });

  // Cancel booking group mutation
  const cancelGroupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(
        `/bookings/groups/${groupId}/cancel`,
        {
          reason: cancelReason,
          refundToWallet,
          cancelOnlyFuture,
        },
      );
      return response.data;
    },
    onSuccess: (data) => {
      message.success(
        `Đã hủy ${data.cancelledBookings} booking${data.refunded ? ' và hoàn tiền' : ''}`,
      );
      queryClient.invalidateQueries({ queryKey: ['bookingGroup', groupId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      onClose();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Hủy lịch thất bại');
    },
  });

  // Generate QR code for group
  const handleGenerateQR = async () => {
    try {
      const response = await apiClient.post(`/bookings/groups/${groupId}/generate-qr`);
      setGroupQRCode(response.data.qrCode);
      message.success('QR code đã được tạo!');
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Tạo QR thất bại');
    }
  };

  const handleCancelGroup = () => {
    cancelGroupMutation.mutate();
  };

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

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      CONFIRMED: 'Đã xác nhận',
      CHECKED_IN: 'Đã check-in',
      COMPLETED: 'Hoàn thành',
      CANCELLED: 'Đã hủy',
      EXPIRED: 'Hết hạn',
      PENDING_PAYMENT: 'Chờ thanh toán',
    };
    return texts[status] || status;
  };

  const columns = [
    {
      title: '#',
      key: 'index',
      render: (_: any, __: any, index: number) => index + 1,
      width: 50,
    },
    {
      title: 'Mã booking',
      dataIndex: 'bookingCode',
      key: 'bookingCode',
      render: (code: string) => (
        <span className="font-mono text-sm">{code}</span>
      ),
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
      render: (record: any) => (
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
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      ),
    },
  ];

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <CalendarOutlined className="text-purple-500" />
          <span>Chi tiết lịch cố định #{groupId}</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={1000}
      footer={null}
      loading={isLoading}
    >
      {groupDetails && (
        <div className="space-y-6">
          {/* Statistics Cards */}
          <Row gutter={16}>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="Tổng buổi"
                  value={groupDetails.stats.total}
                  prefix={<CalendarOutlined />}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="Sắp tới"
                  value={groupDetails.stats.upcoming}
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="Hoàn thành"
                  value={groupDetails.stats.completed}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="Đã hủy"
                  value={groupDetails.stats.cancelled}
                  prefix={<CloseCircleOutlined />}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Group Information */}
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Khách hàng" span={2}>
              <div>
                <div className="font-semibold">{groupDetails.user.name}</div>
                <div className="text-sm text-gray-500">
                  {groupDetails.user.email} | {groupDetails.user.phone}
                </div>
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="Sân">
              {groupDetails.court.name}
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag
                color={
                  groupDetails.status === 'CONFIRMED'
                    ? 'green'
                    : groupDetails.status === 'CANCELLED'
                      ? 'red'
                      : 'orange'
                }
              >
                {groupDetails.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Lịch chơi">
              {groupDetails.daysOfWeek
                .map((d) => WEEKDAY_NAMES[d])
                .join(', ')}
            </Descriptions.Item>
            <Descriptions.Item label="Giờ chơi">
              {groupDetails.startTime} - {groupDetails.endTime}
            </Descriptions.Item>
            <Descriptions.Item label="Khoảng thời gian">
              {dayjs(groupDetails.startDate).format('DD/MM/YYYY')} -{' '}
              {dayjs(groupDetails.endDate).format('DD/MM/YYYY')}
            </Descriptions.Item>
            <Descriptions.Item label="Tổng số buổi">
              {groupDetails.totalSessions} buổi
            </Descriptions.Item>
            <Descriptions.Item label="Tiền gốc">
              {groupDetails.originalPrice.toLocaleString('vi-VN')}đ
            </Descriptions.Item>
            <Descriptions.Item label="Giảm giá">
              <Tag color="green">
                {groupDetails.discountRate}% (
                {(
                  groupDetails.originalPrice - groupDetails.finalPrice
                ).toLocaleString('vi-VN')}
                đ)
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Thành tiền">
              <span className="text-lg font-bold text-green-600">
                {groupDetails.finalPrice.toLocaleString('vi-VN')}đ
              </span>
            </Descriptions.Item>
          </Descriptions>

          {/* QR Code Section */}
          <Card 
            title={
              <span className="flex items-center gap-2">
                🎫 Mã QR Check-in
              </span>
            }
            size="small"
            extra={
              <Button type="primary" onClick={handleGenerateQR} size="small">
                Tạo QR Code
              </Button>
            }
          >
            {groupQRCode ? (
              <div className="text-center">
                <img 
                  src={groupQRCode} 
                  alt="Group QR Code" 
                  className="mx-auto border-2 border-blue-500 rounded"
                  style={{ width: '200px', height: '200px' }}
                />
                <p className="text-sm text-gray-600 mt-2">
                  Mã QR này dùng cho tất cả {groupDetails.totalSessions} buổi
                </p>
              </div>
            ) : (
              <p className="text-gray-500 text-center">
                Click "Tạo QR Code" để tạo mã QR cho lịch này
              </p>
            )}
          </Card>

          {/* Bookings Table */}
          <div>
            <h3 className="text-lg font-semibold mb-3">
              Danh sách các buổi ({groupDetails.bookings.length})
            </h3>
            <Table
              columns={columns}
              dataSource={groupDetails.bookings}
              rowKey="id"
              pagination={false}
              size="small"
              scroll={{ y: 400 }}
            />
          </div>

          {/* Cancel Group Section */}
          {groupDetails.status !== 'CANCELLED' &&
            groupDetails.stats.upcoming > 0 && (
              <Card
                title={
                  <span className="text-red-600 flex items-center gap-2">
                    <WarningOutlined />
                    Hủy lịch cố định
                  </span>
                }
                size="small"
              >
                <Space direction="vertical" className="w-full">
                  <Input.TextArea
                    placeholder="Lý do hủy (tùy chọn)..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    rows={2}
                  />
                  <Checkbox
                    checked={refundToWallet}
                    onChange={(e) => setRefundToWallet(e.target.checked)}
                  >
                    Hoàn tiền vào ví
                  </Checkbox>
                  <Checkbox
                    checked={cancelOnlyFuture}
                    onChange={(e) => setCancelOnlyFuture(e.target.checked)}
                  >
                    Chỉ hủy các buổi trong tương lai ({groupDetails.stats.upcoming}{' '}
                    buổi)
                  </Checkbox>

                  <Popconfirm
                    title="Xác nhận hủy lịch cố định?"
                    description={
                      <div>
                        <p>
                          Bạn đang hủy{' '}
                          <strong>
                            {cancelOnlyFuture
                              ? groupDetails.stats.upcoming
                              : groupDetails.bookings.filter(
                                  (b) => b.status !== 'CANCELLED',
                                ).length}{' '}
                            booking
                          </strong>
                        </p>
                        {refundToWallet && (
                          <p className="text-green-600">
                            Khách sẽ được hoàn tiền vào ví
                          </p>
                        )}
                      </div>
                    }
                    onConfirm={handleCancelGroup}
                    okText="Xác nhận"
                    cancelText="Hủy"
                    okButtonProps={{
                      danger: true,
                      loading: cancelGroupMutation.isPending,
                    }}
                  >
                    <Button
                      type="primary"
                      danger
                      icon={<CloseCircleOutlined />}
                      loading={cancelGroupMutation.isPending}
                      block
                    >
                      Hủy cả chuỗi
                    </Button>
                  </Popconfirm>
                </Space>
              </Card>
            )}
        </div>
      )}
    </Modal>
  );
}
