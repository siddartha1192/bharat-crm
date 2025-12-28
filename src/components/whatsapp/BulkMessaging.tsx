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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    <div className="h-full flex gap-4">
      {/* Left Panel - Contact Selection */}
      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Select Recipients
              </CardTitle>
              <CardDescription>
                {selectedContacts.size} of {contacts.length} contacts selected
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-sm">
              {filteredContacts.length} contacts
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4">
          {/* Search and Filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Contacts</SelectItem>
                <SelectItem value="recent">Recent</SelectItem>
                <SelectItem value="favorites">Favorites</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Select All */}
          <div className="flex items-center gap-2 pb-2 border-b">
            <Checkbox
              checked={allSelected}
              onCheckedChange={handleSelectAll}
              id="select-all"
            />
            <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
              Select All ({filteredContacts.length})
            </label>
          </div>

          {/* Contact List */}
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <Users className="w-12 h-12 mb-2 opacity-50" />
                <p>No contacts found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredContacts.map(contact => (
                  <div
                    key={contact.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedContacts.has(contact.id)}
                      onCheckedChange={(checked) => handleSelectContact(contact.id, checked as boolean)}
                      id={`contact-${contact.id}`}
                    />
                    <label
                      htmlFor={`contact-${contact.id}`}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="font-medium">{contact.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {contact.company && <span>{contact.company} • </span>}
                        <span>{contact.whatsapp || contact.phone}</span>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Right Panel - Message Composer */}
      <Card className="w-[550px] flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Compose Message
          </CardTitle>
          <CardDescription>
            Choose message type and compose your content
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4">
          {/* Message Type Tabs */}
          <Tabs value={messageType} onValueChange={(v) => setMessageType(v as any)} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="text">Text</TabsTrigger>
              <TabsTrigger value="media">Media</TabsTrigger>
              <TabsTrigger value="template">Template</TabsTrigger>
            </TabsList>

            {/* Text Message */}
            <TabsContent value="text" className="flex-1 flex flex-col gap-4">
              <div className="flex-1 flex flex-col gap-2">
                <label className="text-sm font-medium">Message</label>
                <Textarea
                  placeholder="Type your message here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="flex-1 min-h-[200px] resize-none"
                />
                <div className="text-xs text-muted-foreground text-right">
                  {message.length} characters
                </div>
              </div>
            </TabsContent>

            {/* Media Message */}
            <TabsContent value="media" className="flex-1 flex flex-col gap-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Media URL (Public URL)</Label>
                  <Input
                    placeholder="https://example.com/image.jpg"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter a public URL to your hosted media file
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or upload file (local testing)
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
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
                    className="w-full"
                  >
                    <Paperclip className="w-4 h-4 mr-2" />
                    Choose File
                  </Button>
                </div>

                {/* Media Preview */}
                {selectedMedia && (
                  <div className="p-3 bg-accent rounded-lg border">
                    <div className="flex items-center gap-3">
                      {selectedMedia.preview && (
                        <img
                          src={selectedMedia.preview}
                          alt="Preview"
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {selectedMedia.type === 'image' && <ImageIcon className="w-4 h-4" />}
                          {selectedMedia.type === 'document' && <FileText className="w-4 h-4" />}
                          {selectedMedia.type === 'video' && <Video className="w-4 h-4" />}
                          {selectedMedia.type === 'audio' && <Music className="w-4 h-4" />}
                          <span className="font-medium">{selectedMedia.file.name}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {(selectedMedia.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleMediaRemove}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Caption (Optional)</Label>
                  <Textarea
                    placeholder="Add a caption for your media..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                  />
                </div>

                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription className="text-xs">
                    For production use, upload media to a file hosting service (Cloudinary, AWS S3, etc.) and use the public URL.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>

            {/* Template Message */}
            <TabsContent value="template" className="flex-1 flex flex-col gap-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="template-name">Template Name *</Label>
                  <Input
                    id="template-name"
                    placeholder="e.g., order_confirmation"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-language">Language</Label>
                  <Input
                    id="template-language"
                    placeholder="e.g., en, hi, es"
                    value={templateLanguage}
                    onChange={(e) => setTemplateLanguage(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Template Parameters (Optional)</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Add values for {'{'}1{'}'}, {'{'}2{'}'}, etc.
                  </p>
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
                      />
                      {index === templateParams.length - 1 && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setTemplateParams([...templateParams, ''])}
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
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <Alert>
                  <AlertDescription className="text-xs">
                    <strong>Note:</strong> Templates must be pre-approved by Meta Business Manager.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>
          </Tabs>

          <Button
            onClick={sendBulkMessages}
            disabled={sending || selectedContacts.size === 0}
            className="w-full"
            size="lg"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending to {selectedContacts.size} contact(s)...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send to {selectedContacts.size} contact(s)
              </>
            )}
          </Button>

          {/* Results */}
          {showResults && results.length > 0 && (
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Send Results</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {results.map((result, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 rounded border"
                      >
                        <div className="flex items-center gap-2">
                          {result.success ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                          <div>
                            <div className="text-sm font-medium">{result.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {result.phone}
                            </div>
                          </div>
                        </div>
                        {!result.success && result.error && (
                          <Badge variant="destructive" className="text-xs">
                            {result.error}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
