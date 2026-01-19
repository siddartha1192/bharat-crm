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
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 sm:gap-3">
          <Phone className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
          AI Calls
        </h1>
        <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Manage AI-powered programmatic calls to your leads and contacts
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto">
          <TabsTrigger value="logs" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Phone className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Call Logs</span>
            <span className="sm:hidden">Logs</span>
          </TabsTrigger>
          <TabsTrigger value="queue" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <ListChecks className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Queue</span>
          </TabsTrigger>
          <TabsTrigger value="scripts" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Scripts</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Analytics</span>
            <span className="sm:hidden">Stats</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Settings</span>
            <span className="sm:hidden">Config</span>
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
