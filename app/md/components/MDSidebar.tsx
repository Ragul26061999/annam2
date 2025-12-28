'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Stethoscope,
  Pill,
  Bed,
  Settings,
  LogOut,
  UserCog,
  UsersRound,
  ChevronLeft,
  ChevronRight,
  Activity,
  DollarSign,
  User,
  BedDouble,
  RefreshCw
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  badge?: string;
}

const Sidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      href: '/md/dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard size={18} />,
      color: 'text-blue-600'
    },
    {
      href: '/md/patients',
      label: 'Patients',
      icon: <Users size={18} />,
      color: 'text-green-600'
    },
    {
      href: '/md/doctors',
      label: 'Doctor Management',
      icon: <Stethoscope size={18} />,
      color: 'text-purple-600'
    },
    {
      href: '/outpatient',
      label: 'Outpatient (OP)',
      icon: <User size={18} />,
      color: 'text-orange-600',
      badge: '42'
    },
    {
      href: '/inpatient',
      label: 'Inpatient (IP)',
      icon: <BedDouble size={18} />,
      color: 'text-purple-600'
    },
    {
      href: '/revisit',
      label: 'Revisit',
      icon: <RefreshCw size={18} />,
      color: 'text-cyan-600'
    },
    {
      href: '/appointments',
      label: 'All Appointments',
      icon: <Calendar size={18} />,
      color: 'text-orange-600'
    },
    {
      href: '/md/workstation',
      label: 'Workstation',
      icon: <Activity size={18} />,
      color: 'text-teal-600'
    },
    {
      href: '/md/pharmacy',
      label: 'Pharmacy',
      icon: <Pill size={18} />,
      color: 'text-red-600'
    },
    {
      href: '/md/beds',
      label: 'Bed Management',
      icon: <Bed size={18} />,
      color: 'text-pink-600'
    },
    {
      href: '/md/finance',
      label: 'Finance',
      icon: <DollarSign size={18} />,
      color: 'text-emerald-600'
    },
  ];

  const handleLogout = () => {
    // Add logout logic here
    console.log('Logging out...');
  };

  return (
    <aside className={`${isCollapsed ? 'w-16' : 'w-64'} glass-sidebar h-full flex flex-col shadow-xl transition-all duration-300 ease-in-out`}>
      {/* Header */}
      <div className="h-20 border-b border-gray-100 flex items-center justify-between px-4">
        <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : ''}`}>
          <div className="flex items-center justify-center">
            <Image
              src="/logo/annamHospital-bg.png"
              alt="Annam Hospital"
              width={64}
              height={64}
              className="w-16 h-16 object-contain"
            />
          </div>
        </div>

        {!isCollapsed && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <ChevronLeft size={16} className="text-gray-500" />
          </button>
        )}
      </div>

      {/* Expand button for collapsed state */}
      {isCollapsed && (
        <div className="px-2 py-2 border-b border-gray-100">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full p-1.5 hover:bg-gray-100 rounded-lg transition-colors duration-200 flex justify-center"
          >
            <ChevronRight size={16} className="text-gray-500" />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center px-4 py-3 rounded-xl transition-all duration-300 relative overflow-hidden backdrop-blur-sm ${isActive
                ? 'bg-gradient-to-r from-orange-100/90 to-orange-200/70 text-orange-700 shadow-lg border border-orange-200/50'
                : 'text-gray-600 hover:bg-gradient-to-r hover:from-orange-50/80 hover:to-orange-100/60 hover:text-orange-700 hover:shadow-md'
                }`}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-orange-400 to-orange-500 rounded-r-full shadow-sm"></div>
              )}

              {/* Icon */}
              <div className={`flex-shrink-0 ${isActive ? 'text-orange-600' : 'text-orange-500'} transition-colors duration-300`}>
                {item.icon}
              </div>

              {/* Label and Badge */}
              {!isCollapsed && (
                <div className="flex items-center justify-between w-full ml-3">
                  <span className="font-medium text-sm">{item.label}</span>
                  {item.badge && (
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${isActive
                      ? 'bg-orange-200 text-orange-700'
                      : 'bg-gray-200 text-gray-600'
                      }`}>
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile Section */}
      {!isCollapsed && (
        <div className="px-2 py-3 border-t border-gray-100">
          <div className="flex items-center space-x-3 p-2.5 bg-gray-50 rounded-xl">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
              DR
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 text-sm">Dr. Selvan</p>
              <p className="text-xs text-gray-500">Chief Doctor (MD)</p>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="px-2 py-3 border-t border-gray-100 space-y-1">
        <button className="w-full flex items-center px-3 py-2.5 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl transition-all duration-200">
          <Settings size={18} />
          {!isCollapsed && <span className="ml-3 font-medium text-sm">Settings</span>}
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
        >
          <LogOut size={18} />
          {!isCollapsed && <span className="ml-3 font-medium text-sm">Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;