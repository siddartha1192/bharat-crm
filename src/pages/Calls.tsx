/**
 * AI Calls - Main Page
 * Comprehensive calling management with tabs
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Phone, Settings, FileText, ListChecks, BarChart3 } from 'lucide-react';
import CallLogsPage from './calls/CallLogs';
import CallQueuePage from './calls/CallQueue';
import CallScriptsPage from './calls/CallScripts';
import CallSettingsPage from './calls/CallSettings';
import CallStatsPage from './calls/CallStats';

export default function CallsPage() {
  const [activeTab, setActiveTab] = useState('logs');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Phone className="w-8 h-8 text-blue-600" />
          AI Calls
        </h1>
        <p className="mt-2 text-gray-600">
          Manage AI-powered and manual calls to your leads and contacts
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto">
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            <span className="hidden sm:inline">Call Logs</span>
          </TabsTrigger>
          <TabsTrigger value="queue" className="flex items-center gap-2">
            <ListChecks className="w-4 h-4" />
            <span className="hidden sm:inline">Queue</span>
          </TabsTrigger>
          <TabsTrigger value="scripts" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Scripts</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          <CallLogsPage />
        </TabsContent>

        <TabsContent value="queue" className="space-y-4">
          <CallQueuePage />
        </TabsContent>

        <TabsContent value="scripts" className="space-y-4">
          <CallScriptsPage />
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <CallStatsPage />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <CallSettingsPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
