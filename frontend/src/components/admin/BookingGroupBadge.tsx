import { Tag, Tooltip, Badge } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';

interface BookingGroupBadgeProps {
  bookingGroupId?: number | null;
  totalSessions?: number;
  onClick?: () => void;
}

/**
 * Badge component to indicate fixed schedule bookings
 * Shows purple "Lịch tháng" tag next to customer name
 */
export default function BookingGroupBadge({
  bookingGroupId,
  totalSessions,
  onClick,
}: BookingGroupBadgeProps) {
  if (!bookingGroupId) {
    return null;
  }

  return (
    <Tooltip
      title={`Lịch cố định - Nhóm #${bookingGroupId} (${totalSessions || 0} buổi)`}
    >
      <Tag
        icon={<CalendarOutlined />}
        color="purple"
        onClick={onClick}
        className="cursor-pointer hover:opacity-80 transition-opacity"
      >
        <Badge count={totalSessions || 0} showZero={false} offset={[10, 0]}>
          <span className="font-semibold">Lịch tháng</span>
        </Badge>
      </Tag>
    </Tooltip>
  );
}
