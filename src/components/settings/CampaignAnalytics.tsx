/**
 * Campaign Analytics Dashboard
 * Displays link performance, click tracking, and UTM analytics
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend
} from 'recharts';
import {
  MousePointerClick,
  Link as LinkIcon,
  TrendingUp,
  Users,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  ExternalLink,
  Download,
  Calendar,
  Clock
} from 'lucide-react';
import { CampaignAnalytics as CampaignAnalyticsType, LinkAnalytics, Campaign } from '@/types/campaign';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Props {
  campaignId: string;
  campaign?: Campaign;
}

const COLORS = {
  primary: '#3b82f6',
  secondary: '#10b981',
  accent: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899'
};

const DEVICE_COLORS = [COLORS.primary, COLORS.secondary, COLORS.accent];
const BROWSER_COLORS = [COLORS.primary, COLORS.purple, COLORS.secondary, COLORS.accent, COLORS.pink];

export function CampaignAnalytics({ campaignId, campaign }: Props) {
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState<CampaignAnalyticsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    fetchAnalytics();
  }, [campaignId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/links/analytics/${campaignId}`);
      setAnalytics(response.data.data);
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load analytics data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const exportAnalytics = () => {
    if (!analytics) return;

    // Create CSV content
    const csvRows = [
      ['Link', 'Total Clicks', 'Unique Clicks', 'Platform', 'UTM Source', 'UTM Medium', 'UTM Campaign'].join(','),
      ...analytics.links.map(link => [
        `"${link.originalUrl}"`,
        link.totalClicks,
        link.uniqueClicks,
        link.platform || '',
        link.utmParams.source || '',
        link.utmParams.medium || '',
        link.utmParams.campaign || ''
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign-analytics-${campaignId}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Exported!',
      description: 'Analytics data exported to CSV'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics || analytics.links.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-12">
          <LinkIcon className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No tracking data yet</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Link tracking data will appear here once your campaign is sent and recipients start clicking links.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { links, summary } = analytics;

  // Prepare device data for charts
  const deviceData = links.reduce((acc: any[], link) => {
    Object.entries(link.clicksByDevice).forEach(([device, count]) => {
      const existing = acc.find(d => d.name === device);
      if (existing) {
        existing.value += count;
      } else {
        acc.push({ name: device, value: count });
      }
    });
    return acc;
  }, []);

  // Prepare browser data for charts
  const browserData = links.reduce((acc: any[], link) => {
    Object.entries(link.clicksByBrowser).forEach(([browser, count]) => {
      const existing = acc.find(b => b.name === browser);
      if (existing) {
        existing.value += count;
      } else {
        acc.push({ name: browser, value: count });
      }
    });
    return acc;
  }, []);

  // Prepare OS data
  const osData = links.reduce((acc: any[], link) => {
    Object.entries(link.clicksByOS).forEach(([os, count]) => {
      const existing = acc.find(o => o.name === os);
      if (existing) {
        existing.value += count;
      } else {
        acc.push({ name: os, value: count });
      }
    });
    return acc;
  }, []);

  // Prepare timeline data
  const timelineData = links.reduce((acc: Record<string, number>, link) => {
    Object.entries(link.clickTimeline).forEach(([time, count]) => {
      acc[time] = (acc[time] || 0) + (count as number);
    });
    return acc;
  }, {});

  const timelineChartData = Object.entries(timelineData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, clicks]) => ({
      time: format(new Date(time), 'MMM dd HH:mm'),
      clicks
    }));

  return (
    <div className="space-y-6">
      {/* Header with export button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Campaign Analytics</h2>
          {campaign && (
            <p className="text-sm text-muted-foreground mt-1">{campaign.name}</p>
          )}
        </div>
        <Button onClick={exportAnalytics} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Links</CardTitle>
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalLinks}</div>
            <p className="text-xs text-muted-foreground">Tracked in campaign</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalClicks}</div>
            <p className="text-xs text-muted-foreground">All link clicks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Clicks</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalUniqueClicks}</div>
            <p className="text-xs text-muted-foreground">Unique visitors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Clicks/Link</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.averageClicksPerLink}</div>
            <p className="text-xs text-muted-foreground">Performance metric</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="links">Link Performance</TabsTrigger>
          <TabsTrigger value="devices">Devices & Browsers</TabsTrigger>
          <TabsTrigger value="timeline">Click Timeline</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Top Performing Link */}
            {summary.topPerformingLink && (
              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Link</CardTitle>
                  <CardDescription>Most clicked link in this campaign</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <ExternalLink className="w-4 h-4 text-muted-foreground mt-1" />
                      <a
                        href={summary.topPerformingLink.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline break-all flex-1"
                      >
                        {summary.topPerformingLink.url}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <MousePointerClick className="w-4 h-4 text-muted-foreground" />
                      <span className="text-2xl font-bold">{summary.topPerformingLink.clicks}</span>
                      <span className="text-sm text-muted-foreground">clicks</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Click Rate */}
            <Card>
              <CardHeader>
                <CardTitle>Click Performance</CardTitle>
                <CardDescription>Overall campaign engagement</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Click Rate</span>
                      <span className="text-sm text-muted-foreground">
                        {campaign && campaign.totalRecipients > 0
                          ? ((summary.totalClicks / campaign.totalRecipients) * 100).toFixed(1)
                          : 0}%
                      </span>
                    </div>
                    <Progress
                      value={campaign && campaign.totalRecipients > 0
                        ? (summary.totalClicks / campaign.totalRecipients) * 100
                        : 0
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Recipients</p>
                      <p className="text-xl font-bold">{campaign?.totalRecipients || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Clicked</p>
                      <p className="text-xl font-bold">{summary.totalClicks}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Device Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Device Distribution</CardTitle>
              <CardDescription>Clicks by device type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={deviceData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill={COLORS.primary}
                      dataKey="value"
                    >
                      {deviceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={DEVICE_COLORS[index % DEVICE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col justify-center space-y-3">
                  {deviceData.map((device, index) => (
                    <div key={device.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {device.name === 'desktop' && <Monitor className="w-4 h-4" style={{ color: DEVICE_COLORS[index] }} />}
                        {device.name === 'mobile' && <Smartphone className="w-4 h-4" style={{ color: DEVICE_COLORS[index] }} />}
                        {device.name === 'tablet' && <Tablet className="w-4 h-4" style={{ color: DEVICE_COLORS[index] }} />}
                        {device.name === 'unknown' && <Globe className="w-4 h-4" style={{ color: DEVICE_COLORS[index] }} />}
                        <span className="text-sm font-medium capitalize">{device.name}</span>
                      </div>
                      <Badge variant="secondary">{device.value} clicks</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Link Performance Tab */}
        <TabsContent value="links" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Links Performance</CardTitle>
              <CardDescription>Detailed breakdown of each tracked link</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Link</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead className="text-right">Total Clicks</TableHead>
                    <TableHead className="text-right">Unique Clicks</TableHead>
                    <TableHead>Last Clicked</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {links.map((link) => (
                    <TableRow key={link.linkId}>
                      <TableCell className="max-w-md">
                        <div className="space-y-1">
                          <a
                            href={link.originalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline break-all"
                          >
                            {link.originalUrl}
                          </a>
                          {link.linkText && (
                            <p className="text-xs text-muted-foreground">"{link.linkText}"</p>
                          )}
                          {link.shortUrl && (
                            <p className="text-xs font-mono text-muted-foreground">{link.shortUrl}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{link.platform || 'unknown'}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{link.totalClicks}</TableCell>
                      <TableCell className="text-right">{link.uniqueClicks}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {link.lastClickedAt ? format(new Date(link.lastClickedAt), 'MMM dd, HH:mm') : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Devices & Browsers Tab */}
        <TabsContent value="devices" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Browsers</CardTitle>
                <CardDescription>Clicks by browser type</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={browserData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill={COLORS.primary} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Operating Systems</CardTitle>
                <CardDescription>Clicks by operating system</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={osData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill={COLORS.secondary} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Click Timeline</CardTitle>
              <CardDescription>Clicks over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={timelineChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="clicks" stroke={COLORS.primary} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
