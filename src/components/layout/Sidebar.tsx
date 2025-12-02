import { NavLink } from '@/components/NavLink';
import {
  LayoutDashboard,
  ListTodo,
  Users,
  Target,
  Calendar,
  Settings,
  UserPlus,
  MessageCircle,
  BarChart3,
  FileText,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Leads', href: '/leads', icon: UserPlus },
  { name: 'Contacts', href: '/contacts', icon: Users },
  { name: 'Pipeline', href: '/pipeline', icon: Target },
  { name: 'Tasks', href: '/tasks', icon: ListTodo },
  { name: 'WhatsApp', href: '/whatsapp', icon: MessageCircle },
  { name: 'Invoices', href: '/invoices', icon: FileText },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
];

export function Sidebar() {
  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800 shadow-2xl">
      {/* Logo Header */}
      <div className="flex items-center gap-3 p-6 border-b border-blue-500/30">
        <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-lg ring-2 ring-white/20">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-bold text-white">Bharat CRM</span>
          <span className="text-xs text-blue-200">Business Management</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-500/30 scrollbar-track-transparent">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
              "text-blue-100 hover:bg-white/10 hover:text-white hover:shadow-md",
              "group relative overflow-hidden"
            )}
            activeClassName="bg-white text-blue-600 hover:bg-white shadow-lg"
          >
            {/* Active indicator */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <item.icon className="w-5 h-5 relative z-10" />
            <span className="relative z-10">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Settings Footer */}
      <div className="p-4 border-t border-blue-500/30">
        <NavLink
          to="/settings"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-blue-100 hover:bg-white/10 hover:text-white group relative overflow-hidden"
          activeClassName="bg-white text-blue-600 shadow-lg"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <Settings className="w-5 h-5 relative z-10" />
          <span className="relative z-10">Settings</span>
        </NavLink>
      </div>
    </aside>
  );
}
