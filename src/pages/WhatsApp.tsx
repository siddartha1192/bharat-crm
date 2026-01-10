import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useSocket } from '@/contexts/SocketContext';
import {
  MessageCircle,
  Search,
  Send,
  Plus,
  Loader2,
  Check,
  CheckCheck,
  Phone,
  MoreVertical,
  Trash2,
  User,
  Bot,
  BotOff,
  Users,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Video,
  Music,
  X,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import BulkMessaging from '@/components/whatsapp/BulkMessaging';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface Contact {
  id: string;
  name: string;
  company: string;
  phone: string;
  whatsapp?: string;
}

interface Message {
  id: string;
  message: string;
  sender: string;
  senderName: string;
  status: string;
  createdAt: string;
  isAiGenerated?: boolean;
}

interface Conversation {
  id: string;
  contactName: string;
  contactPhone: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  messages?: Message[];
  aiEnabled: boolean;
}

interface MediaFile {
  file: File;
  type: 'image' | 'document' | 'video' | 'audio';
  preview?: string;
}

export default function WhatsApp() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [searchingContacts, setSearchingContacts] = useState(false);
  const [aiFeatureAvailable, setAiFeatureAvailable] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateLanguage, setTemplateLanguage] = useState('en');
  const [templateParams, setTemplateParams] = useState<string[]>(['']);
  const [sendingTemplate, setSendingTemplate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { socket, isConnected } = useSocket();

  const token = localStorage.getItem('token');

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
    checkAIStatus();
  }, []);

  // 🔌 WebSocket: Listen for real-time WhatsApp updates (replaces polling!)
  useEffect(() => {
    if (!socket) return;

    console.log('🔌 Setting up WhatsApp WebSocket listeners...');

    // Listen for new messages
    socket.on('whatsapp:new_message', (data: { conversationId: string; message: Message }) => {
      console.log('🔌 Received new WhatsApp message:', data);

      // Update messages if this is the current conversation
      if (selectedConversation?.id === data.conversationId) {
        setMessages((prev) => {
          // ✅ Deduplication: Check if message already exists
          const messageExists = prev.some((msg) => msg.id === data.message.id);
          if (messageExists) {
            console.log('⏭️ Message already exists in UI, skipping:', data.message.id);
            return prev; // Don't add duplicate
          }
          console.log('✅ Adding new message to UI:', data.message.id);
          return [...prev, data.message];
        });
      }
    });

    // Listen for conversation updates
    socket.on('whatsapp:conversation_updated', (data: any) => {
      console.log('🔌 Conversation updated:', data);

      // Update conversations list with aiEnabled field from WebSocket
      setConversations((prev) => {
        return prev.map((conv) =>
          conv.id === data.conversationId
            ? {
                ...conv,
                contactName: data.contactName || conv.contactName,
                lastMessage: data.lastMessage,
                lastMessageAt: data.lastMessageAt,
                unreadCount: data.unreadCount,
                aiEnabled: data.aiEnabled !== undefined ? data.aiEnabled : conv.aiEnabled, // Use WebSocket value if provided
              }
            : conv
        );
      });

      // Update selected conversation if it matches
      if (selectedConversation?.id === data.conversationId) {
        setSelectedConversation((prev) =>
          prev
            ? {
                ...prev,
                lastMessage: data.lastMessage,
                lastMessageAt: data.lastMessageAt,
                unreadCount: data.unreadCount,
                aiEnabled: data.aiEnabled !== undefined ? data.aiEnabled : prev.aiEnabled,
              }
            : null
        );
      }
    });

    return () => {
      console.log('🔌 Cleaning up WhatsApp WebSocket listeners...');
      socket.off('whatsapp:new_message');
      socket.off('whatsapp:conversation_updated');
    };
  }, [socket, selectedConversation?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Search contacts when search query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (contactSearch.trim().length >= 2) {
        searchContacts();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [contactSearch]);

  // ✅ Helper function to deduplicate messages
  const deduplicateMessages = (messages: Message[]): Message[] => {
    const seen = new Map<string, boolean>();
    const deduplicated: Message[] = [];

    for (const msg of messages) {
      // Use message ID as primary key, fallback to content-based key
      const key = msg.id || `${msg.sender}:${msg.message}:${msg.createdAt}`;

      if (!seen.has(key)) {
        seen.set(key, true);
        deduplicated.push(msg);
      }
    }

    return deduplicated;
  };

  const fetchConversations = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const response = await fetch(`${API_URL}/whatsapp/conversations?search=${searchQuery}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch conversations');

      const data = await response.json();
      const newConversations = data.conversations;

      // Just update the conversations list - notifications are handled by global context
      setConversations(newConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      if (showLoading) {
        toast({
          title: 'Error',
          description: 'Failed to load conversations',
          variant: 'destructive',
        });
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const loadConversation = async (conversation: Conversation) => {
    try {
      const response = await fetch(`${API_URL}/whatsapp/conversations/${conversation.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to load conversation');

      const data = await response.json();
      setSelectedConversation(data);
      // ✅ Deduplicate and reverse to show oldest first
      const deduplicated = deduplicateMessages(data.messages);
      setMessages(deduplicated.reverse());
    } catch (error) {
      console.error('Error loading conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive',
      });
    }
  };

  const refreshMessages = async () => {
    if (!selectedConversation) return;

    try {
      const response = await fetch(`${API_URL}/whatsapp/conversations/${selectedConversation.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to refresh messages');

      const data = await response.json();
      // ✅ Deduplicate before reversing
      const deduplicated = deduplicateMessages(data.messages);
      const newMessages = deduplicated.reverse();

      // Update messages if there are new ones
      if (newMessages.length > messages.length) {
        setMessages(newMessages);

        // Update conversation in list
        setConversations(prev =>
          prev.map(c =>
            c.id === selectedConversation.id
              ? { ...c, lastMessage: data.lastMessage, lastMessageAt: data.lastMessageAt, unreadCount: 0 }
              : c
          )
        );
      }
    } catch (error) {
      console.error('Error refreshing messages:', error);
      // Silent failure - don't show error toast for polling
    }
  };

  const searchContacts = async () => {
    try {
      setSearchingContacts(true);
      console.log('🔍 Searching contacts with query:', contactSearch);

      const response = await fetch(
        `${API_URL}/whatsapp/search-contacts?query=${encodeURIComponent(contactSearch)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Contact search failed:', response.status, errorData);
        throw new Error(errorData.message || errorData.error || 'Failed to search contacts');
      }

      const data = await response.json();
      console.log('✅ Found contacts:', data.contacts?.length || 0);
      setSearchResults(data.contacts || []);
    } catch (error: any) {
      console.error('Error searching contacts:', error);
      toast({
        title: 'Search Failed',
        description: error.message || 'Could not search contacts. Please try again.',
        variant: 'destructive',
      });
      setSearchResults([]);
    } finally {
      setSearchingContacts(false);
    }
  };

  const startNewConversation = async (contact: Contact) => {
    try {
      const response = await fetch(`${API_URL}/whatsapp/conversations/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          contactPhone: contact.whatsapp || contact.phone,
          contactName: contact.name,
          contactId: contact.id,
        }),
      });

      if (!response.ok) throw new Error('Failed to start conversation');

      const conversation = await response.json();
      setShowNewChatDialog(false);
      setContactSearch('');
      setSearchResults([]);

      // Add to conversations list if not already there
      if (!conversations.find(c => c.id === conversation.id)) {
        setConversations([conversation, ...conversations]);
      }

      setSelectedConversation(conversation);
      setMessages([]);
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to start conversation',
        variant: 'destructive',
      });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;

    try {
      setSending(true);
      const response = await fetch(`${API_URL}/whatsapp/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          phoneNumber: selectedConversation.contactPhone,
          message: newMessage.trim(),
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();

      // ✅ Don't add message manually - WebSocket will broadcast it
      // This prevents duplicate messages (one manual, one from WebSocket)
      setNewMessage('');

      // Update conversation in list
      setConversations(prev =>
        prev.map(c =>
          c.id === selectedConversation.id
            ? { ...c, lastMessage: newMessage.trim(), lastMessageAt: new Date().toISOString() }
            : c
        )
      );

      toast({
        title: 'Message sent',
        description: 'Your message has been delivered',
      });
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  // Media handling functions
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

    // Check file size (16MB for video/audio, 5MB for images, 100MB for documents)
    const maxSize = mediaType === 'document' ? 100 * 1024 * 1024 : mediaType === 'image' ? 5 * 1024 * 1024 : 16 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: `${mediaType === 'document' ? 'Documents' : mediaType === 'image' ? 'Images' : 'Videos/Audio'} must be less than ${maxSize / (1024 * 1024)}MB`,
        variant: 'destructive',
      });
      return;
    }

    // Create preview for images
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

  const sendMedia = async () => {
    if (!selectedMedia || !selectedConversation || uploadingMedia) return;

    try {
      setUploadingMedia(true);

      // Upload media to a hosting service or send directly
      // For now, we'll send the file URL directly (you'll need to host files somewhere)
      const formData = new FormData();
      formData.append('file', selectedMedia.file);

      // Option 1: Upload to your backend first, then get URL
      // Option 2: Use a service like Cloudinary, AWS S3, etc.
      // For now, we'll use a placeholder URL - you need to implement file upload

      // Temporary: Show a message that file hosting is needed
      toast({
        title: 'Media Upload',
        description: 'Uploading media file...',
      });

      // For demonstration, we'll create a temporary local URL
      // In production, you should upload to a file hosting service first
      const tempUrl = URL.createObjectURL(selectedMedia.file);

      const endpoint = {
        image: '/whatsapp/send-image',
        document: '/whatsapp/send-document',
        video: '/whatsapp/send-video',
        audio: '/whatsapp/send-audio',
      }[selectedMedia.type];

      const payload: any = {
        phoneNumber: selectedConversation.contactPhone,
      };

      if (selectedMedia.type === 'image') {
        payload.imageUrl = tempUrl; // Replace with actual hosted URL
        payload.caption = newMessage.trim();
      } else if (selectedMedia.type === 'document') {
        payload.documentUrl = tempUrl; // Replace with actual hosted URL
        payload.filename = selectedMedia.file.name;
        payload.caption = newMessage.trim();
      } else if (selectedMedia.type === 'video') {
        payload.videoUrl = tempUrl; // Replace with actual hosted URL
        payload.caption = newMessage.trim();
      } else if (selectedMedia.type === 'audio') {
        payload.audioUrl = tempUrl; // Replace with actual hosted URL
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to send media');

      const data = await response.json();

      toast({
        title: 'Media sent',
        description: `Your ${selectedMedia.type} has been delivered`,
      });

      // Clear states
      handleMediaRemove();
      setNewMessage('');

      // Refresh messages
      await loadConversation(selectedConversation);
    } catch (error: any) {
      console.error('Error sending media:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send media. Please ensure media is hosted on a public URL.',
        variant: 'destructive',
      });
    } finally {
      setUploadingMedia(false);
    }
  };

  const sendTemplate = async () => {
    if (!templateName.trim() || !selectedConversation || sendingTemplate) return;

    try {
      setSendingTemplate(true);

      // Build components object for template
      const components: any = {};

      // Add body parameters if provided
      if (templateParams.length > 0 && templateParams[0].trim()) {
        components.body = templateParams.filter(p => p.trim()).map(p => ({ text: p }));
      }

      const response = await fetch(`${API_URL}/whatsapp/send-template`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          phoneNumber: selectedConversation.contactPhone,
          templateName: templateName.trim(),
          languageCode: templateLanguage,
          components,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send template');
      }

      toast({
        title: 'Template sent',
        description: 'Your WhatsApp template message has been delivered',
      });

      // Reset template dialog
      setShowTemplateDialog(false);
      setTemplateName('');
      setTemplateParams(['']);

      // Refresh messages
      await loadConversation(selectedConversation);
    } catch (error: any) {
      console.error('Error sending template:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send template message',
        variant: 'destructive',
      });
    } finally {
      setSendingTemplate(false);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    if (!confirm('Are you sure you want to delete this conversation?')) return;

    try {
      const response = await fetch(`${API_URL}/whatsapp/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete conversation');

      setConversations(prev => prev.filter(c => c.id !== conversationId));
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
        setMessages([]);
      }

      toast({
        title: 'Conversation deleted',
        description: 'The conversation has been removed',
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete conversation',
        variant: 'destructive',
      });
    }
  };

  const checkAIStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/whatsapp/ai-status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setAiFeatureAvailable(data.aiFeatureEnabled);
    } catch (error) {
      console.error('Error checking AI status:', error);
    }
  };

  const toggleAI = async () => {
    if (!selectedConversation) return;

    try {
      const response = await fetch(
        `${API_URL}/whatsapp/conversations/${selectedConversation.id}/ai-toggle`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ enabled: !selectedConversation.aiEnabled }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setSelectedConversation(prev =>
          prev ? { ...prev, aiEnabled: data.aiEnabled } : null
        );

        // Update in conversations list too
        setConversations(prev =>
          prev.map(c =>
            c.id === selectedConversation.id ? { ...c, aiEnabled: data.aiEnabled } : c
          )
        );

        toast({
          title: `AI Assistant ${data.aiEnabled ? 'Enabled' : 'Disabled'}`,
          description: data.message,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to toggle AI assistant',
        variant: 'destructive',
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return format(date, 'HH:mm');
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM dd');
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <Tabs defaultValue="chat" className="h-full flex flex-col overflow-hidden">
        <TabsList className="mb-4 bg-white dark:bg-gray-800 shadow-sm flex-shrink-0">
          <TabsTrigger value="chat" className="flex items-center gap-2 data-[state=active]:bg-green-500 data-[state=active]:text-white">
            <MessageCircle className="w-4 h-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2 data-[state=active]:bg-green-500 data-[state=active]:text-white">
            <Users className="w-4 h-4" />
            Bulk Messaging
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="flex-1 flex gap-0 mt-0 overflow-hidden rounded-xl data-[state=inactive]:hidden">
          {/* Conversations List - WhatsApp Style Sidebar */}
          <div className="w-[400px] flex flex-col bg-white dark:bg-gray-900 border-r border-green-200 dark:border-gray-700 shadow-xl rounded-l-xl">
            {/* Header with Search */}
            <div className="flex-shrink-0 p-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-tl-xl">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <MessageCircle className="w-7 h-7" />
                  WhatsApp
                </h2>
                <Button
                  size="sm"
                  onClick={() => setShowNewChatDialog(true)}
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  New
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchConversations()}
                  className="pl-10 bg-white/95 dark:bg-gray-800 border-none focus-visible:ring-white/50 text-gray-900 dark:text-white placeholder:text-gray-500"
                />
              </div>
            </div>

            {/* Conversations List with Fixed Height and Internal Scrolling */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground p-4">
                  <MessageCircle className="w-12 h-12 mb-2 opacity-30 text-green-600" />
                  <p className="font-medium">No conversations yet</p>
                  <p className="text-sm text-center">Click "New" to start chatting</p>
                </div>
              ) : (
                conversations.map(conv => (
                  <div
                    key={conv.id}
                    className={`p-4 cursor-pointer hover:bg-green-50 dark:hover:bg-gray-800 transition-all border-b border-gray-100 dark:border-gray-800 ${
                      selectedConversation?.id === conv.id ? 'bg-green-50 dark:bg-gray-800 border-l-4 border-l-green-600' : ''
                    }`}
                    onClick={() => loadConversation(conv)}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-gradient-to-br from-green-400 to-emerald-500 text-white font-semibold text-base">
                          {getInitials(conv.contactName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold truncate text-gray-900 dark:text-white">{conv.contactName}</h3>
                          {conv.lastMessageAt && (
                            <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                              {formatTime(conv.lastMessageAt)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate flex-1">
                            {conv.lastMessage || 'No messages yet'}
                          </p>
                          {conv.unreadCount > 0 && (
                            <Badge className="bg-green-500 hover:bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">
                              {conv.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Area - WhatsApp Style Main Panel */}
          {selectedConversation ? (
            <div className="flex-1 flex flex-col bg-[#e5ddd5] dark:bg-gray-800 overflow-hidden rounded-r-xl">
              {/* Chat Header */}
              <div className="flex-shrink-0 p-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md flex items-center justify-between rounded-tr-xl">
                <div className="flex items-center gap-3">
                  <Avatar className="h-11 w-11 border-2 border-white/50">
                    <AvatarFallback className="bg-gradient-to-br from-green-400 to-emerald-500 text-white font-semibold">
                      {getInitials(selectedConversation.contactName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg">{selectedConversation.contactName}</h3>
                    <p className="text-sm text-white/80">{selectedConversation.contactPhone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {aiFeatureAvailable && (
                    <Button
                      size="sm"
                      variant={selectedConversation.aiEnabled ? 'secondary' : 'outline'}
                      onClick={toggleAI}
                      title={selectedConversation.aiEnabled ? 'AI Assistant Enabled' : 'AI Assistant Disabled'}
                      className={selectedConversation.aiEnabled ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-white/20 hover:bg-white/30 text-white border-white/30'}
                    >
                      {selectedConversation.aiEnabled ? (
                        <>
                          <Bot className="w-4 h-4 mr-1" />
                          AI
                        </>
                      ) : (
                        <>
                          <BotOff className="w-4 h-4 mr-1" />
                          AI
                        </>
                      )}
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-white hover:bg-white/20">
                        <MoreVertical className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white dark:bg-gray-800">
                      <DropdownMenuItem
                        onClick={() => deleteConversation(selectedConversation.id)}
                        className="text-red-600 dark:text-red-400 focus:text-red-600 focus:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Conversation
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Messages Area with WhatsApp Background Pattern and Fixed Height */}
              <div
                className="flex-1 overflow-y-auto p-4 min-h-0"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d9d9d9' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}
              >
                <div className="max-w-4xl mx-auto space-y-3">
                  {messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === 'user' || msg.sender === 'ai' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-lg p-3 shadow-md relative ${
                          msg.sender === 'user'
                            ? 'bg-[#dcf8c6] dark:bg-green-200 text-gray-900 dark:text-gray-900 rounded-br-none'
                            : msg.isAiGenerated || msg.sender === 'ai'
                            ? 'bg-blue-500 dark:bg-blue-600 text-white rounded-bl-none'
                            : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none'
                        }`}
                      >
                        {/* Sender name for incoming messages */}
                        {(msg.sender === 'contact' || msg.isAiGenerated || msg.sender === 'ai') && (
                          <p className={`text-xs font-semibold mb-1 flex items-center gap-1 ${
                            msg.isAiGenerated || msg.sender === 'ai' ? 'text-white/90' : 'text-green-700 dark:text-green-400'
                          }`}>
                            {(msg.isAiGenerated || msg.sender === 'ai') && <Bot className="w-3 h-3" />}
                            {msg.senderName}
                          </p>
                        )}

                        {/* Message text */}
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>

                        {/* Time and status */}
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className={`text-[10px] ${
                            msg.sender === 'user' ? 'text-gray-600 dark:text-gray-300' :
                            msg.isAiGenerated || msg.sender === 'ai' ? 'text-white/70' :
                            'text-gray-500 dark:text-gray-400'
                          }`}>
                            {format(new Date(msg.createdAt), 'HH:mm')}
                          </span>
                          {(msg.sender === 'user' || msg.sender === 'ai') && (
                            <span className="text-xs text-gray-600 dark:text-gray-300">
                              {msg.status === 'read' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                            </span>
                          )}
                        </div>

                        {/* WhatsApp-style message tail */}
                        <div
                          className={`absolute bottom-0 w-0 h-0 ${
                            msg.sender === 'user' || msg.sender === 'ai'
                              ? 'right-0 translate-x-[2px]'
                              : 'left-0 -translate-x-[2px]'
                          }`}
                          style={{
                            borderStyle: 'solid',
                            borderWidth: msg.sender === 'user' || msg.sender === 'ai' ? '0 0 10px 10px' : '0 10px 10px 0',
                            borderColor: msg.sender === 'user'
                              ? 'transparent transparent #dcf8c6 transparent'
                              : msg.isAiGenerated || msg.sender === 'ai'
                              ? 'transparent transparent rgb(59, 130, 246) transparent'
                              : 'transparent transparent white transparent',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Message Input - Fixed at Bottom */}
              <div className="flex-shrink-0 p-3 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 border-t border-gray-200 dark:border-gray-700">
                {/* Media Preview */}
                {selectedMedia && (
                  <div className="mb-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-3">
                      {selectedMedia.preview && (
                        <img
                          src={selectedMedia.preview}
                          alt="Preview"
                          className="w-16 h-16 object-cover rounded border border-gray-200"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                          {selectedMedia.type === 'image' && <ImageIcon className="w-4 h-4 text-green-600" />}
                          {selectedMedia.type === 'document' && <FileText className="w-4 h-4 text-blue-600" />}
                          {selectedMedia.type === 'video' && <Video className="w-4 h-4 text-purple-600" />}
                          {selectedMedia.type === 'audio' && <Music className="w-4 h-4 text-orange-600" />}
                          <span className="truncate">{selectedMedia.file.name}</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {(selectedMedia.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleMediaRemove}
                        className="text-gray-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex items-end gap-2">
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {/* Media attachment button */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-gray-600 hover:text-green-600 hover:bg-green-50"
                      >
                        <Paperclip className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="top" className="bg-white dark:bg-gray-800">
                      <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="cursor-pointer">
                        <ImageIcon className="w-4 h-4 mr-2 text-green-600" />
                        Image
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="cursor-pointer">
                        <FileText className="w-4 h-4 mr-2 text-blue-600" />
                        Document
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="cursor-pointer">
                        <Video className="w-4 h-4 mr-2 text-purple-600" />
                        Video
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="cursor-pointer">
                        <Music className="w-4 h-4 mr-2 text-orange-600" />
                        Audio
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Template message button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-gray-600 hover:text-green-600 hover:bg-green-50"
                    onClick={() => setShowTemplateDialog(true)}
                    title="Send WhatsApp Template"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </Button>

                  {/* Message input */}
                  <div className="flex-1 bg-white dark:bg-gray-800 rounded-full border border-gray-300 dark:border-gray-600 shadow-sm overflow-hidden">
                    <Textarea
                      placeholder={selectedMedia ? "Add a caption..." : "Type a message..."}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (selectedMedia) {
                            sendMedia();
                          } else {
                            sendMessage();
                          }
                        }
                      }}
                      rows={1}
                      className="resize-none border-none focus-visible:ring-0 px-4 py-2.5 bg-transparent text-gray-900 dark:text-white placeholder:text-gray-500"
                    />
                  </div>

                  {/* Send button */}
                  <Button
                    onClick={selectedMedia ? sendMedia : sendMessage}
                    disabled={selectedMedia ? uploadingMedia : (!newMessage.trim() || sending)}
                    size="icon"
                    className="bg-green-500 hover:bg-green-600 text-white rounded-full h-11 w-11 shadow-lg"
                  >
                    {(sending || uploadingMedia) ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-900 rounded-r-xl">
              <div className="p-8">
                <MessageCircle className="w-32 h-32 mx-auto mb-6 text-green-200 dark:text-green-800" />
                <h3 className="text-3xl font-bold mb-3 text-gray-900 dark:text-white">WhatsApp Web</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">Select a conversation to start messaging</p>
                <Button
                  onClick={() => setShowNewChatDialog(true)}
                  className="bg-green-500 hover:bg-green-600 text-white shadow-lg px-6 py-3 rounded-full"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Start New Chat
                </Button>
              </div>
            </div>
          )}

          {/* New Chat Dialog */}
          <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Start New Conversation</DialogTitle>
                <DialogDescription>Search for a contact to start chatting on WhatsApp</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    placeholder="Search contacts..."
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    className="pl-10 border-gray-300 focus-visible:ring-green-500"
                  />
                </div>

                <ScrollArea className="h-[350px] rounded-md border border-gray-200 dark:border-gray-700">
                  {searchingContacts ? (
                    <div className="flex items-center justify-center h-20">
                      <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-20 text-gray-500 text-sm">
                      {contactSearch.trim() ? 'No contacts found' : 'Type to search contacts'}
                    </div>
                  ) : (
                    <div className="p-2 space-y-2">
                      {searchResults.map(contact => (
                        <Card
                          key={contact.id}
                          className="p-3 cursor-pointer hover:bg-green-50 dark:hover:bg-gray-800 transition-all border border-gray-200 dark:border-gray-700 hover:border-green-300 hover:shadow-md"
                          onClick={() => startNewConversation(contact)}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarFallback className="bg-gradient-to-br from-green-400 to-emerald-500 text-white font-semibold">
                                {getInitials(contact.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 dark:text-white">{contact.name}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{contact.company}</p>
                              <p className="text-xs text-green-600 dark:text-green-400">
                                {contact.whatsapp || contact.phone}
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </DialogContent>
          </Dialog>

          {/* Template Message Dialog */}
          <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Send WhatsApp Template</DialogTitle>
                <DialogDescription>
                  Send a pre-approved WhatsApp template message
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="template-name">Template Name *</Label>
                  <Input
                    id="template-name"
                    placeholder="e.g., order_confirmation, welcome_message"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="border-gray-300 focus-visible:ring-green-500"
                  />
                  <p className="text-xs text-gray-500">
                    Enter the name of your pre-approved template from Meta Business Manager
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-language">Language</Label>
                  <Input
                    id="template-language"
                    placeholder="e.g., en, en_US, hi, es"
                    value={templateLanguage}
                    onChange={(e) => setTemplateLanguage(e.target.value)}
                    className="border-gray-300 focus-visible:ring-green-500"
                  />
                  <p className="text-xs text-gray-500">
                    Language code for your template (default: en)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Template Parameters (Optional)</Label>
                  <p className="text-xs text-gray-500 mb-2">
                    Add values for template variables like {'{'}1{'}'}, {'{'}2{'}'}, etc.
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
                        className="border-gray-300"
                      />
                      {index === templateParams.length - 1 && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setTemplateParams([...templateParams, ''])}
                          className="border-green-300 text-green-600 hover:bg-green-50"
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
                          className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <AlertDescription className="text-xs text-gray-700 dark:text-gray-300">
                    <strong>Note:</strong> Templates must be pre-approved by Meta Business Manager before sending.
                    Make sure your template name and parameters match your approved template exactly.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowTemplateDialog(false);
                      setTemplateName('');
                      setTemplateParams(['']);
                    }}
                    className="border-gray-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={sendTemplate}
                    disabled={!templateName.trim() || sendingTemplate}
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    {sendingTemplate ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Template
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="bulk" className="flex-1 mt-0 overflow-hidden data-[state=inactive]:hidden">
          <BulkMessaging />
        </TabsContent>
      </Tabs>
    </div>
  );
}
