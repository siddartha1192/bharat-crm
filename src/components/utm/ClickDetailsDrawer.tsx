import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, Clock, Monitor, Globe, MapPin, ExternalLink, TrendingUp } from 'lucide-react';
import api from '../../lib/api';
import { useToast } from '../../hooks/use-toast';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';

interface Click {
  id: string;
  clickedAt: string;
  ipAddress: string;
  device: string;
  browser: string;
  os: string;
  country?: string;
  city?: string;
  recipientId?: string;
  recipientName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientType?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
}

interface ClickDetailsDrawerProps {
  linkId: string;
  linkUrl: string;
  totalClicks: number;
  onClose: () => void;
}

const ClickDetailsDrawer: React.FC<ClickDetailsDrawerProps> = ({
  linkId,
  linkUrl,
  totalClicks,
  onClose,
}) => {
  const [clicks, setClicks] = useState<Click[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { toast } = useToast();
  const limit = 50;

  useEffect(() => {
    fetchClicks();
  }, [linkId, page]);

  const fetchClicks = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/links/${linkId}/clicks`, {
        params: { limit, offset: page * limit }
      });

      const newClicks = response.data.data.clicks;
      setClicks(prev => page === 0 ? newClicks : [...prev, ...newClicks]);
      setHasMore(newClicks.length === limit);
    } catch (error: any) {
      console.error('Error fetching clicks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load click details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    setPage(prev => prev + 1);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getEngagementLevel = (clickCount: number) => {
    if (clickCount >= 5) return { label: 'High Intent', color: 'bg-red-100 text-red-800' };
    if (clickCount >= 3) return { label: 'Engaged', color: 'bg-orange-100 text-orange-800' };
    if (clickCount >= 2) return { label: 'Interested', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'New', color: 'bg-blue-100 text-blue-800' };
  };

  // Group clicks by recipient for engagement analysis
  const clicksByRecipient = clicks.reduce((acc, click) => {
    const key = click.recipientEmail || click.recipientPhone || click.ipAddress;
    if (!acc[key]) {
      acc[key] = {
        recipient: {
          name: click.recipientName,
          email: click.recipientEmail,
          phone: click.recipientPhone,
          type: click.recipientType
        },
        clicks: []
      };
    }
    acc[key].clicks.push(click);
    return acc;
  }, {} as Record<string, any>);

  const uniqueUsers = Object.keys(clicksByRecipient).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-end">
      <div className="bg-white w-full max-w-3xl h-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold mb-2">Click Analytics</h2>
              <div className="flex items-center gap-2 text-blue-100">
                <ExternalLink className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm truncate">{linkUrl}</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="bg-white/10 backdrop-blur rounded-lg p-3">
              <div className="text-2xl font-bold">{totalClicks}</div>
              <div className="text-xs text-blue-100">Total Clicks</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-3">
              <div className="text-2xl font-bold">{uniqueUsers}</div>
              <div className="text-xs text-blue-100">Unique Users</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-3">
              <div className="text-2xl font-bold">
                {uniqueUsers > 0 ? (totalClicks / uniqueUsers).toFixed(1) : 0}
              </div>
              <div className="text-xs text-blue-100">Avg Clicks/User</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-6">
          {loading && page === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading click details...</p>
              </div>
            </div>
          ) : clicks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No clicks recorded yet
            </div>
          ) : (
            <div className="space-y-4">
              {/* Group by User View */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  User Engagement
                </h3>
                <div className="space-y-3">
                  {Object.entries(clicksByRecipient)
                    .sort((a, b) => b[1].clicks.length - a[1].clicks.length)
                    .map(([key, data]) => {
                      const engagement = getEngagementLevel(data.clicks.length);
                      return (
                        <div
                          key={key}
                          className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <User className="w-5 h-5 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-900">
                                  {data.recipient.name || 'Anonymous User'}
                                </div>
                                {data.recipient.email && (
                                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                                    <Mail className="w-3 h-3" />
                                    <span className="truncate">{data.recipient.email}</span>
                                  </div>
                                )}
                                {data.recipient.phone && (
                                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                                    <Phone className="w-3 h-3" />
                                    <span>{data.recipient.phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <Badge className={engagement.color}>
                              {engagement.label}
                            </Badge>
                          </div>

                          {/* Click Timeline */}
                          <div className="ml-11 space-y-2">
                            <div className="text-sm font-medium text-gray-700">
                              {data.clicks.length} click{data.clicks.length > 1 ? 's' : ''}
                            </div>
                            {data.clicks.slice(0, 3).map((click: Click, idx: number) => (
                              <div
                                key={click.id}
                                className="flex items-center gap-3 text-xs text-gray-600 bg-gray-50 rounded p-2"
                              >
                                <Clock className="w-3 h-3" />
                                <span>{formatDate(click.clickedAt)}</span>
                                <span className="text-gray-400">•</span>
                                <Monitor className="w-3 h-3" />
                                <span>{click.device}</span>
                                <span className="text-gray-400">•</span>
                                <Globe className="w-3 h-3" />
                                <span>{click.browser}</span>
                              </div>
                            ))}
                            {data.clicks.length > 3 && (
                              <div className="text-xs text-gray-500 ml-2">
                                +{data.clicks.length - 3} more click{data.clicks.length - 3 > 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Load More */}
              {hasMore && (
                <div className="text-center pt-4">
                  <Button
                    onClick={loadMore}
                    disabled={loading}
                    variant="outline"
                  >
                    {loading ? 'Loading...' : 'Load More'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

export default ClickDetailsDrawer;
