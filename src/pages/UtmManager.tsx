import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link2, FileCode, BarChart3, Link } from 'lucide-react';
import { UtmTemplates } from '@/components/utm/UtmTemplates';
import { LinkGenerator } from '@/components/utm/LinkGenerator';
import { LinkAnalytics } from '@/components/utm/LinkAnalytics';
import { ManualLinks } from '@/components/utm/ManualLinks';

export default function UtmManager() {
  const [activeTab, setActiveTab] = useState('generator');

  return (
    <div className="h-full bg-gray-50">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
              <Link2 className="w-8 h-8 text-blue-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">
                UTM Manager
              </h1>
              <p className="text-gray-600 mt-2">
                Enterprise-level UTM tracking, link generation, and analytics for your campaigns
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid bg-white border border-gray-200 rounded-xl p-1">
            <TabsTrigger
              value="generator"
              className="flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
            >
              <Link className="w-4 h-4" />
              <span className="hidden sm:inline">Link Generator</span>
              <span className="sm:hidden">Generator</span>
            </TabsTrigger>
            <TabsTrigger
              value="templates"
              className="flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
            >
              <FileCode className="w-4 h-4" />
              <span className="hidden sm:inline">Templates</span>
              <span className="sm:hidden">Templates</span>
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Analytics</span>
              <span className="sm:hidden">Analytics</span>
            </TabsTrigger>
            <TabsTrigger
              value="links"
              className="flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
            >
              <Link2 className="w-4 h-4" />
              <span className="hidden sm:inline">Manual Links</span>
              <span className="sm:hidden">Links</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generator" className="space-y-6">
            <LinkGenerator />
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <UtmTemplates />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <LinkAnalytics />
          </TabsContent>

          <TabsContent value="links" className="space-y-6">
            <ManualLinks />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
