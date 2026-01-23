import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
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
  FileText
} from 'lucide-react';

interface SidebarProps {
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onLogout }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname?.includes(path);
  };

  const handleLogout = () => {
    onLogout();
    router.push('/login');
  };

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-gray-100 h-full flex flex-col shadow-neu-flat transition-all duration-300`}>
      {/* Logo */}
      <div className="flex items-center justify-between h-16 border-b border-gray-200 px-4">
        <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : ''}`}>
          <div className="h-10 w-10 flex items-center justify-center">
            <img 
              src="/images/logo.png" 
              alt="Annam Hospital" 
              className="h-full w-auto object-contain"
            />
          </div>
          {!isCollapsed && <span className="ml-2 text-xl font-medium text-gray-900">Annam Hospital</span>}
        </div>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="neu-icon bg-gray-200 hover:bg-gray-300"
        >
          {isCollapsed ? 
            <ChevronRight size={20} className="text-gray-600" /> : 
            <ChevronLeft size={20} className="text-gray-600" />
          }
        </button>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        <Link href="/dashboard" className={isActive('/dashboard') ? 'nav-link active' : 'nav-link'}>
          <div className="neu-icon bg-blue-100">
            <LayoutDashboard className="text-blue-500" size={20} />
          </div>
          {!isCollapsed && <span>Dashboard</span>}
        </Link>
        
        <Link href="/patients" className={isActive('/patients') ? 'nav-link active' : 'nav-link'}>
          <div className="neu-icon bg-green-100">
            <Users className="text-green-500" size={20} />
          </div>
          {!isCollapsed && <span>Patients</span>}
        </Link>
        
        <Link href="/doctors" className={isActive('/doctors') ? 'nav-link active' : 'nav-link'}>
          <div className="neu-icon bg-orange-100">
            <Stethoscope className="text-orange-500" size={20} />
          </div>
          {!isCollapsed && <span>Doctors</span>}
        </Link>

        <Link href="/staff" className={isActive('/staff') ? 'nav-link active' : 'nav-link'}>
          <div className="neu-icon bg-red-100">
            <UsersRound className="text-red-500" size={20} />
          </div>
          {!isCollapsed && <span>Staff</span>}
        </Link>
        
        <Link href="/appointments" className={isActive('/appointments') ? 'nav-link active' : 'nav-link'}>
          <div className="neu-icon bg-purple-100">
            <Calendar className="text-purple-500" size={20} />
          </div>
          {!isCollapsed && <span>Appointments</span>}
        </Link>
        
        <Link href="/workstation" className={isActive('/workstation') ? 'nav-link active' : 'nav-link'}>
          <div className="neu-icon bg-teal-100">
            <UserCog className="text-teal-500" size={20} />
          </div>
          {!isCollapsed && <span>Workstation</span>}
        </Link>
        
        <Link href="/pharmacy" className={isActive('/pharmacy') ? 'nav-link active' : 'nav-link'}>
          <div className="neu-icon bg-pink-100">
            <Pill className="text-pink-500" size={20} />
          </div>
          {!isCollapsed && <span>Pharmacy</span>}
        </Link>
        
        <Link href="/beds" className={isActive('/beds') ? 'nav-link active' : 'nav-link'}>
          <div className="neu-icon bg-yellow-100">
            <Bed className="text-yellow-500" size={20} />
          </div>
          {!isCollapsed && <span>Bed Management</span>}
        </Link>
        
        <Link href="/other-bills" className={isActive('/other-bills') ? 'nav-link active' : 'nav-link'}>
          <div className="neu-icon bg-cyan-100">
            <FileText className="text-cyan-500" size={20} />
          </div>
          {!isCollapsed && <span>Other Bills</span>}
        </Link>
      </nav>
      
      {/* Bottom Actions */}
      <div className="mt-auto pt-4 border-t border-gray-200">
        <Link href="/settings" className={isActive('/settings') ? 'nav-link active' : 'nav-link'}>
          <div className="neu-icon bg-indigo-100">
            <Settings className="text-indigo-500" size={20} />
          </div>
          {!isCollapsed && <span>Settings</span>}
        </Link>
        <button 
          onClick={handleLogout}
          className="nav-link w-full text-left"
        >
          <div className="neu-icon bg-rose-100">
            <LogOut className="text-rose-500" size={20} />
          </div>
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;