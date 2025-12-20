import { useState, useEffect } from 'react';
import { Campaign, CampaignRecipient, CampaignLog, CampaignStats } from '@/types/campaign';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChevronLeft,
  Users,
  Send,
  XCircle,
  CheckCircle,
  Clock,
  Mail,
  MessageSquare,
  Download,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

interface Props {
  campaign: Campaign;
  onBack: () => void;
  onUpdate: () => void;
}

export function CampaignDetailView({ campaign, onBack, onUpdate }: Props) {
  const { toast } = useToast();
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([]);
  const [logs, setLogs] = useState<CampaignLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'recipients' | 'logs'>('recipients');

  useEffect(() => {
    fetchDetails();
  }, [campaign.id]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const [statsRes, recipientsRes, logsRes] = await Promise.all([
        api.get(`/campaigns/${campaign.id}/stats`),
        api.get(`/campaigns/${campaign.id}/recipients?limit=100`),
        api.get(`/campaigns/${campaign.id}/logs`),
      ]);

      setStats(statsRes.data.stats);
      setRecipients(recipientsRes.data.recipients);
      setLogs(logsRes.data.logs);
    } catch (error) {
      console.error('Error fetching campaign details:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch campaign details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-700',
      sent: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      delivered: 'bg-blue-100 text-blue-700',
      opened: 'bg-purple-100 text-purple-700',
    };

    return (
      <Badge className={colors[status] || 'bg-gray-100 text-gray-700'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        <p className="text-muted-foreground mt-4">Loading campaign details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              {campaign.channel === 'email' ? (
                <Mail className="w-5 h-5 text-blue-600" />
              ) : (
                <MessageSquare className="w-5 h-5 text-green-600" />
              )}
              <h2 className="text-2xl font-bold">{campaign.name}</h2>
            </div>
            {campaign.description && (
              <p className="text-muted-foreground mt-1">{campaign.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Recipients</p>
              <p className="text-3xl font-bold mt-2">{stats?.total || 0}</p>
            </div>
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Sent</p>
              <p className="text-3xl font-bold mt-2 text-green-600">{stats?.sent || 0}</p>
            </div>
            <Send className="w-8 h-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Failed</p>
              <p className="text-3xl font-bold mt-2 text-red-600">{stats?.failed || 0}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {campaign.channel === 'email' ? 'Opened' : 'Delivered'}
              </p>
              <p className="text-3xl font-bold mt-2 text-blue-600">
                {campaign.channel === 'email' ? stats?.opened || 0 : stats?.delivered || 0}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-blue-600" />
          </div>
        </Card>
      </div>

      {/* Progress Bar */}
      {campaign.status === 'running' && campaign.totalRecipients > 0 && (
        <Card className="p-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">Campaign Progress</span>
            <span className="text-muted-foreground">
              {campaign.sentCount} / {campaign.totalRecipients} (
              {Math.round((campaign.sentCount / campaign.totalRecipients) * 100)}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all"
              style={{
                width: `${(campaign.sentCount / campaign.totalRecipients) * 100}%`,
              }}
            />
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b">
        <button
          className={`pb-2 px-4 font-medium transition-colors ${
            activeTab === 'recipients'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('recipients')}
        >
          Recipients ({recipients.length})
        </button>
        <button
          className={`pb-2 px-4 font-medium transition-colors ${
            activeTab === 'logs'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('logs')}
        >
          Activity Log ({logs.length})
        </button>
      </div>

      {/* Recipients Table */}
      {activeTab === 'recipients' && (
        <Card>
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold">Campaign Recipients</h3>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>
                  {campaign.channel === 'email' ? 'Email' : 'Phone'}
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent At</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No recipients yet
                  </TableCell>
                </TableRow>
              ) : (
                recipients.map((recipient) => (
                  <TableRow key={recipient.id}>
                    <TableCell className="font-medium">{recipient.recipientName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {campaign.channel === 'email'
                        ? recipient.recipientEmail
                        : recipient.recipientPhone}
                    </TableCell>
                    <TableCell>{getStatusBadge(recipient.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {recipient.sentAt
                        ? new Date(recipient.sentAt).toLocaleString()
                        : '-'}
                    </TableCell>
                    <TableCell className="text-red-600 text-sm">
                      {recipient.errorMessage || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Activity Log */}
      {activeTab === 'logs' && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Campaign Activity</h3>

          <div className="space-y-4">
            {logs.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No activity logs yet</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex gap-4 items-start border-l-2 border-primary pl-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{log.action}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm">{log.message}</p>
                    {log.metadata && (
                      <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
