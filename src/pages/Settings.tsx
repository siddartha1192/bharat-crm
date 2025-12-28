import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Zap, Database, Send, Settings as SettingsIcon, Bell } from 'lucide-react';
import { UserManagement } from '@/components/settings/UserManagement';
import AutomationSettings from '@/components/settings/AutomationSettings';
import VectorDataUpload from '@/components/settings/VectorDataUpload';
import CampaignSettings from '@/components/settings/CampaignSettings';
import APISettings from '@/components/settings/APISettings';
import ReminderSettings from '@/components/settings/ReminderSettings';
import { ProtectedFeature } from '@/components/auth/ProtectedFeature';
import { usePermissions } from '@/hooks/usePermissions';

export default function Settings() {
  const { isAdmin } = usePermissions();
  const [activeTab, setActiveTab] = useState('users');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 lg:w-[1200px]">
          <ProtectedFeature permission="users:read">
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
          </ProtectedFeature>

          <TabsTrigger value="automation">
            <Zap className="w-4 h-4 mr-2" />
            Automation
          </TabsTrigger>

          <TabsTrigger value="campaigns">
            <Send className="w-4 h-4 mr-2" />
            Campaigns
          </TabsTrigger>

          <ProtectedFeature permission="users:read">
            <TabsTrigger value="reminders">
              <Bell className="w-4 h-4 mr-2" />
              Reminders
            </TabsTrigger>
          </ProtectedFeature>

          <ProtectedFeature permission="users:read">
            <TabsTrigger value="api-config">
              <SettingsIcon className="w-4 h-4 mr-2" />
              API Config
            </TabsTrigger>
          </ProtectedFeature>

          <ProtectedFeature permission="users:read">
            <TabsTrigger value="vector-data">
              <Database className="w-4 h-4 mr-2" />
              Vector DB
            </TabsTrigger>
          </ProtectedFeature>
        </TabsList>

        {/* User Management (Admin Only) */}
        <ProtectedFeature permission="users:read">
          <TabsContent value="users" className="space-y-4">
            <UserManagement />
          </TabsContent>
        </ProtectedFeature>

        {/* Automation */}
        <TabsContent value="automation" className="space-y-4">
          <AutomationSettings />
        </TabsContent>

        {/* Campaigns */}
        <TabsContent value="campaigns" className="space-y-4">
          <CampaignSettings />
        </TabsContent>

        {/* Reminders (Admin Only) */}
        <ProtectedFeature permission="users:read">
          <TabsContent value="reminders" className="space-y-4">
            <ReminderSettings />
          </TabsContent>
        </ProtectedFeature>

        {/* API Configuration (Admin Only) */}
        <ProtectedFeature permission="users:read">
          <TabsContent value="api-config" className="space-y-4">
            <APISettings />
          </TabsContent>
        </ProtectedFeature>

        {/* Vector Data Upload (Admin/Manager Only) */}
        <ProtectedFeature permission="users:read">
          <TabsContent value="vector-data" className="space-y-4">
            <VectorDataUpload />
          </TabsContent>
        </ProtectedFeature>
      </Tabs>
    </div>
  );
}
