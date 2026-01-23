import React, { useState, useEffect } from 'react';
import { Users, Target, Download, Mail, TrendingUp, Filter, Search, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import api from '../../lib/api';
import { useToast } from '../../hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Recipient {
  id: string;
  recipientName: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientType: string;
  clickedCount: number;
  lastClickedAt: string;
  firstClickedAt: string;
  hasConverted: boolean;
  engagementScore: number;
}

interface AudienceSegment {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  filter: (recipients: Recipient[]) => Recipient[];
}

interface RetargetingAudiencesProps {
  campaignId: string;
  campaignName: string;
}

const RetargetingAudiences: React.FC<RetargetingAudiencesProps> = ({
  campaignId,
  campaignName,
}) => {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSegment, setSelectedSegment] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const navigate = useNavigate();

  // Define audience segments
  const segments: AudienceSegment[] = [
    {
      id: 'all',
      name: 'All Recipients',
      description: 'Everyone who received this campaign',
      icon: <Users className="w-4 h-4" />,
      color: 'bg-gray-100 text-gray-800',
      filter: (r) => r,
    },
    {
      id: 'high-intent',
      name: 'High Intent',
      description: 'Multiple clicks, no conversion yet',
      icon: <TrendingUp className="w-4 h-4" />,
      color: 'bg-red-100 text-red-800',
      filter: (r) => r.filter(rec => rec.clickedCount >= 3 && !rec.hasConverted),
    },
    {
      id: 'engaged',
      name: 'Engaged Users',
      description: 'Clicked but not converted',
      icon: <Target className="w-4 h-4" />,
      color: 'bg-orange-100 text-orange-800',
      filter: (r) => r.filter(rec => rec.clickedCount >= 1 && !rec.hasConverted),
    },
    {
      id: 'converted',
      name: 'Converted',
      description: 'Submitted form or became lead',
      icon: <CheckCircle2 className="w-4 h-4" />,
      color: 'bg-green-100 text-green-800',
      filter: (r) => r.filter(rec => rec.hasConverted),
    },
    {
      id: 'no-engagement',
      name: 'No Engagement',
      description: 'Received but never clicked',
      icon: <XCircle className="w-4 h-4" />,
      color: 'bg-blue-100 text-blue-800',
      filter: (r) => r.filter(rec => rec.clickedCount === 0),
    },
  ];

  useEffect(() => {
    fetchRecipients();
  }, [campaignId]);

  const fetchRecipients = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/campaigns/${campaignId}/recipients-analytics`);

      // Calculate engagement scores
      const recipientsWithScores = response.data.data.map((r: any) => ({
        ...r,
        engagementScore: calculateEngagementScore(r),
      }));

      setRecipients(recipientsWithScores);
    } catch (error: any) {
      console.error('Error fetching recipients:', error);
      toast({
        title: 'Error',
        description: 'Failed to load recipient data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateEngagementScore = (recipient: any): number => {
    let score = 0;

    // Click engagement (0-50 points)
    score += Math.min(recipient.clickedCount * 10, 50);

    // Recency bonus (0-30 points)
    if (recipient.lastClickedAt) {
      const daysSinceClick = Math.floor(
        (Date.now() - new Date(recipient.lastClickedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceClick <= 1) score += 30;
      else if (daysSinceClick <= 3) score += 20;
      else if (daysSinceClick <= 7) score += 10;
    }

    // Conversion (20 points)
    if (recipient.hasConverted) score += 20;

    return Math.min(score, 100);
  };

  const getCurrentSegment = () => {
    return segments.find(s => s.id === selectedSegment) || segments[0];
  };

  const getFilteredRecipients = () => {
    const segment = getCurrentSegment();
    let filtered = segment.filter(recipients);

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.recipientName?.toLowerCase().includes(query) ||
        r.recipientEmail?.toLowerCase().includes(query) ||
        r.recipientPhone?.includes(query)
      );
    }

    return filtered;
  };

  const filteredRecipients = getFilteredRecipients();

  const toggleSelectAll = () => {
    if (selectedRecipients.size === filteredRecipients.length) {
      setSelectedRecipients(new Set());
    } else {
      setSelectedRecipients(new Set(filteredRecipients.map(r => r.id)));
    }
  };

  const toggleRecipient = (id: string) => {
    const newSelected = new Set(selectedRecipients);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRecipients(newSelected);
  };

  const exportToCSV = () => {
    const selectedData = filteredRecipients.filter(r => selectedRecipients.has(r.id));

    if (selectedData.length === 0) {
      toast({
        title: 'No recipients selected',
        description: 'Please select recipients to export',
        variant: 'destructive',
      });
      return;
    }

    const headers = ['Name', 'Email', 'Phone', 'Type', 'Clicks', 'Last Click', 'Converted', 'Engagement Score'];
    const rows = selectedData.map(r => [
      r.recipientName || '',
      r.recipientEmail || '',
      r.recipientPhone || '',
      r.recipientType,
      r.clickedCount,
      r.lastClickedAt ? new Date(r.lastClickedAt).toLocaleDateString() : 'Never',
      r.hasConverted ? 'Yes' : 'No',
      r.engagementScore
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retargeting-${getCurrentSegment().name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.csv`;
    a.click();

    toast({
      title: 'Export successful',
      description: `Exported ${selectedData.length} recipients`,
    });
  };

  const createRetargetingCampaign = () => {
    const selectedData = filteredRecipients.filter(r => selectedRecipients.has(r.id));

    if (selectedData.length === 0) {
      toast({
        title: 'No recipients selected',
        description: 'Please select recipients to create campaign',
        variant: 'destructive',
      });
      return;
    }

    // Navigate to campaign creation with pre-selected recipients
    navigate('/campaigns/create', {
      state: {
        preselectedRecipients: selectedData,
        campaignType: 'retargeting',
        sourceCampaign: campaignName,
        segmentName: getCurrentSegment().name,
      }
    });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getEngagementBadge = (score: number) => {
    if (score >= 80) return { label: 'Hot Lead', color: 'bg-red-100 text-red-800' };
    if (score >= 60) return { label: 'Warm', color: 'bg-orange-100 text-orange-800' };
    if (score >= 40) return { label: 'Interested', color: 'bg-yellow-100 text-yellow-800' };
    if (score >= 20) return { label: 'Cold', color: 'bg-blue-100 text-blue-800' };
    return { label: 'Inactive', color: 'bg-gray-100 text-gray-800' };
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600" />
              Retargeting Audiences
            </CardTitle>
            <CardDescription>
              Build smart audiences for retargeting campaigns based on engagement
            </CardDescription>
          </div>
          {selectedRecipients.size > 0 && (
            <Badge variant="secondary" className="text-sm">
              {selectedRecipients.size} selected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading audience data...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Segment Pills */}
            <div className="flex flex-wrap gap-2">
              {segments.map(segment => {
                const count = segment.filter(recipients).length;
                return (
                  <button
                    key={segment.id}
                    onClick={() => setSelectedSegment(segment.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                      selectedSegment === segment.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`p-1 rounded ${segment.color}`}>
                      {segment.icon}
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-sm">{segment.name}</div>
                      <div className="text-xs text-gray-500">{count} recipients</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Current Segment Info */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">{getCurrentSegment().name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{getCurrentSegment().description}</p>
                  <div className="flex items-center gap-4 mt-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold">{filteredRecipients.length}</span>
                      <span className="text-gray-600">recipients</span>
                    </div>
                    {selectedRecipients.size > 0 && (
                      <div className="flex items-center gap-2 text-purple-600">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="font-semibold">{selectedRecipients.size} selected</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={exportToCSV}
                    disabled={selectedRecipients.size === 0}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button
                    onClick={createRetargetingCampaign}
                    disabled={selectedRecipients.size === 0}
                    size="sm"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Create Campaign
                  </Button>
                </div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Recipients Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={
                            filteredRecipients.length > 0 &&
                            selectedRecipients.size === filteredRecipients.length
                          }
                          onChange={toggleSelectAll}
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        Recipient
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        Engagement
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        Clicks
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        Last Activity
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredRecipients.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          No recipients found in this segment
                        </td>
                      </tr>
                    ) : (
                      filteredRecipients.map(recipient => {
                        const engagement = getEngagementBadge(recipient.engagementScore);
                        return (
                          <tr
                            key={recipient.id}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedRecipients.has(recipient.id)}
                                onChange={() => toggleRecipient(recipient.id)}
                                className="rounded border-gray-300"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <div className="font-medium text-gray-900">
                                  {recipient.recipientName || 'Unknown'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {recipient.recipientEmail || recipient.recipientPhone}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Badge className={engagement.color}>
                                  {engagement.label}
                                </Badge>
                                <span className="text-sm text-gray-500">
                                  {recipient.engagementScore}/100
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm">
                                <span className="font-semibold">{recipient.clickedCount}</span>
                                <span className="text-gray-500"> clicks</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {formatDate(recipient.lastClickedAt)}
                            </td>
                            <td className="px-4 py-3">
                              {recipient.hasConverted ? (
                                <Badge className="bg-green-100 text-green-800">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Converted
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Prospect</Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Actions Footer */}
            {selectedRecipients.size > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-gray-900">
                      {selectedRecipients.size} recipient{selectedRecipients.size > 1 ? 's' : ''} selected
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setSelectedRecipients(new Set())}
                      variant="ghost"
                      size="sm"
                    >
                      Clear Selection
                    </Button>
                    <Button
                      onClick={exportToCSV}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                    <Button
                      onClick={createRetargetingCampaign}
                      size="sm"
                      className="bg-gradient-to-r from-blue-600 to-purple-600"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Create Campaign
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RetargetingAudiences;
