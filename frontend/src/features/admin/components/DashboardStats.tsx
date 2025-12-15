import React from 'react';

interface DashboardStatsProps {
  stats: {
    totalBookings: number;
    totalRevenue: number;
    totalUsers: number;
    occupancyRate: number;
    todayBookings: number;
    pendingPayments: number;
  };
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
  const statCards = [
    {
      label: 'Tổng đặt sân',
      value: stats.totalBookings,
      icon: '📅',
      color: 'bg-blue-50 border-blue-200',
      textColor: 'text-blue-700',
    },
    {
      label: 'Doanh thu',
      value: `${(stats.totalRevenue || 0).toLocaleString('vi-VN')} VND`,
      icon: '💰',
      color: 'bg-green-50 border-green-200',
      textColor: 'text-green-700',
    },
    {
      label: 'Tổng người dùng',
      value: stats.totalUsers,
      icon: '👥',
      color: 'bg-purple-50 border-purple-200',
      textColor: 'text-purple-700',
    },
    {
      label: 'Tỷ lệ sử dụng',
      value: `${(stats.occupancyRate || 0).toFixed(1)}%`,
      icon: '📊',
      color: 'bg-orange-50 border-orange-200',
      textColor: 'text-orange-700',
    },
    {
      label: 'Đặt sân hôm nay',
      value: stats.todayBookings,
      icon: '🎯',
      color: 'bg-red-50 border-red-200',
      textColor: 'text-red-700',
    },
    {
      label: 'Chờ thanh toán',
      value: stats.pendingPayments,
      icon: '⏳',
      color: 'bg-yellow-50 border-yellow-200',
      textColor: 'text-yellow-700',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {statCards.map((card, index) => (
        <div
          key={index}
          className={`${card.color} border rounded-lg p-6 hover:shadow-lg transition-shadow`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-600 font-medium">{card.label}</p>
              <p className={`text-2xl font-bold mt-2 ${card.textColor}`}>
                {typeof card.value === 'number'
                  ? card.value.toLocaleString()
                  : card.value}
              </p>
            </div>
            <span className="text-3xl">{card.icon}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardStats;
