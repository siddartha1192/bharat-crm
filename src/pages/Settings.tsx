import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Users, Bell, Lock } from 'lucide-react';
import { UserManagement } from '@/components/settings/UserManagement';
import { ProtectedFeature } from '@/components/auth/ProtectedFeature';
import { usePermissions } from '@/hooks/usePermissions';

export default function Settings() {
  const { isAdmin } = usePermissions();
  const [activeTab, setActiveTab] = useState('general');

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
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="general">
            <Shield className="w-4 h-4 mr-2" />
            General
          </TabsTrigger>

          <ProtectedFeature permission="users:read">
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              User Management
            </TabsTrigger>
          </ProtectedFeature>

          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>

          <TabsTrigger value="security">
            <Lock className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Manage your general account settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  General settings coming soon...
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Management (Admin Only) */}
        <ProtectedFeature permission="users:read">
          <TabsContent value="users" className="space-y-4">
            <UserManagement />
          </TabsContent>
        </ProtectedFeature>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how you want to be notified
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Notification settings coming soon...
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your security preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Security settings coming soon...
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
