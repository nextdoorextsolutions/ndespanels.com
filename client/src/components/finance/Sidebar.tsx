import React from 'react';
import { Link, useLocation } from 'wouter';
import { 
  LayoutDashboard, 
  FileText, 
  Briefcase, 
  Users, 
  Settings,
  LucideIcon
} from 'lucide-react';

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  href: string;
  isActive: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, label, href, isActive }) => (
  <Link href={href}>
    <button 
      className={`flex items-center w-full gap-3 px-4 py-3 transition-all duration-200 rounded-xl group ${
        isActive 
          ? 'bg-cyan-500/10 text-cyan-400' 
          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
      }`}
    >
      <Icon size={20} className={isActive ? 'text-cyan-400' : 'text-gray-500 group-hover:text-white'} />
      <span className="font-medium text-sm">{label}</span>
      {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />}
    </button>
  </Link>
);

interface SidebarProps {
  isOpen: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const [location] = useLocation();

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/finance' },
    { icon: FileText, label: 'Invoices', href: '/invoices' },
    { icon: Briefcase, label: 'Jobs', href: '/jobs' },
    { icon: Users, label: 'Clients', href: '/clients' },
    { icon: Settings, label: 'Settings', href: '/settings' },
  ];

  return (
    <aside className={`${isOpen ? 'w-64' : 'w-20'} hidden md:flex flex-col border-r border-gray-800 bg-[#0B0C10] transition-all duration-300 relative z-20`}>
      {/* Logo Area */}
      <div className="h-20 flex items-center px-6 border-b border-gray-800/50">
        <div className="w-8 h-8 rounded-full bg-cyan-400 flex items-center justify-center font-bold text-black text-lg shadow-[0_0_15px_rgba(34,211,238,0.4)]">
          N
        </div>
        {isOpen && (
          <span className="ml-3 font-bold text-lg tracking-tight text-white">
            NextDoor<span className="text-cyan-400">Exterior</span>
          </span>
        )}
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 py-6 space-y-2">
        {navItems.map((item) => (
          <SidebarItem
            key={item.href}
            icon={item.icon}
            label={item.label}
            href={item.href}
            isActive={location === item.href}
          />
        ))}
      </nav>

      {/* Owner Profile Badge */}
      <div className="p-4 border-t border-gray-800/50">
        <div className={`flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-700 ${!isOpen && 'justify-center'}`}>
          <div className="relative">
            <img 
              src="https://ui-avatars.com/api/?name=Owner+Admin&background=22d3ee&color=000" 
              alt="Owner" 
              className="w-9 h-9 rounded-full border-2 border-[#0B0C10]"
            />
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#0B0C10] rounded-full"></div>
          </div>
          {isOpen && (
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white">Owner Account</p>
              <p className="text-xs text-cyan-400/80 font-medium">Super Admin</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
