import { useState, useEffect } from 'react';
import { Campaign, CampaignRecipient, CampaignLog, CampaignStats } from '@/types/campaign';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
  Edit,
  UserPlus,
  Trash,
  Search,
  ChevronRight,
  Loader2,
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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecipients, setTotalRecipients] = useState(0);
  const [recipientsPerPage] = useState(50);
  const [exporting, setExporting] = useState(false);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState(campaign.name);
  const [editDescription, setEditDescription] = useState(campaign.description || '');
  const [editLoading, setEditLoading] = useState(false);

  // Manage recipients dialog state
  const [manageRecipientsOpen, setManageRecipientsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableContacts, setAvailableContacts] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [addingRecipients, setAddingRecipients] = useState(false);

  useEffect(() => {
    fetchDetails();
  }, [campaign.id, currentPage]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const [statsRes, recipientsRes, logsRes] = await Promise.all([
        api.get(`/campaigns/${campaign.id}/stats`),
        api.get(`/campaigns/${campaign.id}/recipients`, {
          params: {
            page: currentPage,
            limit: recipientsPerPage
          }
        }),
        api.get(`/campaigns/${campaign.id}/logs`),
      ]);

      setStats(statsRes.data.stats);
      setRecipients(recipientsRes.data.recipients || recipientsRes.data.data);
      setTotalRecipients(recipientsRes.data.total || recipientsRes.data.recipients?.length || 0);
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

  const handleEditCampaign = async () => {
    if (!editName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Campaign name is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setEditLoading(true);
      await api.put(`/campaigns/${campaign.id}`, {
        name: editName,
        description: editDescription,
      });

      toast({
        title: 'Success',
        description: 'Campaign updated successfully',
      });

      setEditDialogOpen(false);
      onUpdate();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update campaign',
        variant: 'destructive',
      });
    } finally {
      setEditLoading(false);
    }
  };

  const handleExportRecipients = async () => {
    try {
      setExporting(true);

      // Fetch ALL recipients (not just current page)
      const allRecipients: CampaignRecipient[] = [];
      let page = 1;
      let hasMore = true;
      const batchSize = 100;

      toast({
        title: 'Exporting...',
        description: 'Fetching all recipients data. This may take a moment for large lists.',
      });

      // Fetch all pages
      while (hasMore) {
        const response = await api.get(`/campaigns/${campaign.id}/recipients`, {
          params: {
            page,
            limit: batchSize
          }
        });

        const batch = response.data.recipients || response.data.data || [];
        allRecipients.push(...batch);

        hasMore = batch.length === batchSize;
        page++;
      }

      if (allRecipients.length === 0) {
        toast({
          title: 'No Data',
          description: 'No recipients to export',
          variant: 'destructive',
        });
        return;
      }

      // Prepare CSV content
      const headers = [
        'Name',
        campaign.channel === 'email' ? 'Email' : 'Phone',
        'Status',
        'Sent At',
        'Opened At',
        'Clicked At',
        'Click Count',
        'Error Message'
      ];

      const rows = allRecipients.map(recipient => [
        recipient.recipientName || '',
        campaign.channel === 'email' ? (recipient.recipientEmail || '') : (recipient.recipientPhone || ''),
        recipient.status || '',
        recipient.sentAt ? new Date(recipient.sentAt).toLocaleString() : '',
        recipient.openedAt ? new Date(recipient.openedAt).toLocaleString() : '',
        recipient.firstClickedAt ? new Date(recipient.firstClickedAt).toLocaleString() : '',
        recipient.clickedCount || 0,
        recipient.errorMessage || ''
      ]);

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => {
          // Escape commas and quotes in cell content
          const cellStr = String(cell);
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `campaign-${campaign.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-recipients-${Date.now()}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Export Successful',
        description: `Exported ${allRecipients.length} recipients to CSV`,
      });
    } catch (error: any) {
      console.error('Error exporting recipients:', error);
      toast({
        title: 'Export Failed',
        description: error.response?.data?.message || 'Failed to export recipients',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const searchContacts = async (query: string) => {
    if (!query || query.length < 2) {
      setAvailableContacts([]);
      return;
    }

    try {
      setSearchLoading(true);
      const response = await api.get(`/contacts?search=${encodeURIComponent(query)}`);
      setAvailableContacts(response.data.contacts || []);
    } catch (error) {
      console.error('Error searching contacts:', error);
      toast({
        title: 'Error',
        description: 'Failed to search contacts',
        variant: 'destructive',
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddRecipient = async (contact: any) => {
    try {
      setAddingRecipients(true);

      const recipientData = {
        recipientType: 'contact',
        recipientId: contact.id,
        recipientName: contact.name,
        recipientEmail: campaign.channel === 'email' ? contact.email : null,
        recipientPhone: campaign.channel === 'whatsapp' ? (contact.whatsapp || contact.phone) : null,
      };

      // Validate contact info
      if (campaign.channel === 'email' && !recipientData.recipientEmail) {
        toast({
          title: 'Invalid Contact',
          description: 'This contact does not have an email address',
          variant: 'destructive',
        });
        return;
      }

      if (campaign.channel === 'whatsapp' && !recipientData.recipientPhone) {
        toast({
          title: 'Invalid Contact',
          description: 'This contact does not have a phone number',
          variant: 'destructive',
        });
        return;
      }

      // Check if already added
      const alreadyAdded = recipients.some(r => r.recipientId === contact.id);
      if (alreadyAdded) {
        toast({
          title: 'Already Added',
          description: 'This contact is already a recipient',
          variant: 'destructive',
        });
        return;
      }

      await api.post(`/campaigns/${campaign.id}/recipients`, recipientData);

      toast({
        title: 'Success',
        description: `${contact.name} added to campaign`,
      });

      // Refresh recipients list
      fetchDetails();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to add recipient',
        variant: 'destructive',
      });
    } finally {
      setAddingRecipients(false);
    }
  };

  const handleRemoveRecipient = async (recipientId: string) => {
    if (!confirm('Are you sure you want to remove this recipient?')) return;

    try {
      await api.delete(`/campaigns/${campaign.id}/recipients/${recipientId}`);

      toast({
        title: 'Success',
        description: 'Recipient removed successfully',
      });

      // Refresh recipients list
      fetchDetails();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to remove recipient',
        variant: 'destructive',
      });
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

        <div className="flex gap-2">
          {campaign.status === 'draft' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditName(campaign.name);
                  setEditDescription(campaign.description || '');
                  setEditDialogOpen(true);
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Campaign
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setManageRecipientsOpen(true)}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Manage Recipients
              </Button>
            </>
          )}
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
            <div>
              <h3 className="font-semibold">Campaign Recipients</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Showing {recipients.length} of {totalRecipients} recipients
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportRecipients}
              disabled={exporting || recipients.length === 0}
            >
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export All ({totalRecipients})
                </>
              )}
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-muted-foreground">Loading recipients...</p>
              </div>
            </div>
          ) : (
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
                  {campaign.status === 'draft' && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={campaign.status === 'draft' ? 6 : 5} className="text-center py-8 text-muted-foreground">
                    No recipients yet. Click "Manage Recipients" to add contacts.
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
                    {campaign.status === 'draft' && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveRecipient(recipient.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          )}

          {/* Pagination Controls */}
          {!loading && totalRecipients > recipientsPerPage && (
            <div className="p-4 border-t flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {Math.ceil(totalRecipients / recipientsPerPage)}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || loading}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalRecipients / recipientsPerPage), prev + 1))}
                  disabled={currentPage >= Math.ceil(totalRecipients / recipientsPerPage) || loading}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
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

      {/* Edit Campaign Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Campaign</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-name">Campaign Name *</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Campaign name"
              />
            </div>

            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Campaign description"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditCampaign} disabled={editLoading}>
              {editLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Recipients Dialog */}
      <Dialog open={manageRecipientsOpen} onOpenChange={setManageRecipientsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Recipients</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="search-contacts">Search Contacts</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="search-contacts"
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchContacts(e.target.value);
                  }}
                  placeholder="Search by name, email, phone, or company..."
                />
              </div>
            </div>

            <div className="border rounded-lg max-h-96 overflow-y-auto">
              {searchLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
                  <p className="text-sm text-muted-foreground mt-2">Searching...</p>
                </div>
              ) : availableContacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {searchQuery.length < 2
                      ? 'Type at least 2 characters to search'
                      : 'No contacts found'}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {availableContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-4 hover:bg-muted"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{contact.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {campaign.channel === 'email'
                            ? contact.email || 'No email'
                            : contact.whatsapp || contact.phone || 'No phone'}
                        </p>
                        {contact.company && (
                          <p className="text-xs text-muted-foreground">{contact.company}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAddRecipient(contact)}
                        disabled={
                          addingRecipients ||
                          recipients.some((r) => r.recipientId === contact.id)
                        }
                      >
                        {recipients.some((r) => r.recipientId === contact.id) ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Added
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Add
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>{recipients.length}</strong> recipient
                {recipients.length !== 1 ? 's' : ''} currently in this campaign
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setManageRecipientsOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
