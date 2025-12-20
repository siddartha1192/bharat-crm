import { useState, useEffect } from 'react';
import { Campaign, CampaignStatus, CampaignChannel } from '@/types/campaign';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Send,
  Mail,
  MessageSquare,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Pause,
  Play,
  Trash2,
  Eye,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CampaignDialog } from './CampaignDialog';
import { CampaignDetailView } from './CampaignDetailView';
import api from '@/lib/api';

export default function CampaignSettings() {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CampaignStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailView, setDetailView] = useState<Campaign | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  // Fetch campaigns
  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('status', filter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await api.get(`/campaigns?${params.toString()}`);
      setCampaigns(response.data.campaigns);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch campaigns',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [filter, searchQuery]);

  // Listen for real-time updates via Socket.io
  useEffect(() => {
    // TODO: Add socket listeners for campaign:progress, campaign:completed, campaign:failed
    // This will update campaign stats in real-time
  }, []);

  const handleStartCampaign = async (campaignId: string) => {
    try {
      await api.post(`/campaigns/${campaignId}/start`);
      toast({
        title: 'Success',
        description: 'Campaign started successfully',
      });
      fetchCampaigns();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to start campaign',
        variant: 'destructive',
      });
    }
  };

  const handlePauseCampaign = async (campaignId: string) => {
    try {
      await api.post(`/campaigns/${campaignId}/pause`);
      toast({
        title: 'Success',
        description: 'Campaign paused successfully',
      });
      fetchCampaigns();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to pause campaign',
        variant: 'destructive',
      });
    }
  };

  const handleResumeCampaign = async (campaignId: string) => {
    try {
      await api.post(`/campaigns/${campaignId}/resume`);
      toast({
        title: 'Success',
        description: 'Campaign resumed successfully',
      });
      fetchCampaigns();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to resume campaign',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    try {
      await api.delete(`/campaigns/${campaignId}`);
      toast({
        title: 'Success',
        description: 'Campaign deleted successfully',
      });
      fetchCampaigns();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete campaign',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: CampaignStatus) => {
    const variants: Record<CampaignStatus, { color: string; icon: any }> = {
      draft: { color: 'bg-gray-100 text-gray-700', icon: Clock },
      scheduled: { color: 'bg-blue-100 text-blue-700', icon: Calendar },
      running: { color: 'bg-green-100 text-green-700', icon: Play },
      completed: { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
      paused: { color: 'bg-yellow-100 text-yellow-700', icon: Pause },
      failed: { color: 'bg-red-100 text-red-700', icon: XCircle },
    };

    const variant = variants[status];
    const Icon = variant.icon;

    return (
      <Badge className={`${variant.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getChannelIcon = (channel: CampaignChannel) => {
    return channel === 'email' ? (
      <Mail className="w-4 h-4 text-blue-600" />
    ) : (
      <MessageSquare className="w-4 h-4 text-green-600" />
    );
  };

  const filteredCampaigns = campaigns.filter((campaign) => {
    if (filter !== 'all' && campaign.status !== filter) return false;
    if (searchQuery && !campaign.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  if (detailView) {
    return (
      <CampaignDetailView
        campaign={detailView}
        onBack={() => setDetailView(null)}
        onUpdate={fetchCampaigns}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Email & WhatsApp Campaigns</h2>
          <p className="text-muted-foreground mt-1">
            Create and manage automated email and WhatsApp campaigns
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="running">Running</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>

        <Input
          placeholder="Search campaigns..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {/* Campaign List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground mt-4">Loading campaigns...</p>
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <Card className="p-12 text-center">
          <Send className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No campaigns found</h3>
          <p className="text-muted-foreground mb-6">
            {filter === 'all'
              ? 'Get started by creating your first campaign'
              : `No ${filter} campaigns yet`}
          </p>
          {filter === 'all' && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Campaign
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredCampaigns.map((campaign) => (
            <Card key={campaign.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getChannelIcon(campaign.channel)}
                    <h3 className="text-lg font-semibold">{campaign.name}</h3>
                    {getStatusBadge(campaign.status)}
                  </div>

                  {campaign.description && (
                    <p className="text-sm text-muted-foreground mb-4">
                      {campaign.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{campaign.totalRecipients}</span>
                      <span className="text-muted-foreground">recipients</span>
                    </div>

                    {campaign.sentCount > 0 && (
                      <div className="flex items-center gap-2">
                        <Send className="w-4 h-4 text-green-600" />
                        <span className="font-medium">{campaign.sentCount}</span>
                        <span className="text-muted-foreground">sent</span>
                      </div>
                    )}

                    {campaign.failedCount > 0 && (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <span className="font-medium">{campaign.failedCount}</span>
                        <span className="text-muted-foreground">failed</span>
                      </div>
                    )}

                    {campaign.scheduledAt && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <span className="text-muted-foreground">
                          {new Date(campaign.scheduledAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Progress Bar for Running Campaigns */}
                  {campaign.status === 'running' && campaign.totalRecipients > 0 && (
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">
                          {Math.round((campaign.sentCount / campaign.totalRecipients) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{
                            width: `${(campaign.sentCount / campaign.totalRecipients) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDetailView(campaign)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>

                  {campaign.status === 'draft' && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleStartCampaign(campaign.id)}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Start
                    </Button>
                  )}

                  {campaign.status === 'running' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePauseCampaign(campaign.id)}
                    >
                      <Pause className="w-4 h-4 mr-1" />
                      Pause
                    </Button>
                  )}

                  {campaign.status === 'paused' && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleResumeCampaign(campaign.id)}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Resume
                    </Button>
                  )}

                  {campaign.status !== 'running' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteCampaign(campaign.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Campaign Dialog */}
      <CampaignDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => {
          setDialogOpen(false);
          fetchCampaigns();
        }}
        editingCampaign={editingCampaign}
      />
    </div>
  );
}
