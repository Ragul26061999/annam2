import React, { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  change?: string; // optional change text
  trend?: 'up' | 'down'; // optional trend direction
  icon: ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, trend, icon }) => {
  return (
    <div className="card">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-500 text-sm">{title}</p>
          <h3 className="text-2xl font-medium text-gray-900 mt-1">{value}</h3>
        </div>
        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
          {icon}
        </div>
      </div>
      {typeof change !== 'undefined' && (
        <div className={`flex items-center mt-4 text-sm ${trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-500'}`}>
          {trend === 'up' ? <TrendingUp size={16} className="mr-1" /> : trend === 'down' ? <TrendingDown size={16} className="mr-1" /> : null}
          {change}
        </div>
      )}
    </div>
  );
};

export default StatCard;