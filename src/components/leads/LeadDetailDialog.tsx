import { useState, useEffect, useRef } from 'react';
import { Lead } from '@/types/lead';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { api } from '@/lib/api';
import {
  Building2,
  Mail,
  Phone,
  IndianRupee,
  Calendar,
  MessageCircle,
  Globe,
  User,
  Clock,
  Tag,
  Linkedin,
  Twitter,
  Facebook,
  ExternalLink,
  Video,
  FileText,
  Upload,
  Download,
  Trash2,
  Loader2,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface LeadDetailDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const sourceIcons = {
  'web-form': Globe,
  'whatsapp': MessageCircle,
  'call': Phone,
  'email': Mail,
  'referral': User,
  'social-media': Twitter,
  'missed-call': Phone,
};

const statusColors = {
  'new': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'contacted': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  'qualified': 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  'proposal': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  'negotiation': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  'won': 'bg-green-500/10 text-green-500 border-green-500/20',
  'lost': 'bg-red-500/10 text-red-500 border-red-500/20',
};

const priorityColors = {
  'low': 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  'medium': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'high': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  'urgent': 'bg-red-500/10 text-red-600 border-red-500/20',
};

interface Document {
  id: string;
  fileName: string;
  fileSize: number;
  formattedSize: string;
  mimeType: string;
  createdAt: string;
  user: {
    name: string;
  };
}

export function LeadDetailDialog({ lead, open, onOpenChange }: LeadDetailDialogProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (lead && open) {
      loadDocuments();
    }
  }, [lead, open]);

  const loadDocuments = async () => {
    if (!lead) return;

    try {
      const response = await api.get(`/documents/Lead/${lead.id}`);
      setDocuments(response.data);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !lead) return;

    // Validate file size (100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`File size must be less than 100MB. Selected file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', 'Lead');
      formData.append('entityId', lead.id);

      // Don't set Content-Type header - let the browser set it with boundary
      await api.post('/documents/upload', formData);

      toast.success('Document uploaded successfully');
      loadDocuments();

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error(error.response?.data?.error || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadDocument = async (documentId: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/documents/download/${documentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = documents.find(d => d.id === documentId)?.fileName || 'document';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await api.delete(`/documents/${documentId}`);
      toast.success('Document deleted');
      loadDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const handleSendEmail = () => {
    if (!lead) return;
    // Navigate to emails page
    window.location.href = `/emails?compose=true&to=${encodeURIComponent(lead.email)}&subject=${encodeURIComponent(`Follow-up: ${lead.name}`)}`;
  };

  const handleScheduleMeeting = () => {
    if (!lead) return;
    // Navigate to calendar page
    window.location.href = `/calendar?new=true&title=${encodeURIComponent(`Meeting with ${lead.name}`)}&attendees=${encodeURIComponent(lead.email)}`;
  };

  if (!lead) return null;

  const SourceIcon = sourceIcons[lead.source];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-semibold text-xl">
                {lead.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-2xl font-bold">{lead.name}</div>
              <div className="text-sm font-normal text-muted-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                {lead.company}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Status & Priority */}
          <div className="flex items-center gap-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Status</div>
              <Badge className={`${statusColors[lead.status]} border`}>
                {lead.status.toUpperCase()}
              </Badge>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Priority</div>
              <Badge className={`${priorityColors[lead.priority]} border`}>
                {lead.priority.toUpperCase()}
              </Badge>
            </div>
            <div className="ml-auto">
              <div className="text-xs text-muted-foreground mb-1">Estimated Value</div>
              <div className="flex items-center gap-1 text-lg font-bold text-foreground">
                <IndianRupee className="w-5 h-5" />
                ₹{lead.estimatedValue.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <Separator />

          {/* Contact Information */}
          <div>
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Contact Information
            </h3>
            <div className="grid gap-3">
              <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg hover:bg-secondary/30 transition-colors">
                <Mail className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground">Email</div>
                  <a href={`mailto:${lead.email}`} className="text-sm font-medium hover:text-primary">
                    {lead.email}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg hover:bg-secondary/30 transition-colors">
                <Phone className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground">Phone</div>
                  <a href={`tel:${lead.phone}`} className="text-sm font-medium hover:text-primary">
                    {lead.phone}
                  </a>
                </div>
              </div>
              {lead.whatsapp && (
                <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg hover:bg-secondary/30 transition-colors">
                  <MessageCircle className="w-5 h-5 text-green-600" />
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground">WhatsApp</div>
                    <a
                      href={`https://wa.me/${lead.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium hover:text-primary flex items-center gap-1"
                    >
                      {lead.whatsapp}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Social Media & Web */}
          {(lead.website || lead.linkedIn || lead.twitter || lead.facebook) && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Online Presence
                </h3>
                <div className="flex flex-wrap gap-2">
                  {lead.website && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="hover:bg-primary/10 hover:border-primary"
                    >
                      <a href={lead.website} target="_blank" rel="noopener noreferrer">
                        <Globe className="w-4 h-4 mr-2" />
                        Website
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </Button>
                  )}
                  {lead.linkedIn && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="hover:bg-blue-500/10 hover:border-blue-500"
                    >
                      <a href={lead.linkedIn} target="_blank" rel="noopener noreferrer">
                        <Linkedin className="w-4 h-4 mr-2" />
                        LinkedIn
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </Button>
                  )}
                  {lead.twitter && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="hover:bg-sky-500/10 hover:border-sky-500"
                    >
                      <a href={lead.twitter} target="_blank" rel="noopener noreferrer">
                        <Twitter className="w-4 h-4 mr-2" />
                        Twitter
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </Button>
                  )}
                  {lead.facebook && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="hover:bg-blue-600/10 hover:border-blue-600"
                    >
                      <a href={lead.facebook} target="_blank" rel="noopener noreferrer">
                        <Facebook className="w-4 h-4 mr-2" />
                        Facebook
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Lead Details */}
          <div>
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <SourceIcon className="w-5 h-5" />
              Lead Details
            </h3>
            <div className="grid gap-3">
              <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg">
                <SourceIcon className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-xs text-muted-foreground">Source</div>
                  <div className="text-sm font-medium capitalize">{lead.source.replace('-', ' ')}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg">
                <User className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-xs text-muted-foreground">Assigned To</div>
                  <div className="text-sm font-medium">{lead.assignedTo}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg">
                <Calendar className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-xs text-muted-foreground">Created</div>
                  <div className="text-sm font-medium">
                    {format(lead.createdAt, 'PPP')} ({formatDistanceToNow(lead.createdAt, { addSuffix: true })})
                  </div>
                </div>
              </div>
              {lead.lastContactedAt && (
                <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg">
                  <Clock className="w-5 h-5 text-primary" />
                  <div>
                    <div className="text-xs text-muted-foreground">Last Contacted</div>
                    <div className="text-sm font-medium">
                      {format(lead.lastContactedAt, 'PPP')} ({formatDistanceToNow(lead.lastContactedAt, { addSuffix: true })})
                    </div>
                  </div>
                </div>
              )}
              {lead.nextFollowUpAt && (
                <div className="flex items-center gap-3 p-3 bg-accent/20 rounded-lg border border-accent">
                  <Calendar className="w-5 h-5 text-accent-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Next Follow-up</div>
                    <div className="text-sm font-medium">
                      {format(lead.nextFollowUpAt, 'PPP')} ({formatDistanceToNow(lead.nextFollowUpAt, { addSuffix: true })})
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {lead.notes && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-foreground mb-3">Notes</h3>
                <p className="text-sm text-muted-foreground bg-secondary/20 p-4 rounded-lg">
                  {lead.notes}
                </p>
              </div>
            </>
          )}

          {/* Tags */}
          {lead.tags.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Tag className="w-5 h-5" />
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {lead.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-sm">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Documents */}
          <Separator />
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Documents ({documents.length})
              </h3>
              <Button size="sm" onClick={handleFileSelect} disabled={uploading}>
                {uploading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
                ) : (
                  <><Upload className="w-4 h-4 mr-2" />Upload</>
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
            {documents.length === 0 ? (
              <div className="text-center py-8 bg-secondary/20 rounded-lg">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{doc.fileName}</div>
                        <div className="text-xs text-muted-foreground">
                          {doc.formattedSize} • Uploaded by {doc.user.name} • {format(new Date(doc.createdAt), 'PPp')}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDownloadDocument(doc.id)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button className="flex-1" onClick={handleSendEmail}>
              <Mail className="w-4 h-4 mr-2" />
              Send Email
            </Button>
            <Button className="flex-1" variant="outline" onClick={handleScheduleMeeting}>
              <Video className="w-4 h-4 mr-2" />
              Schedule Meeting
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
