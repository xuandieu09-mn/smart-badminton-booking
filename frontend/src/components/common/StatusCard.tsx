import React from 'react';

interface StatusCardProps {
  status?: 'success' | 'warning' | 'error' | 'info';
  title: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

const statusColors = {
  success: 'border-t-green-500',
  warning: 'border-t-yellow-500',
  error: 'border-t-red-500',
  info: 'border-t-primary-600',
};

export const StatusCard: React.FC<StatusCardProps> = ({
  status,
  title,
  children,
  className = '',
  actions,
}) => {
  const borderClass = status ? statusColors[status] : 'border-t-slate-200';
  
  return (
    <div className={`bg-white rounded-lg shadow-sm border-t-4 ${borderClass} p-6 ${className}`}>
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
        {actions && <div>{actions}</div>}
      </div>
      {children}
    </div>
  );
};
