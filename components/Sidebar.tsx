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
  UsersRound,
  ChevronLeft,
  ChevronRight,
  Activity,
  IndianRupee,
  User,
  BedDouble,
  Microscope,
  Radiation,
  RefreshCw,
  FileText,
  Scissors,
  ShoppingCart,
  RotateCcw,
  Building2,
  Receipt,
  Package,
  AlertTriangle,
  Wallet
} from 'lucide-react';
import { getCurrentUserProfile, signOut } from '@/src/lib/supabase';
import { useRouter } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  badge?: string;
}

const Sidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  React.useEffect(() => {
    getCurrentUserProfile()
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

  const navItems: NavItem[] = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard size={18} />,
      color: 'text-blue-600'
    },
    {
      href: '/doctors',
      label: 'Doctors',
      icon: <Stethoscope size={18} />,
      color: 'text-purple-600'
    },
    {
      href: '/staff',
      label: 'Staff',
      icon: <UsersRound size={18} />,
      color: 'text-orange-600'
    },
    {
      href: '/patients',
      label: 'Patients',
      icon: <Users size={18} />,
      color: 'text-green-600'
    },
    {
      href: '/outpatient',
      label: 'Outpatient (OP)',
      icon: <User size={18} />,
      color: 'text-orange-600',
      // badge: '42'
    },
    {
      href: '/under-construction',
      label: 'Inpatient (IP)',
      icon: <BedDouble size={18} />,
      color: 'text-purple-600'
    },
    {
      href: '/appointments',
      label: 'All Appointments',
      icon: <Stethoscope size={18} />,
      color: 'text-blue-600'
    },
    {
      href: '/pharmacy',
      label: 'Pharmacy',
      icon: <Pill size={18} />,
      color: 'text-pink-600'
    },
    {
      href: '/lab-xray',
      label: 'Lab & X-Ray',
      icon: <Microscope size={18} />,
      color: 'text-teal-600'
    },
    {
      href: '/beds',
      label: 'Bed Management',
      icon: <Bed size={18} />,
      color: 'text-yellow-600'
    },
    {
      href: '/under-construction',
      label: 'Finance',
      icon: <IndianRupee size={18} />,
      color: 'text-emerald-600'
    },
    {
      href: '/other-bills',
      label: 'Other Bills',
      icon: <FileText size={18} />,
      color: 'text-cyan-600'
    },
    {
      href: '/surgery-charges',
      label: 'Surgery Charges',
      icon: <Scissors size={18} />,
      color: 'text-purple-600'
    },
  ];

  const pharmacyNavItems: NavItem[] = [
    {
      href: '/pharmacy',
      label: 'Dashboard',
      icon: <LayoutDashboard size={18} />,
      color: 'text-blue-600'
    },
    {
      href: '/pharmacy/purchase',
      label: 'Drug Purchase',
      icon: <ShoppingCart size={18} />,
      color: 'text-green-600'
    },
    {
      href: '/pharmacy/purchase-return',
      label: 'Purchase Return',
      icon: <RotateCcw size={18} />,
      color: 'text-orange-600'
    },
    {
      href: '/pharmacy/department-issue',
      label: 'Dept Issue',
      icon: <Building2 size={18} />,
      color: 'text-purple-600'
    },
    {
      href: '/pharmacy/newbilling',
      label: 'Drug Sales',
      icon: <Receipt size={18} />,
      color: 'text-emerald-600'
    },
    {
      href: '/pharmacy/sales-return-v2',
      label: 'Sales Return',
      icon: <RotateCcw size={18} />,
      color: 'text-red-600'
    },
    {
      href: '/pharmacy/drug-broken',
      label: 'Drug Broken',
      icon: <AlertTriangle size={18} />,
      color: 'text-amber-600'
    },
    {
      href: '/pharmacy/reports',
      label: 'Medical Report',
      icon: <FileText size={18} />,
      color: 'text-indigo-600'
    },
    {
      href: '/pharmacy/reports?tab=gst',
      label: 'GST Report',
      icon: <IndianRupee size={18} />,
      color: 'text-teal-600'
    },
    {
      href: '/pharmacy/reports?tab=stock',
      label: 'Stock Report',
      icon: <Package size={18} />,
      color: 'text-cyan-600'
    },
    {
      href: '/pharmacy/cash-collection',
      label: 'Cash Collection',
      icon: <Wallet size={18} />,
      color: 'text-emerald-600'
    },
  ];

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  const filteredNavItems = navItems.filter(item => {
    if (!user) return item.href === '/dashboard';
    const role = user.role?.toLowerCase();
    
    // MD and Admin have full access
    if (role === 'md' || role === 'admin' || role === 'administrator') return true;
    
    // Define allowed paths per role
    const permissions: Record<string, string[]> = {
      doctor: ['/dashboard', '/patients', '/appointments', '/under-construction', '/outpatient', '/lab-xray', '/beds', '/surgery-charges'],
      nurse: ['/dashboard', '/patients', '/under-construction', '/outpatient', '/beds'],
      pharmacist: ['/dashboard', '/pharmacy', '/pharmacy/purchase', '/pharmacy/purchase-return', '/pharmacy/department-issue', '/pharmacy/newbilling', '/pharmacy/sales-return-v2', '/pharmacy/drug-broken', '/pharmacy/reports', '/pharmacy/reports?tab=gst', '/pharmacy/reports?tab=stock', '/pharmacy/cash-collection'],
      technician: ['/dashboard', '/lab-xray'],
      receptionist: ['/dashboard', '/patients', '/appointments', '/under-construction', '/other-bills'],
      accountant: ['/dashboard', '/under-construction', '/other-bills'],
      patient: ['/dashboard', '/appointments']
    };
    
    const allowed = permissions[role] || [];
    return allowed.includes(item.href);
  });

  return (
    <aside className={`${isCollapsed ? 'w-16' : 'w-64'} glass-sidebar h-full flex flex-col shadow-xl transition-all duration-300 ease-in-out print:hidden`}>
      {/* Header */}
      <div className="h-20 border-b border-gray-100 flex items-center justify-between px-4">
        <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : ''}`}>
          <div className="flex items-center justify-center">
            <Image
              src="/logo/annamHospital-bg.png"
              alt="Annam Hospital"
              width={256}
              height={128}
              className="w-18 h-18 object-contain"
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
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="space-y-2 px-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : user && user.role?.toLowerCase() === 'pharmacist' ? (
          // Show pharmacy-specific navigation
          pharmacyNavItems.map((item) => {
            const isActive = pathname && (pathname === item.href || (item.href.includes('?') && pathname.includes(item.href.split('?')[0])));
            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className={`group flex items-center px-4 py-3 rounded-xl transition-all duration-300 relative overflow-hidden backdrop-blur-sm ${isActive
                  ? 'bg-white/90 shadow-lg border border-gray-200/50'
                  : 'text-gray-600 hover:bg-gradient-to-r hover:from-blue-100 hover:via-purple-100 hover:to-pink-100 hover:shadow-md'
                  }`}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${item.color.replace('text-', 'bg-')} rounded-r-full shadow-sm`}></div>
                )}

                {/* Icon */}
                <div className={`flex-shrink-0 ${item.color} transition-colors duration-300`}>
                  {item.icon}
                </div>

                {/* Label and Badge */}
                {!isCollapsed && (
                  <div className="flex items-center justify-between w-full ml-3">
                    <span className={`font-medium text-sm ${isActive ? item.color : 'text-gray-600'}`}>{item.label}</span>
                    {item.badge && (
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${isActive
                        ? `${item.color.replace('text-', 'bg-')}/20 ${item.color}`
                        : 'bg-gray-200 text-gray-600'
                        }`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })
        ) : (
          // Show regular navigation
          filteredNavItems.map((item) => {
            const isActive = pathname && pathname === item.href;
            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className={`group flex items-center px-4 py-3 rounded-xl transition-all duration-300 relative overflow-hidden backdrop-blur-sm ${isActive
                  ? 'bg-white/90 shadow-lg border border-gray-200/50'
                  : 'text-gray-600 hover:bg-gradient-to-r hover:from-blue-100 hover:via-purple-100 hover:to-pink-100 hover:shadow-md'
                  }`}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${item.color.replace('text-', 'bg-')} rounded-r-full shadow-sm`}></div>
                )}

                {/* Icon */}
                <div className={`flex-shrink-0 ${item.color} transition-colors duration-300`}>
                  {item.icon}
                </div>

                {/* Label and Badge */}
                {!isCollapsed && (
                  <div className="flex items-center justify-between w-full ml-3">
                    <span className={`font-medium text-sm ${isActive ? item.color : 'text-gray-600'}`}>{item.label}</span>
                    {item.badge && (
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${isActive
                        ? `${item.color.replace('text-', 'bg-')}/20 ${item.color}`
                        : 'bg-gray-200 text-gray-600'
                        }`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })
        )}
      </nav>

      {/* User Profile Section */}
      {!isCollapsed && (
        <div className="px-2 py-3 border-t border-gray-100">
          {loading ? (
            <div className="flex items-center space-x-3 p-2.5 bg-gray-50 rounded-xl animate-pulse">
              <div className="w-8 h-8 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-20" />
                <div className="h-3 bg-gray-200 rounded w-16" />
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-3 p-2.5 bg-gray-50 rounded-xl">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-sm truncate w-32">{user?.name || 'Guest'}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role || 'Visitor'}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Actions */}
      <div className="px-2 py-3 border-t border-gray-100 space-y-1">
        <Link 
          href="/settings"
          className="w-full flex items-center px-3 py-2.5 text-gray-600 hover:bg-gradient-to-r hover:from-blue-100 hover:to-purple-100 hover:text-gray-900 rounded-xl transition-all duration-200"
        >
          <Settings size={18} />
          {!isCollapsed && <span className="ml-3 font-medium text-sm">Settings</span>}
        </Link>

        <button
          onClick={handleLogout}
          className="w-full flex items-center px-3 py-2.5 text-red-600 hover:bg-gradient-to-r hover:from-red-100 hover:to-pink-100 rounded-xl transition-all duration-200"
        >
          <LogOut size={18} />
          {!isCollapsed && <span className="ml-3 font-medium text-sm">Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;