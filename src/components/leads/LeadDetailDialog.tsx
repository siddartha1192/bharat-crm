import { useState, useEffect, useRef } from 'react';
import { Lead } from '@/types/lead';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  ArrowRight,
  Sparkles,
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
  const [creatingDeal, setCreatingDeal] = useState(false);
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

  const handleCreateDeal = async () => {
    if (!lead) return;

    try {
      setCreatingDeal(true);
      const response = await api.post(`/leads/${lead.id}/create-deal`);
      toast.success('Deal created successfully from lead!');

      // Navigate to the pipeline page to show the newly created deal
      setTimeout(() => {
        window.location.href = '/pipeline';
      }, 1000);
    } catch (error: any) {
      console.error('Error creating deal:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create deal';
      toast.error(errorMessage);
    } finally {
      setCreatingDeal(false);
    }
  };

  if (!lead) return null;

  // Safely get source icon with fallback to default icon
  const SourceIcon = sourceIcons[lead.source as keyof typeof sourceIcons] || User;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 w-full sm:max-w-2xl lg:max-w-4xl overflow-hidden flex flex-col">
        {/* Modern Blue Ribbon Header */}
        <div className="relative bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 text-white px-8 py-6 shadow-lg">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40"></div>
          <div className="relative flex items-start gap-4">
            <Avatar className="h-20 w-20 border-4 border-white/30 shadow-xl ring-4 ring-white/20">
              <AvatarFallback className="bg-white text-blue-600 font-bold text-2xl">
                {lead.name?.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase() || 'L'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-bold text-white truncate mb-1">
                    {lead.name || 'Unnamed Lead'}
                  </h2>
                  <div className="flex items-center gap-2 text-blue-100">
                    <Building2 className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{lead.company || 'No company'}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                      {lead.status.toUpperCase()}
                    </Badge>
                    <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                      {lead.priority.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                {!lead.dealId && (
                  <Button
                    onClick={handleCreateDeal}
                    disabled={creatingDeal}
                    size="lg"
                    className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg"
                  >
                    {creatingDeal ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-4 h-4 mr-2" />
                        Create Deal
                      </>
                    )}
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2 mt-4 text-white/90">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">Estimated Value:</span>
                <span className="text-lg font-bold">
                  ₹{(lead.estimatedValue || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <ScrollArea className="flex-1 px-8 py-6">
          <div className="space-y-6">
            {/* Contact Information Card */}
            <Card className="border-l-4 border-l-blue-500 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Phone className="w-5 h-5 text-blue-600" />
                  </div>
                  Contact Information
                </h3>
                <div className="grid gap-3">
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50/50 to-transparent rounded-xl hover:from-blue-50 transition-colors border border-blue-100/50">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Mail className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Email</div>
                      <a href={`mailto:${lead.email}`} className="text-sm font-semibold hover:text-blue-600 transition-colors truncate block">
                        {lead.email}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50/50 to-transparent rounded-xl hover:from-blue-50 transition-colors border border-blue-100/50">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Phone className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Phone</div>
                      <a href={`tel:${lead.phone}`} className="text-sm font-semibold hover:text-blue-600 transition-colors truncate block">
                        {lead.phone}
                      </a>
                    </div>
                  </div>
                  {lead.whatsapp && (
                    <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50/50 to-transparent rounded-xl hover:from-green-50 transition-colors border border-green-100/50">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <MessageCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-muted-foreground mb-1">WhatsApp</div>
                        <a
                          href={`https://wa.me/${lead.whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold hover:text-green-600 transition-colors flex items-center gap-1 truncate"
                        >
                          <span className="truncate">{lead.whatsapp}</span>
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Social Media & Web Card */}
            {(lead.website || lead.linkedIn || lead.twitter || lead.facebook) && (
              <Card className="border-l-4 border-l-purple-500 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Globe className="w-5 h-5 text-purple-600" />
                    </div>
                    Online Presence
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {lead.website && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="rounded-lg shadow-sm hover:shadow-md hover:scale-105 transition-all"
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
                        className="rounded-lg shadow-sm hover:shadow-md hover:scale-105 transition-all hover:bg-blue-500/10 hover:border-blue-500 hover:text-blue-600"
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
                        className="rounded-lg shadow-sm hover:shadow-md hover:scale-105 transition-all hover:bg-sky-500/10 hover:border-sky-500 hover:text-sky-600"
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
                        className="rounded-lg shadow-sm hover:shadow-md hover:scale-105 transition-all hover:bg-blue-600/10 hover:border-blue-600 hover:text-blue-600"
                      >
                        <a href={lead.facebook} target="_blank" rel="noopener noreferrer">
                          <Facebook className="w-4 h-4 mr-2" />
                          Facebook
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Lead Details Card */}
            <Card className="border-l-4 border-l-green-500 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <SourceIcon className="w-5 h-5 text-green-600" />
                  </div>
                  Lead Details
                </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 sm:col-span-1 p-4 bg-gradient-to-br from-green-50/50 to-transparent rounded-xl border border-green-100/50">
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
                        <SourceIcon className="w-4 h-4 text-green-600" />
                        Source
                      </div>
                      <div className="text-sm font-semibold capitalize">{lead.source.replace('-', ' ')}</div>
                    </div>
                    <div className="col-span-2 sm:col-span-1 p-4 bg-gradient-to-br from-green-50/50 to-transparent rounded-xl border border-green-100/50">
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
                        <User className="w-4 h-4 text-green-600" />
                        Assigned To
                      </div>
                      <div className="text-sm font-semibold">{lead.assignedTo}</div>
                    </div>
                    {lead.createdAt && (
                      <div className="col-span-2 p-4 bg-gradient-to-br from-green-50/50 to-transparent rounded-xl border border-green-100/50">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
                          <Calendar className="w-4 h-4 text-green-600" />
                          Created
                        </div>
                        <div className="text-sm font-semibold">
                          {format(new Date(lead.createdAt), 'PPP')}
                          <span className="text-xs text-muted-foreground ml-2">({formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })})</span>
                        </div>
                      </div>
                    )}
                    {lead.lastContactedAt && (
                      <div className="col-span-2 p-4 bg-gradient-to-br from-amber-50/50 to-transparent rounded-xl border border-amber-100/50">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
                          <Clock className="w-4 h-4 text-amber-600" />
                          Last Contacted
                        </div>
                        <div className="text-sm font-semibold">
                          {format(new Date(lead.lastContactedAt), 'PPP')}
                          <span className="text-xs text-muted-foreground ml-2">({formatDistanceToNow(new Date(lead.lastContactedAt), { addSuffix: true })})</span>
                        </div>
                      </div>
                    )}
                    {lead.nextFollowUpAt && (
                      <div className="col-span-2 p-4 bg-gradient-to-br from-rose-50 to-transparent rounded-xl border-2 border-rose-300 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-medium text-rose-700 mb-1">
                          <Calendar className="w-4 h-4" />
                          Next Follow-up
                        </div>
                        <div className="text-sm font-bold text-rose-700">
                          {format(new Date(lead.nextFollowUpAt), 'PPP')}
                          <span className="text-xs font-normal ml-2">({formatDistanceToNow(new Date(lead.nextFollowUpAt), { addSuffix: true })})</span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

            {/* Notes Card */}
            {lead.notes && (
              <Card className="border-l-4 border-l-amber-500 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <FileText className="w-5 h-5 text-amber-600" />
                    </div>
                    Notes
                  </h3>
                  <div className="p-4 bg-gradient-to-br from-amber-50/50 to-transparent rounded-xl border border-amber-100/50">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{lead.notes}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tags Card */}
            {lead.tags && Array.isArray(lead.tags) && lead.tags.length > 0 && (
              <Card className="border-l-4 border-l-pink-500 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
                    <div className="p-2 bg-pink-100 rounded-lg">
                      <Tag className="w-5 h-5 text-pink-600" />
                    </div>
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {lead.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="px-3 py-1 text-sm font-medium rounded-full shadow-sm hover:shadow-md transition-shadow">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Documents Card */}
            <Card className="border-l-4 border-l-indigo-500 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <FileText className="w-5 h-5 text-indigo-600" />
                    </div>
                    Documents ({documents.length})
                  </h3>
                  <Button
                    size="sm"
                    onClick={handleFileSelect}
                    disabled={uploading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                  >
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
                  <div className="text-center py-12 bg-gradient-to-br from-indigo-50/50 to-transparent rounded-xl border-2 border-dashed border-indigo-200">
                    <div className="p-4 bg-white rounded-full w-fit mx-auto mb-3 shadow-sm">
                      <FileText className="w-10 h-10 text-indigo-400" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">No documents uploaded yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Upload documents to keep track of important files</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50/30 to-transparent rounded-xl border border-indigo-100/50 hover:border-indigo-200 hover:shadow-md transition-all group">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="p-2 bg-white rounded-lg shadow-sm group-hover:shadow transition-shadow">
                            <FileText className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold truncate">{doc.fileName}</div>
                            <div className="text-xs text-muted-foreground">
                              {doc.formattedSize} • {doc.user.name} • {format(new Date(doc.createdAt), 'PPp')}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownloadDocument(doc.id)}
                            className="hover:bg-indigo-100 hover:text-indigo-700"
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
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        {/* Modern Action Footer */}
        <div className="border-t bg-gradient-to-r from-slate-50 to-slate-100/50 px-8 py-4 flex gap-3 shadow-lg">
          <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all" onClick={handleSendEmail}>
            <Mail className="w-4 h-4 mr-2" />
            Send Email
          </Button>
          <Button className="flex-1 border-2 border-blue-200 hover:border-blue-300 hover:bg-blue-50 shadow-sm hover:shadow-md transition-all" variant="outline" onClick={handleScheduleMeeting}>
            <Video className="w-4 h-4 mr-2" />
            Schedule Meeting
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
