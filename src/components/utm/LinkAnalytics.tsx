import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart3,
  MousePointerClick,
  Users,
  ExternalLink,
  TrendingUp,
  Monitor,
  Smartphone,
  Globe,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Campaign {
  id: string;
  name: string;
  status: string;
}

interface LinkAnalytics {
  link: {
    id: string;
    originalUrl: string;
    taggedUrl: string;
    shortUrl?: string;
    linkText?: string;
    linkPosition?: string;
    totalClicks: number;
    uniqueClicks: number;
  };
  clicksByDevice: { device: string; count: number }[];
  clicksByBrowser: { browser: string; count: number }[];
  clicksByOS: { os: string; count: number }[];
  recentClicks: {
    id: string;
    device?: string;
    browser?: string;
    os?: string;
    clickedAt: string;
  }[];
}

interface CampaignAnalytics {
  campaign: {
    id: string;
    name: string;
    totalLinks: number;
    totalClicks: number;
    uniqueClicks: number;
  };
  links: LinkAnalytics[];
}

export function LinkAnalytics() {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [campaignsLoading, setCampaignsLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    if (selectedCampaign) {
      fetchAnalytics();
    }
  }, [selectedCampaign]);

  const fetchCampaigns = async () => {
    try {
      const response = await api.get('/links/campaigns');
      setCampaigns(response.data);
      if (response.data.length > 0) {
        setSelectedCampaign(response.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch campaigns',
        variant: 'destructive',
      });
    } finally {
      setCampaignsLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    if (!selectedCampaign) return;

    setLoading(true);
    try {
      const response = await api.get(`/links/analytics/${selectedCampaign}`);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch analytics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (campaignsLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading campaigns...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (campaigns.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No campaigns with tracked links found</p>
            <p className="text-sm text-gray-500 mt-2">
              Create a campaign with UTM tracking enabled to see analytics here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Campaign Selector */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Link Analytics
              </CardTitle>
              <CardDescription>
                Track link performance and engagement across your campaigns
              </CardDescription>
            </div>
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Select campaign" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading analytics...</p>
            </div>
          </CardContent>
        </Card>
      ) : analytics ? (
        <>
          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Links
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <ExternalLink className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-3xl font-bold">
                    {analytics.campaign.totalLinks}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Clicks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <MousePointerClick className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="text-3xl font-bold">
                    {analytics.campaign.totalClicks}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Unique Clicks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="text-3xl font-bold">
                    {analytics.campaign.uniqueClicks}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Link Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Link Performance</CardTitle>
              <CardDescription>
                Detailed analytics for each tracked link
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.links.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No tracked links found for this campaign
                </div>
              ) : (
                <div className="space-y-6">
                  {analytics.links.map((linkAnalytics) => (
                    <div
                      key={linkAnalytics.link.id}
                      className="border rounded-lg p-4 space-y-4"
                    >
                      {/* Link Info */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <a
                              href={linkAnalytics.link.originalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline truncate"
                            >
                              {linkAnalytics.link.originalUrl}
                            </a>
                          </div>
                          {linkAnalytics.link.shortUrl && (
                            <div className="text-sm text-gray-500">
                              Short: {linkAnalytics.link.shortUrl}
                            </div>
                          )}
                          {linkAnalytics.link.linkPosition && (
                            <Badge variant="secondary" className="mt-2">
                              {linkAnalytics.link.linkPosition}
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">
                            {linkAnalytics.link.totalClicks}
                          </div>
                          <div className="text-sm text-gray-500">
                            {linkAnalytics.link.uniqueClicks} unique
                          </div>
                        </div>
                      </div>

                      {/* Analytics Breakdown */}
                      <div className="grid gap-4 md:grid-cols-3">
                        {/* Devices */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <Monitor className="w-4 h-4" />
                            Devices
                          </h4>
                          <div className="space-y-1">
                            {linkAnalytics.clicksByDevice.length > 0 ? (
                              linkAnalytics.clicksByDevice.map((item) => (
                                <div
                                  key={item.device}
                                  className="flex justify-between text-sm"
                                >
                                  <span className="text-gray-600 capitalize">
                                    {item.device || 'Unknown'}
                                  </span>
                                  <span className="font-medium">{item.count}</span>
                                </div>
                              ))
                            ) : (
                              <div className="text-sm text-gray-400">No data</div>
                            )}
                          </div>
                        </div>

                        {/* Browsers */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            Browsers
                          </h4>
                          <div className="space-y-1">
                            {linkAnalytics.clicksByBrowser.length > 0 ? (
                              linkAnalytics.clicksByBrowser.map((item) => (
                                <div
                                  key={item.browser}
                                  className="flex justify-between text-sm"
                                >
                                  <span className="text-gray-600 capitalize">
                                    {item.browser || 'Unknown'}
                                  </span>
                                  <span className="font-medium">{item.count}</span>
                                </div>
                              ))
                            ) : (
                              <div className="text-sm text-gray-400">No data</div>
                            )}
                          </div>
                        </div>

                        {/* OS */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <Smartphone className="w-4 h-4" />
                            Operating Systems
                          </h4>
                          <div className="space-y-1">
                            {linkAnalytics.clicksByOS.length > 0 ? (
                              linkAnalytics.clicksByOS.map((item) => (
                                <div
                                  key={item.os}
                                  className="flex justify-between text-sm"
                                >
                                  <span className="text-gray-600 capitalize">
                                    {item.os || 'Unknown'}
                                  </span>
                                  <span className="font-medium">{item.count}</span>
                                </div>
                              ))
                            ) : (
                              <div className="text-sm text-gray-400">No data</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
