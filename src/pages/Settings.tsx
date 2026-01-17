import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users,
  Zap,
  Database,
  Send,
  Settings as SettingsIcon,
  Bell,
  Plug,
  Mail,
  FileText,
  CreditCard,
  UserCheck,
  Search,
  Building2,
  Workflow,
  FileCode,
  ChevronRight
} from 'lucide-react';
import { UserManagement } from '@/components/settings/UserManagement';
import AutomationSettings from '@/components/settings/AutomationSettings';
import VectorDataUpload from '@/components/settings/VectorDataUpload';
import CampaignSettings from '@/components/settings/CampaignSettings';
import APISettings from '@/components/settings/APISettings';
import ReminderSettings from '@/components/settings/ReminderSettings';
import IntegrationSettings from '@/components/settings/IntegrationSettings';
import EmailTemplatesSettings from '@/components/settings/EmailTemplatesSettings';
import { InvoiceTemplatesSettings } from '@/components/settings/InvoiceTemplatesSettings';
import { SubscriptionManagement } from '@/components/settings/SubscriptionManagement';
import { NewsletterSubscribers } from '@/components/settings/NewsletterSubscribers';
import { ProtectedFeature } from '@/components/auth/ProtectedFeature';
import { usePermissions } from '@/hooks/usePermissions';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface SettingItem {
  id: string;
  label: string;
  icon: any;
  description: string;
  category: string;
  requiresPermission?: string;
  badge?: string;
  component: React.ComponentType;
}

const settingItems: SettingItem[] = [
  // Account & Organization
  {
    id: 'subscription',
    label: 'Subscription & Billing',
    icon: CreditCard,
    description: 'Manage your subscription plan and billing',
    category: 'Account & Organization',
    requiresPermission: 'users:read',
    component: SubscriptionManagement,
  },
  {
    id: 'users',
    label: 'Team Members',
    icon: Users,
    description: 'Manage users, roles, and permissions',
    category: 'Account & Organization',
    requiresPermission: 'users:read',
    component: UserManagement,
  },
  {
    id: 'subscribers',
    label: 'Newsletter Subscribers',
    icon: UserCheck,
    description: 'View and manage newsletter subscriptions',
    category: 'Account & Organization',
    requiresPermission: 'users:read',
    component: NewsletterSubscribers,
  },

  // Communication
  {
    id: 'campaigns',
    label: 'Campaigns',
    icon: Send,
    description: 'Configure email and WhatsApp campaigns',
    category: 'Communication',
    component: CampaignSettings,
  },
  {
    id: 'email-templates',
    label: 'Email Templates',
    icon: Mail,
    description: 'Create and manage email templates',
    category: 'Communication',
    requiresPermission: 'users:read',
    component: EmailTemplatesSettings,
  },

  // Automation & AI
  {
    id: 'automation',
    label: 'Workflow Automation',
    icon: Zap,
    description: 'Set up automated workflows and triggers',
    category: 'Automation & AI',
    badge: 'Popular',
    component: AutomationSettings,
  },
  {
    id: 'reminders',
    label: 'Smart Reminders',
    icon: Bell,
    description: 'Configure automated reminder notifications',
    category: 'Automation & AI',
    requiresPermission: 'users:read',
    component: ReminderSettings,
  },
  {
    id: 'vector-data',
    label: 'AI Knowledge Base',
    icon: Database,
    description: 'Upload data for AI assistant training',
    category: 'Automation & AI',
    requiresPermission: 'users:read',
    badge: 'AI',
    component: VectorDataUpload,
  },

  // Templates & Documents
  {
    id: 'invoice-templates',
    label: 'Invoice Templates',
    icon: FileText,
    description: 'Customize invoice templates and formats',
    category: 'Templates & Documents',
    requiresPermission: 'users:read',
    component: InvoiceTemplatesSettings,
  },

  // Integrations
  {
    id: 'integrations',
    label: 'Connected Apps',
    icon: Plug,
    description: 'Connect with external services and apps',
    category: 'Integrations',
    component: IntegrationSettings,
  },

  // Developer
  {
    id: 'api-config',
    label: 'API Configuration',
    icon: FileCode,
    description: 'Manage API keys and configurations',
    category: 'Developer',
    requiresPermission: 'users:read',
    component: APISettings,
  },
];

export default function Settings() {
  const { isAdmin } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState('subscription');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveSection(tab);
    }
  }, [searchParams]);

  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId);
    setSearchParams({ tab: sectionId });
    setIsMobileSidebarOpen(false);
  };

  // Filter settings based on search query
  const filteredItems = settingItems.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group items by category
  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, SettingItem[]>);

  const ActiveComponent = settingItems.find(item => item.id === activeSection)?.component || SubscriptionManagement;
  const activeItem = settingItems.find(item => item.id === activeSection);

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      {/* Sidebar */}
      <aside className={cn(
        "w-80 bg-white border-r border-gray-200 flex flex-col",
        "fixed lg:static inset-y-0 left-0 z-40 transform transition-transform duration-200",
        isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Sidebar Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <SettingsIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Settings</h1>
              <p className="text-sm text-gray-500">Manage your workspace</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-50 border-gray-200 focus:bg-white"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category}>
              <h3 className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {category}
              </h3>
              <div className="space-y-1">
                {items.map((item) => {
                  // Check if user has permission
                  if (item.requiresPermission && !isAdmin) {
                    return null;
                  }

                  const Icon = item.icon;
                  const isActive = activeSection === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSectionChange(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                        "hover:bg-gray-50",
                        isActive
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "text-gray-700 hover:text-gray-900"
                      )}
                    >
                      <Icon className={cn(
                        "w-5 h-5 flex-shrink-0",
                        isActive ? "text-blue-600" : "text-gray-400"
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm truncate">{item.label}</span>
                          {item.badge && (
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-xs px-1.5 py-0",
                                item.badge === 'AI' && "bg-purple-100 text-purple-700",
                                item.badge === 'Popular' && "bg-green-100 text-green-700"
                              )}
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {isActive && (
                        <ChevronRight className="w-4 h-4 text-blue-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
            <Building2 className="w-5 h-5 text-gray-400" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                Organization Settings
              </p>
              <p className="text-xs text-gray-500">
                {isAdmin ? 'Admin Access' : 'User Access'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-20 bg-white border-b border-gray-200 p-4">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="flex items-center gap-2 text-gray-700"
          >
            <SettingsIcon className="w-5 h-5" />
            <span className="font-medium">{activeItem?.label}</span>
          </button>
        </div>

        {/* Content Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <div className="flex items-start gap-4">
            {activeItem && (
              <>
                <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                  <activeItem.icon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {activeItem.label}
                    </h2>
                    {activeItem.badge && (
                      <Badge
                        className={cn(
                          activeItem.badge === 'AI' && "bg-purple-100 text-purple-700",
                          activeItem.badge === 'Popular' && "bg-green-100 text-green-700"
                        )}
                      >
                        {activeItem.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-gray-600 mt-1">
                    {activeItem.description}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-8">
          <div className="max-w-6xl">
            {activeItem?.requiresPermission ? (
              <ProtectedFeature permission={activeItem.requiresPermission}>
                <ActiveComponent />
              </ProtectedFeature>
            ) : (
              <ActiveComponent />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
