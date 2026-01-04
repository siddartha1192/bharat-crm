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
  AlertCircle,
  Search,
  Filter,
  Image as ImageIcon,
  FileText,
  Video,
  Music,
  X,
  Plus,
  Paperclip,
  Upload,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  const [filterType, setFilterType] = useState<string>('all');
  const [results, setResults] = useState<BulkMessageResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [messageType, setMessageType] = useState<'text' | 'media' | 'template'>('text');

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
            const endpoint = selectedMedia
              ? `/whatsapp/send-${selectedMedia.type}`
              : `/whatsapp/send-image`; // default to image if URL provided

            const mediaUrlToSend = mediaUrl.trim() || (selectedMedia ? URL.createObjectURL(selectedMedia.file) : '');

            const payload: any = {
              phoneNumber: contact.whatsapp || contact.phone,
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
                phone: contact.whatsapp || contact.phone,
                name: contact.name,
                success: true,
                messageId: data.messageId,
              });
            } else {
              const error = await response.json();
              bulkResults.push({
                phone: contact.whatsapp || contact.phone,
                name: contact.name,
                success: false,
                error: error.error || 'Failed to send',
              });
            }
          } catch (error: any) {
            bulkResults.push({
              phone: contact.whatsapp || contact.phone,
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
            const response = await fetch(`${API_URL}/whatsapp/send-template`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                phoneNumber: contact.whatsapp || contact.phone,
                templateName: templateName.trim(),
                languageCode: templateLanguage,
                components,
              }),
            });

            if (response.ok) {
              const data = await response.json();
              bulkResults.push({
                phone: contact.whatsapp || contact.phone,
                name: contact.name,
                success: true,
                messageId: data.messageId,
              });
            } else {
              const error = await response.json();
              bulkResults.push({
                phone: contact.whatsapp || contact.phone,
                name: contact.name,
                success: false,
                error: error.error || 'Failed to send',
              });
            }
          } catch (error: any) {
            bulkResults.push({
              phone: contact.whatsapp || contact.phone,
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

  return (
    <div className="h-full flex gap-3 overflow-hidden p-1">
      {/* Left Panel - Contact Selection */}
      <Card className="flex-1 flex flex-col bg-white dark:bg-gray-900 border-green-200 dark:border-gray-700 shadow-xl overflow-hidden rounded-2xl">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-b border-green-100 dark:border-gray-800 py-3 px-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white text-base">
                <Users className="w-4 h-4 text-green-600" />
                Select Recipients
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400 text-xs mt-0.5">
                {selectedContacts.size} of {contacts.length} selected
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5">
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
          <div className="flex-1 overflow-y-auto min-h-0">
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
              <div className="space-y-1.5 pr-1">
                {filteredContacts.map(contact => (
                  <div
                    key={contact.id}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-green-50 dark:hover:bg-gray-800 transition-colors border border-transparent hover:border-green-200"
                  >
                    <Checkbox
                      checked={selectedContacts.has(contact.id)}
                      onCheckedChange={(checked) => handleSelectContact(contact.id, checked as boolean)}
                      id={`contact-${contact.id}`}
                      className="border-green-600 data-[state=checked]:bg-green-600 h-4 w-4"
                    />
                    <label
                      htmlFor={`contact-${contact.id}`}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="font-medium text-gray-900 dark:text-white text-sm">{contact.name}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {contact.company && <span className="text-xs">{contact.company} • </span>}
                        <span className="text-green-600 dark:text-green-400">{contact.whatsapp || contact.phone}</span>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Right Panel - Message Composer */}
      <Card className="w-[480px] flex flex-col bg-white dark:bg-gray-900 border-green-200 dark:border-gray-700 shadow-xl overflow-hidden rounded-2xl">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-b border-green-100 dark:border-gray-800 py-3 px-4">
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white text-base">
            <MessageSquare className="w-4 h-4 text-green-600" />
            Compose Message
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400 text-xs mt-0.5">
            Choose type and compose content
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-3 p-3 min-h-0">
          {/* Message Type Tabs */}
          <Tabs value={messageType} onValueChange={(v) => setMessageType(v as any)} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-3 bg-green-50 dark:bg-gray-800 h-9">
              <TabsTrigger value="text" className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-xs">Text</TabsTrigger>
              <TabsTrigger value="media" className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-xs">Media</TabsTrigger>
              <TabsTrigger value="template" className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-xs">Template</TabsTrigger>
            </TabsList>

            {/* Text Message */}
            <TabsContent value="text" className="flex-1 flex flex-col gap-2 mt-3 min-h-0">
              <div className="flex-1 flex flex-col gap-1.5 min-h-0">
                <label className="text-xs font-medium text-gray-900 dark:text-white">Message</label>
                <Textarea
                  placeholder="Type your message here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="flex-1 min-h-0 resize-none border-gray-300 focus-visible:ring-green-500 text-sm"
                />
                <div className="text-xs text-gray-500 text-right">
                  {message.length} characters
                </div>
              </div>
            </TabsContent>

            {/* Media Message */}
            <TabsContent value="media" className="flex-1 flex flex-col gap-2 mt-3 overflow-y-auto min-h-0">
              <div className="space-y-2">
                <div className="space-y-1.5">
                  <Label className="text-gray-900 dark:text-white text-xs">Media URL</Label>
                  <div className="flex gap-1.5">
                    <Input
                      placeholder="https://example.com/image.jpg"
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                      className="flex-1 border-gray-300 focus-visible:ring-green-500 h-9 text-sm"
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
                      className="border-green-300 text-green-600 hover:bg-green-50 h-9 px-3"
                    >
                      {uploading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Public URL or upload file
                  </p>
                </div>

                <div className="space-y-1.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-green-300 text-green-600 hover:bg-green-50 h-9"
                  >
                    <Paperclip className="w-3.5 h-3.5 mr-2" />
                    <span className="text-xs">Choose File (Preview)</span>
                  </Button>
                </div>

                {/* Media Preview */}
                {selectedMedia && (
                  <div className="p-2 bg-green-50 dark:bg-gray-800 rounded-lg border border-green-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      {selectedMedia.preview && (
                        <img
                          src={selectedMedia.preview}
                          alt="Preview"
                          className="w-12 h-12 object-cover rounded border border-green-200"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-gray-900 dark:text-white">
                          {selectedMedia.type === 'image' && <ImageIcon className="w-3.5 h-3.5 text-green-600" />}
                          {selectedMedia.type === 'document' && <FileText className="w-3.5 h-3.5 text-blue-600" />}
                          {selectedMedia.type === 'video' && <Video className="w-3.5 h-3.5 text-purple-600" />}
                          {selectedMedia.type === 'audio' && <Music className="w-3.5 h-3.5 text-orange-600" />}
                          <span className="font-medium text-xs truncate">{selectedMedia.file.name}</span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {(selectedMedia.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleMediaRemove}
                        className="text-gray-500 hover:text-red-600 h-7 w-7 p-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-gray-900 dark:text-white text-xs">Caption (Optional)</Label>
                  <Textarea
                    placeholder="Add a caption..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={2}
                    className="border-gray-300 focus-visible:ring-green-500 text-sm"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Template Message */}
            <TabsContent value="template" className="flex-1 flex flex-col gap-2 mt-3 overflow-y-auto min-h-0">
              <div className="space-y-2">
                <div className="space-y-1.5">
                  <Label htmlFor="template-name" className="text-gray-900 dark:text-white text-xs">Template Name *</Label>
                  <Input
                    id="template-name"
                    placeholder="e.g., order_confirmation"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="border-gray-300 focus-visible:ring-green-500 h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="template-language" className="text-gray-900 dark:text-white text-xs">Language</Label>
                  <Input
                    id="template-language"
                    placeholder="e.g., en, hi, es"
                    value={templateLanguage}
                    onChange={(e) => setTemplateLanguage(e.target.value)}
                    className="border-gray-300 focus-visible:ring-green-500 h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-gray-900 dark:text-white text-xs">Parameters</Label>
                  <p className="text-xs text-gray-500">
                    Values for {'{'}1{'}'}, {'{'}2{'}'}, etc.
                  </p>
                  {templateParams.map((param, index) => (
                    <div key={index} className="flex gap-1.5">
                      <Input
                        placeholder={`Param ${index + 1}`}
                        value={param}
                        onChange={(e) => {
                          const newParams = [...templateParams];
                          newParams[index] = e.target.value;
                          setTemplateParams(newParams);
                        }}
                        className="border-gray-300 h-9 text-sm"
                      />
                      {index === templateParams.length - 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTemplateParams([...templateParams, ''])}
                          className="border-green-300 text-green-600 hover:bg-green-50 h-9 w-9 p-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {templateParams.length > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newParams = templateParams.filter((_, i) => i !== index);
                            setTemplateParams(newParams.length > 0 ? newParams : ['']);
                          }}
                          className="border-red-300 text-red-600 hover:bg-red-50 h-9 w-9 p-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 py-2 px-3">
                  <AlertDescription className="text-xs text-gray-700 dark:text-gray-300">
                    <strong>Note:</strong> Templates must be pre-approved by Meta.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>
          </Tabs>

          <Button
            onClick={sendBulkMessages}
            disabled={sending || selectedContacts.size === 0}
            className="w-full bg-green-600 hover:bg-green-700 text-white h-10 shadow-lg"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span className="text-sm">Sending to {selectedContacts.size}...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                <span className="text-sm">Send to {selectedContacts.size} contact(s)</span>
              </>
            )}
          </Button>

          {/* Results */}
          {showResults && results.length > 0 && (
            <Card className="border-green-200 dark:border-gray-700 rounded-xl shadow-md">
              <CardHeader className="pb-2 bg-green-50 dark:bg-gray-800 py-2 px-3">
                <CardTitle className="text-xs text-gray-900 dark:text-white font-semibold">Send Results</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <div className="max-h-[150px] overflow-y-auto">
                  <div className="space-y-1.5">
                    {results.map((result, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-1.5 rounded border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {result.success ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-gray-900 dark:text-white truncate">{result.name}</div>
                            <div className="text-xs text-gray-500 truncate">
                              {result.phone}
                            </div>
                          </div>
                        </div>
                        {!result.success && result.error && (
                          <Badge variant="destructive" className="text-xs px-1.5 py-0.5 ml-2 flex-shrink-0">
                            Error
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
