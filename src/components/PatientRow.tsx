import React from 'react';
import { MoreVertical } from 'lucide-react';

interface PatientRowProps {
  name: string;
  status: 'Critical' | 'Stable' | 'Recovering' | 'Admitted' | 'Diagnosed' | 'Consulting';
  condition: string;
  image: string;
}

const PatientRow: React.FC<PatientRowProps> = ({ name, status, condition, image }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'Critical':
        return 'text-red-500 bg-red-50';
      case 'Stable':
        return 'text-green-500 bg-green-50';
      case 'Recovering':
        return 'text-orange-500 bg-orange-50';
      case 'Admitted':
        return 'text-red-500 bg-red-50';
      case 'Diagnosed':
        return 'text-blue-500 bg-blue-50';
      case 'Consulting':
        return 'text-purple-500 bg-purple-50';
      default:
        return 'text-gray-500 bg-gray-50';
    }
  };

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center">
        <img 
          src={image} 
          alt={name} 
          className="h-10 w-10 rounded-full object-cover" 
        />
        <div className="ml-3">
          <h3 className="font-medium text-gray-900">{name}</h3>
          <p className="text-xs text-gray-500">{condition}</p>
        </div>
      </div>
      
      <div className="flex items-center">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
          {status}
        </span>
        
        <button className="p-1 ml-2 text-gray-400 hover:text-gray-600">
          <MoreVertical size={16} />
        </button>
      </div>
    </div>
  );
};

export default PatientRow;