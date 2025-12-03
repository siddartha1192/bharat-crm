import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getAuthHeaders } from '@/contexts/AuthContext';
import {
  Mail,
  Send,
  Inbox,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Search,
  Filter,
  Eye,
  Trash2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface EmailLog {
  id: string;
  to: string[];
  cc: string[];
  bcc: string[];
  from: string;
  subject: string;
  body: string;
  htmlBody?: string;
  status: string;
  errorMessage?: string;
  entityType?: string;
  entityId?: string;
  sentAt?: string;
  createdAt: string;
}

interface EmailStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
}

export default function Emails() {
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [stats, setStats] = useState<EmailStats>({ total: 0, sent: 0, failed: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [viewEmailOpen, setViewEmailOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [emailToDelete, setEmailToDelete] = useState<EmailLog | null>(null);
  const { toast } = useToast();

  // Compose form state
  const [composeData, setComposeData] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    text: '',
    html: '',
  });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchEmails();
    fetchStats();
  }, [statusFilter]);

  const fetchEmails = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (statusFilter !== 'all') queryParams.append('status', statusFilter);

      const response = await fetch(`${API_URL}/emails?${queryParams}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error('Failed to fetch emails');

      const data = await response.json();
      setEmails(data.logs);
    } catch (error) {
      console.error('Error fetching emails:', error);
      toast({
        title: 'Error',
        description: 'Failed to load emails',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/emails/stats/summary`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error('Failed to fetch stats');

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSendEmail = async () => {
    if (!composeData.to || !composeData.subject || !composeData.text) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in recipient, subject, and message',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);

    try {
      const response = await fetch(`${API_URL}/emails/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          to: composeData.to.split(',').map((e) => e.trim()),
          cc: composeData.cc ? composeData.cc.split(',').map((e) => e.trim()) : [],
          bcc: composeData.bcc ? composeData.bcc.split(',').map((e) => e.trim()) : [],
          subject: composeData.subject,
          text: composeData.text,
          html: composeData.html || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send email');
      }

      toast({
        title: 'Success!',
        description: 'Email sent successfully',
      });

      setComposeOpen(false);
      setComposeData({ to: '', cc: '', bcc: '', subject: '', text: '', html: '' });
      fetchEmails();
      fetchStats();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send email',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleDeleteEmail = async () => {
    if (!emailToDelete) return;

    try {
      const response = await fetch(`${API_URL}/emails/${emailToDelete.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete email');
      }

      toast({
        title: 'Success!',
        description: 'Email deleted successfully',
      });

      setDeleteConfirmOpen(false);
      setEmailToDelete(null);
      fetchEmails();
      fetchStats();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete email',
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      sent: 'default',
      failed: 'destructive',
      pending: 'secondary',
    };
    return (
      <Badge variant={variants[status] || 'outline'}>
        {status}
      </Badge>
    );
  };

  const filteredEmails = emails.filter((email) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      email.subject.toLowerCase().includes(query) ||
      email.to.some((to) => to.toLowerCase().includes(query)) ||
      email.from.toLowerCase().includes(query)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Emails</h1>
          <p className="text-muted-foreground mt-1">
            Send and track emails for leads, contacts, and more
          </p>
        </div>
        <Button onClick={() => setComposeOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Compose New Email
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Emails</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Sent</p>
              <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Failed</p>
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search emails by subject, recipient, or sender..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Email List */}
      <Card>
        <div className="divide-y">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading emails...
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="p-8 text-center">
              <Inbox className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No emails found</p>
            </div>
          ) : (
            filteredEmails.map((email) => (
              <div
                key={email.id}
                className="p-4 hover:bg-accent/50 cursor-pointer transition-colors"
                onClick={() => {
                  setSelectedEmail(email);
                  setViewEmailOpen(true);
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-1">{getStatusIcon(email.status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{email.subject}</h3>
                        {getStatusBadge(email.status)}
                        {email.entityType && (
                          <Badge variant="outline" className="text-xs">
                            {email.entityType}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        To: {email.to.join(', ')}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {email.body}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 text-sm text-muted-foreground shrink-0">
                    <span>
                      {email.sentAt
                        ? new Date(email.sentAt).toLocaleDateString()
                        : new Date(email.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEmail(email);
                          setViewEmailOpen(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEmailToDelete(email);
                          setDeleteConfirmOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-600 hover:text-red-700" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Compose Dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Compose New Email</DialogTitle>
            <DialogDescription>
              Send an email to leads, contacts, or any recipient
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="to">To (comma separated)</Label>
              <Input
                id="to"
                placeholder="recipient@example.com, another@example.com"
                value={composeData.to}
                onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cc">CC (optional, comma separated)</Label>
              <Input
                id="cc"
                placeholder="cc@example.com"
                value={composeData.cc}
                onChange={(e) => setComposeData({ ...composeData, cc: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bcc">BCC (optional, comma separated)</Label>
              <Input
                id="bcc"
                placeholder="bcc@example.com"
                value={composeData.bcc}
                onChange={(e) => setComposeData({ ...composeData, bcc: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Email subject"
                value={composeData.subject}
                onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="text">Message</Label>
              <Textarea
                id="text"
                placeholder="Write your message here..."
                rows={10}
                value={composeData.text}
                onChange={(e) => setComposeData({ ...composeData, text: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setComposeOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendEmail} disabled={sending}>
                {sending ? (
                  <>Sending...</>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Email
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Email Dialog */}
      <Dialog open={viewEmailOpen} onOpenChange={setViewEmailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEmail?.subject}</DialogTitle>
            <DialogDescription>
              {selectedEmail?.sentAt
                ? `Sent on ${new Date(selectedEmail.sentAt).toLocaleString()}`
                : `Created on ${new Date(selectedEmail?.createdAt || '').toLocaleString()}`}
            </DialogDescription>
          </DialogHeader>

          {selectedEmail && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center gap-2">
                {getStatusIcon(selectedEmail.status)}
                {getStatusBadge(selectedEmail.status)}
                {selectedEmail.entityType && (
                  <Badge variant="outline">{selectedEmail.entityType}</Badge>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">From:</p>
                <p className="text-sm">{selectedEmail.from}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">To:</p>
                <p className="text-sm">{selectedEmail.to.join(', ')}</p>
              </div>

              {selectedEmail.cc.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">CC:</p>
                  <p className="text-sm">{selectedEmail.cc.join(', ')}</p>
                </div>
              )}

              {selectedEmail.bcc.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">BCC:</p>
                  <p className="text-sm">{selectedEmail.bcc.join(', ')}</p>
                </div>
              )}

              <div className="border-t pt-4">
                <p className="text-sm whitespace-pre-wrap">{selectedEmail.body}</p>
              </div>

              {selectedEmail.status === 'failed' && selectedEmail.errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-sm font-semibold text-red-800 mb-1">Error:</p>
                  <p className="text-sm text-red-700">{selectedEmail.errorMessage}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Email</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this email? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {emailToDelete && (
            <div className="space-y-4 mt-4">
              <div className="bg-muted p-4 rounded-md">
                <p className="text-sm font-semibold mb-2">{emailToDelete.subject}</p>
                <p className="text-sm text-muted-foreground">To: {emailToDelete.to.join(', ')}</p>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeleteConfirmOpen(false);
                    setEmailToDelete(null);
                  }}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteEmail}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Email
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
