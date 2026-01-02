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
  Mail,
  Bot,
  Shield,
  TrendingUp,
  FormInput,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Leads', href: '/leads', icon: UserPlus },
  { name: 'Contacts', href: '/contacts', icon: Users },
  { name: 'Pipeline', href: '/pipeline', icon: Target },
  { name: 'Tasks', href: '/tasks', icon: ListTodo },
  { name: 'WhatsApp', href: '/whatsapp', icon: MessageCircle },
  { name: 'Emails', href: '/emails', icon: Mail },
  { name: 'Forms', href: '/forms', icon: FormInput, badge: 'New' },
  { name: 'Invoices', href: '/invoices', icon: FileText },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Sales Forecast', href: '/forecast', icon: TrendingUp, badge: 'New' },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'AI Assistant', href: '/ai-assistant', icon: Bot, badge: 'New' },
];

interface SidebarProps {
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
}

// Shared sidebar content component
const SidebarContent = ({ onLinkClick }: { onLinkClick?: () => void }) => (
  <>
    {/* Logo Header */}
    <div className="p-4 border-b border-blue-500/30">
      <div className="flex items-center gap-4 px-5 py-4 bg-white rounded-2xl border border-blue-100 shadow-sm">
        {/* Logo */}
        <div className="w-14 h-14 flex items-center justify-center">
          <img
            src="/logo_with_white_background.png"
            alt="CLiM Logo"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Brand Text */}
        <div className="flex flex-col leading-tight">
          <span className="text-lg font-semibold text-blue-900">
            CLiM
          </span>
          <span className="text-xs text-blue-600">
            Business Management
          </span>
        </div>
      </div>
    </div>

    {/* Navigation */}
    <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-500/30 scrollbar-track-transparent">
      {navigation.map((item) => (
        <NavLink
          key={item.name}
          to={item.href}
          onClick={onLinkClick}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
            "text-blue-100 hover:bg-white/10 hover:text-white hover:shadow-md",
            "group relative overflow-hidden"
          )}
          activeClassName="bg-white text-blue-600 hover:bg-white hover:text-blue-700 shadow-lg"
        >
          {/* Active indicator */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          <item.icon className="w-5 h-5 relative z-10" />
          <span className="relative z-10">{item.name}</span>
          {item.badge && (
            <span className="ml-auto px-2 py-0.5 text-xs font-semibold bg-green-500 text-white rounded-full relative z-10">
              {item.badge}
            </span>
          )}
        </NavLink>
      ))}
    </nav>

    {/* Settings Footer */}
    <div className="p-4 border-t border-blue-500/30 space-y-1">
      <NavLink
        to="/users"
        onClick={onLinkClick}
        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-blue-100 hover:bg-white/10 hover:text-white group relative overflow-hidden"
        activeClassName="bg-white text-blue-600 hover:bg-white hover:text-blue-700 shadow-lg"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <Shield className="w-5 h-5 relative z-10" />
        <span className="relative z-10">User Management</span>
      </NavLink>
      <NavLink
        to="/settings"
        onClick={onLinkClick}
        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-blue-100 hover:bg-white/10 hover:text-white group relative overflow-hidden"
        activeClassName="bg-white text-blue-600 hover:bg-white hover:text-blue-700 shadow-lg"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <Settings className="w-5 h-5 relative z-10" />
        <span className="relative z-10">Settings</span>
      </NavLink>
    </div>
  </>
);

export function Sidebar({ mobileMenuOpen = false, setMobileMenuOpen }: SidebarProps) {
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800 shadow-2xl">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar - Sheet Drawer */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent
          side="left"
          className="w-64 p-0 bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800 border-r-0"
        >
          <div className="flex flex-col h-full">
            <SidebarContent onLinkClick={() => setMobileMenuOpen?.(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
