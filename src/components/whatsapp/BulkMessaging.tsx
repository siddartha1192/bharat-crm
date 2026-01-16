import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  Send,
  Loader2,
  Users,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Search,
  Image as ImageIcon,
  FileText,
  Video,
  Music,
  X,
  Plus,
  Paperclip,
  Upload,
  ChevronLeft,
  ChevronRight,
  Eye,
  Smartphone,
  Check,
  Filter,
  FileUp,
  Sparkles,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface Contact {
  id: string;
  name: string;
  company: string;
  phone: string;
  whatsapp?: string;
  whatsappNormalized?: string;
  phoneNormalized?: string;
  email?: string;
}

interface BulkMessageResult {
  phone: string;
  name: string;
  success: boolean;
  error?: string;
  messageId?: string;
}

interface MediaFile {
  file: File;
  type: 'image' | 'document' | 'video' | 'audio';
  preview?: string;
}

export default function BulkMessaging() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<BulkMessageResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [messageType, setMessageType] = useState<'text' | 'media' | 'template'>('text');
  const [showRecipientsPanel, setShowRecipientsPanel] = useState(true);
  const [showPreviewPanel, setShowPreviewPanel] = useState(true);

  // Media state
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [mediaUrl, setMediaUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Template state
  const [templateName, setTemplateName] = useState('');
  const [templateLanguage, setTemplateLanguage] = useState('en');
  const [templateParams, setTemplateParams] = useState<string[]>(['']);

  const { toast } = useToast();
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/contacts?limit=1000`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch contacts');

      const responseData = await response.json();
      const contactsList = responseData.data || responseData;

      // Filter contacts that have WhatsApp numbers
      const whatsappContacts = contactsList.filter((c: Contact) => c.whatsapp || c.phone);
      setContacts(whatsappContacts);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load contacts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const filtered = getFilteredContacts();
      setSelectedContacts(new Set(filtered.map(c => c.id)));
    } else {
      setSelectedContacts(new Set());
    }
  };

  const handleSelectContact = (contactId: string, checked: boolean) => {
    const newSelected = new Set(selectedContacts);
    if (checked) {
      newSelected.add(contactId);
    } else {
      newSelected.delete(contactId);
    }
    setSelectedContacts(newSelected);
  };

  const getFilteredContacts = () => {
    let filtered = contacts;

    if (searchQuery) {
      filtered = filtered.filter(
        c =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.phone.includes(searchQuery)
      );
    }

    return filtered;
  };

  // Media handling
  const getMediaType = (file: File): 'image' | 'document' | 'video' | 'audio' | null => {
    const type = file.type;
    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('video/')) return 'video';
    if (type.startsWith('audio/')) return 'audio';
    if (type === 'application/pdf' || type.includes('document') || type.includes('sheet') || type.includes('presentation')) {
      return 'document';
    }
    return null;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const mediaType = getMediaType(file);
    if (!mediaType) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image, document, video, or audio file',
        variant: 'destructive',
      });
      return;
    }

    const maxSize = mediaType === 'document' ? 100 * 1024 * 1024 : mediaType === 'image' ? 5 * 1024 * 1024 : 16 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: `${mediaType === 'document' ? 'Documents' : mediaType === 'image' ? 'Images' : 'Videos/Audio'} must be less than ${maxSize / (1024 * 1024)}MB`,
        variant: 'destructive',
      });
      return;
    }

    let preview: string | undefined;
    if (mediaType === 'image') {
      preview = URL.createObjectURL(file);
    }

    setSelectedMedia({ file, type: mediaType, preview });
  };

  const handleMediaRemove = () => {
    if (selectedMedia?.preview) {
      URL.revokeObjectURL(selectedMedia.preview);
    }
    setSelectedMedia(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileUploadToCloudinary = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const mediaType = getMediaType(file);
    if (!mediaType) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image, document, video, or audio file',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/media/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload file');
      }

      const data = await response.json();
      setMediaUrl(data.url);
      setSelectedMedia({
        file,
        type: mediaType,
        preview: file.type.startsWith('image/') ? data.url : undefined,
      });

      toast({
        title: 'File Uploaded',
        description: 'File uploaded to Cloudinary successfully',
      });
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload file to Cloudinary',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      // Reset file input
      if (uploadInputRef.current) {
        uploadInputRef.current.value = '';
      }
    }
  };

  const sendBulkMessages = async () => {
    if (selectedContacts.size === 0) {
      toast({
        title: 'No Recipients',
        description: 'Please select at least one contact',
        variant: 'destructive',
      });
      return;
    }

    // Validation based on message type
    if (messageType === 'text' && !message.trim()) {
      toast({
        title: 'No Message',
        description: 'Please enter a message to send',
        variant: 'destructive',
      });
      return;
    }

    if (messageType === 'media' && !mediaUrl.trim() && !selectedMedia) {
      toast({
        title: 'No Media',
        description: 'Please provide a media URL or upload a file',
        variant: 'destructive',
      });
      return;
    }

    if (messageType === 'template' && !templateName.trim()) {
      toast({
        title: 'No Template',
        description: 'Please enter a template name',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSending(true);
      setShowResults(false);

      const selectedContactsData = contacts.filter(c => selectedContacts.has(c.id));
      let bulkResults: BulkMessageResult[] = [];

      if (messageType === 'text') {
        // Send text messages using existing bulk endpoint
        const response = await fetch(`${API_URL}/whatsapp/bulk-send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: message.trim(),
            contacts: selectedContactsData.map(c => ({
              id: c.id,
              name: c.name,
              phone: c.whatsapp || c.phone,
              whatsapp: c.whatsapp,
              whatsappNormalized: c.whatsappNormalized,
              phoneNormalized: c.phoneNormalized,
            })),
          }),
        });

        if (!response.ok) throw new Error('Failed to send bulk messages');
        const data = await response.json();
        bulkResults = data.results || [];
      } else if (messageType === 'media') {
        // Send media messages to each contact individually
        for (const contact of selectedContactsData) {
          try {
            // Use normalized phone number with country code
            const recipientPhone = contact.whatsappNormalized || contact.phoneNormalized || contact.whatsapp || contact.phone;

            const endpoint = selectedMedia
              ? `/whatsapp/send-${selectedMedia.type}`
              : `/whatsapp/send-image`; // default to image if URL provided

            const mediaUrlToSend = mediaUrl.trim() || (selectedMedia ? URL.createObjectURL(selectedMedia.file) : '');

            const payload: any = {
              phoneNumber: recipientPhone,
            };

            if (selectedMedia?.type === 'image' || !selectedMedia) {
              payload.imageUrl = mediaUrlToSend;
              payload.caption = message.trim();
            } else if (selectedMedia?.type === 'document') {
              payload.documentUrl = mediaUrlToSend;
              payload.filename = selectedMedia.file.name;
              payload.caption = message.trim();
            } else if (selectedMedia?.type === 'video') {
              payload.videoUrl = mediaUrlToSend;
              payload.caption = message.trim();
            } else if (selectedMedia?.type === 'audio') {
              payload.audioUrl = mediaUrlToSend;
            }

            const response = await fetch(`${API_URL}${endpoint}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(payload),
            });

            if (response.ok) {
              const data = await response.json();
              bulkResults.push({
                phone: recipientPhone,
                name: contact.name,
                success: true,
                messageId: data.messageId,
              });
            } else {
              const error = await response.json();
              bulkResults.push({
                phone: recipientPhone,
                name: contact.name,
                success: false,
                error: error.error || 'Failed to send',
              });
            }
          } catch (error: any) {
            bulkResults.push({
              phone: recipientPhone,
              name: contact.name,
              success: false,
              error: error.message,
            });
          }
        }
      } else if (messageType === 'template') {
        // Send template messages to each contact individually
        const components: any = {};
        if (templateParams.length > 0 && templateParams[0].trim()) {
          components.body = templateParams.filter(p => p.trim()).map(p => ({ text: p }));
        }

        for (const contact of selectedContactsData) {
          try {
            // Use normalized phone number with country code
            const recipientPhone = contact.whatsappNormalized || contact.phoneNormalized || contact.whatsapp || contact.phone;

            const response = await fetch(`${API_URL}/whatsapp/send-template`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                phoneNumber: recipientPhone,
                templateName: templateName.trim(),
                languageCode: templateLanguage,
                components,
              }),
            });

            if (response.ok) {
              const data = await response.json();
              bulkResults.push({
                phone: recipientPhone,
                name: contact.name,
                success: true,
                messageId: data.messageId,
              });
            } else {
              const error = await response.json();
              bulkResults.push({
                phone: recipientPhone,
                name: contact.name,
                success: false,
                error: error.error || 'Failed to send',
              });
            }
          } catch (error: any) {
            bulkResults.push({
              phone: recipientPhone,
              name: contact.name,
              success: false,
              error: error.message,
            });
          }
        }
      }

      setResults(bulkResults);
      setShowResults(true);

      const successCount = bulkResults.filter(r => r.success).length;
      const failureCount = bulkResults.length - successCount;

      toast({
        title: 'Bulk Messages Sent',
        description: `Successfully sent to ${successCount} contact(s). ${failureCount > 0 ? `${failureCount} failed.` : ''}`,
      });

      // Clear selection and message after successful send
      setSelectedContacts(new Set());
      setMessage('');
      setMediaUrl('');
      handleMediaRemove();
      setTemplateName('');
      setTemplateParams(['']);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send bulk messages',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const filteredContacts = getFilteredContacts();
  const allSelected = filteredContacts.length > 0 && filteredContacts.every(c => selectedContacts.has(c.id));

  // Live Preview Component
  const MessagePreview = () => {
    if (messageType === 'text' && !message.trim()) return null;
    if (messageType === 'media' && !mediaUrl && !selectedMedia) return null;
    if (messageType === 'template' && !templateName.trim()) return null;

    return (
      <div className="sticky top-4">
        <Card className="overflow-hidden border-green-200 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-4">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              <CardTitle className="text-sm font-semibold">Live Preview</CardTitle>
            </div>
            <CardDescription className="text-green-100 text-xs">
              How it will appear on WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 bg-[#e5ddd5] min-h-[300px]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d9d9d9' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}>
            <div className="flex justify-end">
              <div className="max-w-[85%] bg-[#dcf8c6] rounded-lg p-3 shadow-md relative rounded-br-none">
                {messageType === 'media' && selectedMedia?.preview && (
                  <img src={selectedMedia.preview} alt="Preview" className="rounded mb-2 max-h-[200px] object-cover" />
                )}
                {messageType === 'media' && selectedMedia && !selectedMedia.preview && (
                  <div className="bg-white/50 rounded p-3 mb-2 flex items-center gap-2">
                    {selectedMedia.type === 'document' && <FileText className="w-5 h-5 text-blue-600" />}
                    {selectedMedia.type === 'video' && <Video className="w-5 h-5 text-purple-600" />}
                    {selectedMedia.type === 'audio' && <Music className="w-5 h-5 text-orange-600" />}
                    <span className="text-sm font-medium truncate">{selectedMedia.file.name}</span>
                  </div>
                )}
                {messageType === 'template' ? (
                  <div>
                    <div className="text-xs text-gray-600 mb-1 font-semibold">Template Message</div>
                    <p className="text-sm">{templateName}</p>
                    {templateParams.filter(p => p.trim()).length > 0 && (
                      <div className="text-xs text-gray-600 mt-2">
                        Params: {templateParams.filter(p => p.trim()).join(', ')}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {message || (messageType === 'media' ? '(Media without caption)' : 'Type your message...')}
                  </p>
                )}
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="text-[10px] text-gray-600">
                    {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <Check className="w-3 h-3 text-gray-600" />
                </div>
                {/* WhatsApp message tail */}
                <div
                  className="absolute bottom-0 right-0 translate-x-[2px]"
                  style={{
                    width: 0,
                    height: 0,
                    borderStyle: 'solid',
                    borderWidth: '0 0 10px 10px',
                    borderColor: 'transparent transparent #dcf8c6 transparent',
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recipients Summary */}
        {selectedContacts.size > 0 && (
          <Card className="mt-4 border-blue-200 bg-blue-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-900">
                  {selectedContacts.size} Recipient{selectedContacts.size !== 1 ? 's' : ''} Selected
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Array.from(selectedContacts).slice(0, 5).map(id => {
                  const contact = contacts.find(c => c.id === id);
                  return contact ? (
                    <Badge key={id} variant="secondary" className="text-xs bg-white">
                      {contact.name.split(' ')[0]}
                    </Badge>
                  ) : null;
                })}
                {selectedContacts.size > 5 && (
                  <Badge variant="secondary" className="text-xs bg-white">
                    +{selectedContacts.size - 5} more
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex gap-4 overflow-hidden p-1">
      {/* Left Panel - Recipients (Collapsible) */}
      <div className={`transition-all duration-300 ${showRecipientsPanel ? 'w-[320px]' : 'w-0'} overflow-hidden`}>
        {showRecipientsPanel && (
          <Card className="h-full flex flex-col bg-white dark:bg-gray-900 border-green-200 dark:border-gray-700 shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-b border-green-100 dark:border-gray-800 py-3 px-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white text-base">
                    <Users className="w-4 h-4 text-green-600" />
                    Recipients
                  </CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400 text-xs mt-0.5">
                    {selectedContacts.size} of {contacts.length} selected
                  </CardDescription>
                </div>
                <Badge className="bg-green-600 text-white px-2 py-0.5 text-xs">
                  {filteredContacts.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-3 p-3 min-h-0">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 border-gray-300 focus-visible:ring-green-500 text-sm"
                />
              </div>

              {/* Select All */}
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  id="select-all"
                  className="border-green-600 data-[state=checked]:bg-green-600 h-4 w-4"
                />
                <label htmlFor="select-all" className="text-xs font-medium cursor-pointer text-gray-900 dark:text-white">
                  Select All ({filteredContacts.length})
                </label>
              </div>

              {/* Contact List */}
              <ScrollArea className="flex-1 -mx-3 px-3">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                  </div>
                ) : filteredContacts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                    <Users className="w-10 h-10 mb-2 opacity-30 text-green-600" />
                    <p className="text-sm">No contacts found</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 pr-2">
                    {filteredContacts.map(contact => (
                      <div
                        key={contact.id}
                        className={`flex items-center gap-2 p-2 rounded-lg transition-all cursor-pointer ${
                          selectedContacts.has(contact.id)
                            ? 'bg-green-50 dark:bg-gray-800 border border-green-300'
                            : 'hover:bg-green-50/50 dark:hover:bg-gray-800/50 border border-transparent'
                        }`}
                        onClick={() => handleSelectContact(contact.id, !selectedContacts.has(contact.id))}
                      >
                        <Checkbox
                          checked={selectedContacts.has(contact.id)}
                          onCheckedChange={(checked) => handleSelectContact(contact.id, checked as boolean)}
                          id={`contact-${contact.id}`}
                          className="border-green-600 data-[state=checked]:bg-green-600 h-4 w-4"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-white text-sm truncate">
                            {contact.name}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                            {contact.company && <span>{contact.company} • </span>}
                            <span className="text-green-600 dark:text-green-400">
                              {contact.whatsapp || contact.phone}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Toggle Recipients Panel Button */}
      <button
        onClick={() => setShowRecipientsPanel(!showRecipientsPanel)}
        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-green-600 hover:bg-green-700 text-white rounded-r-lg p-2 shadow-lg transition-all"
        title={showRecipientsPanel ? 'Hide Recipients' : 'Show Recipients'}
      >
        {showRecipientsPanel ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {/* Center Panel - Compose Message */}
      <Card className="flex-1 flex flex-col bg-white dark:bg-gray-900 border-green-200 dark:border-gray-700 shadow-xl overflow-hidden rounded-2xl">
        <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 px-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <MessageSquare className="w-5 h-5" />
                Compose Bulk Message
              </CardTitle>
              <CardDescription className="text-green-100 text-sm mt-1">
                Create your message and send to {selectedContacts.size} recipient{selectedContacts.size !== 1 ? 's' : ''}
              </CardDescription>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowPreviewPanel(!showPreviewPanel)}
              className="bg-white/20 hover:bg-white/30 border-white/30 text-white"
            >
              <Eye className="w-4 h-4 mr-2" />
              {showPreviewPanel ? 'Hide' : 'Show'} Preview
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-6 gap-4 overflow-y-auto min-h-0">
          {/* Message Type Selection */}
          <div>
            <Label className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-green-600" />
              Message Type
            </Label>
            <Tabs value={messageType} onValueChange={(v) => setMessageType(v as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-green-50 dark:bg-gray-800 h-12">
                <TabsTrigger
                  value="text"
                  className="data-[state=active]:bg-green-600 data-[state=active]:text-white font-medium flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Text
                </TabsTrigger>
                <TabsTrigger
                  value="media"
                  className="data-[state=active]:bg-green-600 data-[state=active]:text-white font-medium flex items-center gap-2"
                >
                  <ImageIcon className="w-4 h-4" />
                  Media
                </TabsTrigger>
                <TabsTrigger
                  value="template"
                  className="data-[state=active]:bg-green-600 data-[state=active]:text-white font-medium flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Template
                </TabsTrigger>
              </TabsList>

              {/* Text Message Tab */}
              <TabsContent value="text" className="mt-4 space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
                    Your Message *
                  </Label>
                  <Textarea
                    placeholder="Type your message here... You can use line breaks and emojis 😊"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={8}
                    className="resize-none border-gray-300 focus-visible:ring-green-500 text-sm"
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-500">
                      {message.length} characters
                    </span>
                    {message.length > 1000 && (
                      <span className="text-xs text-amber-600">
                        Long messages may be split
                      </span>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Media Message Tab */}
              <TabsContent value="media" className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Option 1: URL */}
                  <Card className="border-2 border-dashed border-gray-300 hover:border-green-400 transition-colors">
                    <CardContent className="p-4">
                      <Label className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                        <FileUp className="w-4 h-4 text-green-600" />
                        Media URL
                      </Label>
                      <div className="space-y-2">
                        <Input
                          placeholder="https://example.com/image.jpg"
                          value={mediaUrl}
                          onChange={(e) => setMediaUrl(e.target.value)}
                          className="border-gray-300 focus-visible:ring-green-500 h-10 text-sm"
                        />
                        <input
                          ref={uploadInputRef}
                          type="file"
                          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                          onChange={handleFileUploadToCloudinary}
                          className="hidden"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => uploadInputRef.current?.click()}
                          disabled={uploading}
                          className="w-full border-green-300 text-green-600 hover:bg-green-50 h-10"
                        >
                          {uploading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Upload to Cloud
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Option 2: Local File */}
                  <Card className="border-2 border-dashed border-gray-300 hover:border-green-400 transition-colors">
                    <CardContent className="p-4">
                      <Label className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-green-600" />
                        Local File
                      </Label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-20 border-2 border-dashed border-green-300 text-green-600 hover:bg-green-50 flex flex-col items-center justify-center gap-2"
                      >
                        <Upload className="w-6 h-6" />
                        <span className="text-sm font-medium">Choose File</span>
                        <span className="text-xs text-gray-500">For preview only</span>
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Media Preview */}
                {selectedMedia && (
                  <Card className="border-green-200 bg-green-50/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        {selectedMedia.preview && (
                          <img
                            src={selectedMedia.preview}
                            alt="Preview"
                            className="w-20 h-20 object-cover rounded border-2 border-green-200"
                          />
                        )}
                        {!selectedMedia.preview && (
                          <div className="w-20 h-20 flex items-center justify-center bg-white rounded border-2 border-green-200">
                            {selectedMedia.type === 'document' && <FileText className="w-8 h-8 text-blue-600" />}
                            {selectedMedia.type === 'video' && <Video className="w-8 h-8 text-purple-600" />}
                            {selectedMedia.type === 'audio' && <Music className="w-8 h-8 text-orange-600" />}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                            <span className="font-medium text-sm truncate">{selectedMedia.file.name}</span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            {(selectedMedia.file.size / 1024 / 1024).toFixed(2)} MB • {selectedMedia.type}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleMediaRemove}
                          className="text-gray-500 hover:text-red-600 hover:bg-red-50 h-9 w-9 p-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Caption */}
                <div>
                  <Label className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
                    Caption (Optional)
                  </Label>
                  <Textarea
                    placeholder="Add a caption to your media..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    className="border-gray-300 focus-visible:ring-green-500 text-sm"
                  />
                </div>
              </TabsContent>

              {/* Template Message Tab */}
              <TabsContent value="template" className="mt-4 space-y-4">
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertDescription className="text-xs text-blue-900">
                    <strong>Important:</strong> WhatsApp templates must be pre-approved by Meta Business Manager.
                  </AlertDescription>
                </Alert>

                <div>
                  <Label htmlFor="template-name" className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
                    Template Name *
                  </Label>
                  <Input
                    id="template-name"
                    placeholder="e.g., order_confirmation, welcome_message"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="border-gray-300 focus-visible:ring-green-500 h-10"
                  />
                </div>

                <div>
                  <Label htmlFor="template-language" className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
                    Language Code
                  </Label>
                  <Input
                    id="template-language"
                    placeholder="e.g., en, hi, es"
                    value={templateLanguage}
                    onChange={(e) => setTemplateLanguage(e.target.value)}
                    className="border-gray-300 focus-visible:ring-green-500 h-10"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
                    Template Parameters
                  </Label>
                  <p className="text-xs text-gray-500 mb-3">
                    Add values for variables like {'{'}1{'}'}, {'{'}2{'}'}, etc. in your template
                  </p>
                  <div className="space-y-2">
                    {templateParams.map((param, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder={`Parameter ${index + 1}`}
                          value={param}
                          onChange={(e) => {
                            const newParams = [...templateParams];
                            newParams[index] = e.target.value;
                            setTemplateParams(newParams);
                          }}
                          className="border-gray-300 h-10 flex-1"
                        />
                        {index === templateParams.length - 1 && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setTemplateParams([...templateParams, ''])}
                            className="border-green-300 text-green-600 hover:bg-green-50 h-10 w-10"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        )}
                        {templateParams.length > 1 && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              const newParams = templateParams.filter((_, i) => i !== index);
                              setTemplateParams(newParams.length > 0 ? newParams : ['']);
                            }}
                            className="border-red-300 text-red-600 hover:bg-red-50 h-10 w-10"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Send Button */}
          <div className="sticky bottom-0 bg-white dark:bg-gray-900 pt-4 border-t border-gray-200 dark:border-gray-700 -mx-6 px-6 -mb-6 pb-6">
            <Button
              onClick={sendBulkMessages}
              disabled={sending || selectedContacts.size === 0}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white h-12 shadow-lg text-base font-semibold"
            >
              {sending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Sending to {selectedContacts.size} contact{selectedContacts.size !== 1 ? 's' : ''}...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Send to {selectedContacts.size} Recipient{selectedContacts.size !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Right Panel - Preview (Collapsible) */}
      <div className={`transition-all duration-300 ${showPreviewPanel ? 'w-[340px]' : 'w-0'} overflow-hidden`}>
        {showPreviewPanel && <MessagePreview />}
      </div>

      {/* Results Dialog */}
      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Bulk Send Results
            </DialogTitle>
            <DialogDescription>
              Message delivery status for {results.length} recipient{results.length !== 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4 flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold text-green-900">
                      {results.filter(r => r.success).length}
                    </div>
                    <div className="text-xs text-green-700">Successful</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-4 flex items-center gap-3">
                  <XCircle className="w-8 h-8 text-red-600" />
                  <div>
                    <div className="text-2xl font-bold text-red-900">
                      {results.filter(r => !r.success).length}
                    </div>
                    <div className="text-xs text-red-700">Failed</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Results List */}
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2 pr-4">
                {results.map((result, index) => (
                  <Card key={index} className={`${result.success ? 'border-green-200 bg-green-50/30' : 'border-red-200 bg-red-50/30'}`}>
                    <CardContent className="p-3 flex items-start gap-3">
                      {result.success ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 dark:text-white">
                          {result.name}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {result.phone}
                        </div>
                        {!result.success && result.error && (
                          <div className="text-xs text-red-600 mt-1">
                            Error: {result.error}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            <Button
              onClick={() => setShowResults(false)}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
