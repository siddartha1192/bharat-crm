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
  Monitor,
  Globe,
  Smartphone,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';

interface Campaign {
  id: string;
  name: string;
  status: string;
}

interface LinkAnalytics {
  linkId: string;
  originalUrl: string;
  taggedUrl: string;
  shortUrl?: string;
  linkText?: string;
  linkPosition?: string;
  totalClicks: number;
  uniqueClicks: number;
  clicksByDevice: Record<string, number>;
  clicksByBrowser: Record<string, number>;
  clicksByOS: Record<string, number>;
}

interface AnalyticsData {
  links: LinkAnalytics[];
  summary: {
    totalLinks: number;
    totalClicks: number;
    totalUniqueClicks: number;
  };
}

export function LinkAnalytics() {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
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
      console.log('Campaigns Response:', response.data);
      const campaignsData = response.data.data || response.data;
      console.log('Extracted Campaigns Data:', campaignsData);

      // Ensure we have an array
      if (Array.isArray(campaignsData)) {
        setCampaigns(campaignsData);
        if (campaignsData.length > 0) {
          setSelectedCampaign(campaignsData[0].id);
        }
      } else {
        console.error('Campaigns data is not an array:', campaignsData);
        setCampaigns([]);
      }
    } catch (error: any) {
      console.error('Error fetching campaigns:', error);
      console.error('Error response:', error.response?.data);
      toast({
        title: 'Error',
        description: error.response?.data?.error || error.response?.data?.message || 'Failed to fetch campaigns',
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
      console.log('Analytics Response:', response.data);
      // Backend returns { success: true, data: { links: [], summary: {} } }
      const analyticsData = response.data.data || response.data;
      console.log('Extracted Analytics Data:', analyticsData);

      // Validate data structure
      if (analyticsData && typeof analyticsData === 'object') {
        if (!analyticsData.links || !Array.isArray(analyticsData.links)) {
          console.error('Analytics data missing links array:', analyticsData);
        }
        if (!analyticsData.summary || typeof analyticsData.summary !== 'object') {
          console.error('Analytics data missing summary object:', analyticsData);
        }
        setAnalytics(analyticsData);
      } else {
        console.error('Invalid analytics data structure:', analyticsData);
      }
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      console.error('Error response:', error.response?.data);
      toast({
        title: 'Error',
        description: error.response?.data?.error || error.response?.data?.message || 'Failed to fetch analytics',
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
                    {analytics.summary.totalLinks}
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
                    {analytics.summary.totalClicks}
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
                    {analytics.summary.totalUniqueClicks}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Link Performance */}
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
                  {analytics.links.map((link) => (
                    <div
                      key={link.linkId}
                      className="border rounded-lg p-4 space-y-4"
                    >
                      {/* Link Info */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <a
                              href={link.originalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline truncate text-sm"
                            >
                              {link.originalUrl}
                            </a>
                          </div>
                          {link.shortUrl && (
                            <div className="text-sm text-gray-500">
                              Short: {link.shortUrl}
                            </div>
                          )}
                          {link.linkPosition && (
                            <Badge variant="secondary" className="mt-2">
                              {link.linkPosition}
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">
                            {link.totalClicks}
                          </div>
                          <div className="text-sm text-gray-500">
                            {link.uniqueClicks} unique
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
                            {Object.keys(link.clicksByDevice).length > 0 ? (
                              Object.entries(link.clicksByDevice).map(([device, count]) => (
                                <div
                                  key={device}
                                  className="flex justify-between text-sm"
                                >
                                  <span className="text-gray-600 capitalize">
                                    {device}
                                  </span>
                                  <span className="font-medium">{count}</span>
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
                            {Object.keys(link.clicksByBrowser).length > 0 ? (
                              Object.entries(link.clicksByBrowser).map(([browser, count]) => (
                                <div
                                  key={browser}
                                  className="flex justify-between text-sm"
                                >
                                  <span className="text-gray-600 capitalize">
                                    {browser}
                                  </span>
                                  <span className="font-medium">{count}</span>
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
                            {Object.keys(link.clicksByOS).length > 0 ? (
                              Object.entries(link.clicksByOS).map(([os, count]) => (
                                <div
                                  key={os}
                                  className="flex justify-between text-sm"
                                >
                                  <span className="text-gray-600 capitalize">
                                    {os.replace(/_/g, ' ')}
                                  </span>
                                  <span className="font-medium">{count}</span>
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
