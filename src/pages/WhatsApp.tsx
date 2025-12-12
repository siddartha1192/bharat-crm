import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
        setMessages((prev) => [...prev, data.message]);
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
      setMessages(data.messages.reverse()); // Reverse to show oldest first
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
      const newMessages = data.messages.reverse();

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
      const response = await fetch(
        `${API_URL}/whatsapp/search-contacts?query=${encodeURIComponent(contactSearch)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to search contacts');

      const data = await response.json();
      setSearchResults(data.contacts);
    } catch (error) {
      console.error('Error searching contacts:', error);
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

      // Add message to local state
      const tempMessage: Message = {
        id: data.messageId || Date.now().toString(),
        message: newMessage.trim(),
        sender: 'user',
        senderName: 'You',
        status: 'sent',
        createdAt: new Date().toISOString(),
      };

      setMessages([...messages, tempMessage]);
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
    <div className="h-[calc(100vh-4rem)] bg-background p-4">
      <Tabs defaultValue="chat" className="h-full flex flex-col">
        <TabsList className="mb-4">
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Bulk Messaging
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="flex-1 flex gap-4 mt-0">
          {/* Conversations List */}
          <div className="w-96 flex flex-col bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-border bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <MessageCircle className="w-6 h-6 text-green-600" />
                  WhatsApp
                </h2>
                <Button
                  size="sm"
                  onClick={() => setShowNewChatDialog(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  New Chat
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchConversations()}
                  className="pl-10"
                />
              </div>
            </div>

        {/* Conversations */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <MessageCircle className="w-12 h-12 mb-2 opacity-50" />
              <p>No conversations yet</p>
              <p className="text-sm">Start a new chat to begin</p>
            </div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                className={`p-4 mx-2 my-1 cursor-pointer hover:bg-accent/50 transition-all duration-200 rounded-xl ${
                  selectedConversation?.id === conv.id ? 'bg-accent shadow-md' : ''
                }`}
                onClick={() => loadConversation(conv)}
              >
                <div className="flex items-start gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-green-500/10 text-green-600">
                      {getInitials(conv.contactName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold truncate">{conv.contactName}</h3>
                      {conv.lastMessageAt && (
                        <span className="text-xs text-muted-foreground">
                          {formatTime(conv.lastMessageAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground truncate">
                        {conv.lastMessage || 'No messages yet'}
                      </p>
                      {conv.unreadCount > 0 && (
                        <Badge className="ml-2 bg-green-600 text-white">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
          {/* Chat Header */}
          <div className="p-4 border-b border-border flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-green-500/10 text-green-600">
                  {getInitials(selectedConversation.contactName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">{selectedConversation.contactName}</h3>
                <p className="text-sm text-muted-foreground">{selectedConversation.contactPhone}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {aiFeatureAvailable && (
                <Button
                  size="sm"
                  variant={selectedConversation.aiEnabled ? 'default' : 'outline'}
                  onClick={toggleAI}
                  title={selectedConversation.aiEnabled ? 'AI Assistant Enabled - Click to Disable' : 'AI Assistant Disabled - Click to Enable'}
                  className={selectedConversation.aiEnabled ? 'bg-blue-600 hover:bg-blue-700' : ''}
                >
                  {selectedConversation.aiEnabled ? (
                    <>
                      <Bot className="w-4 h-4 mr-2" />
                      AI On
                    </>
                  ) : (
                    <>
                      <BotOff className="w-4 h-4 mr-2" />
                      AI Off
                    </>
                  )}
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => deleteConversation(selectedConversation.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Conversation
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' || msg.sender === 'ai' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl p-3 shadow-md ${
                      msg.sender === 'user'
                        ? 'bg-green-600 text-white rounded-br-md'
                        : msg.isAiGenerated || msg.sender === 'ai'
                        ? 'bg-blue-600 text-white rounded-bl-md'
                        : 'bg-accent text-foreground rounded-bl-md shadow-sm'
                    }`}
                  >
                    {(msg.sender === 'contact' || msg.isAiGenerated || msg.sender === 'ai') && (
                      <p className="text-xs font-semibold mb-1 flex items-center gap-1">
                        {(msg.isAiGenerated || msg.sender === 'ai') && <Bot className="w-3 h-3" />}
                        {msg.senderName}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-xs opacity-70">
                        {format(new Date(msg.createdAt), 'HH:mm')}
                      </span>
                      {(msg.sender === 'user' || msg.sender === 'ai') && (
                        <span className="text-xs">
                          {msg.status === 'read' ? (
                            <CheckCheck className="w-3 h-3" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="p-4 border-t border-border bg-muted/30">
            <div className="flex items-end gap-2">
              <Textarea
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                rows={1}
                className="resize-none rounded-xl shadow-sm"
              />
              <Button
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending}
                className="bg-green-600 hover:bg-green-700"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
          <div>
            <MessageCircle className="w-24 h-24 mx-auto mb-4 opacity-20" />
            <h3 className="text-xl font-semibold mb-2">WhatsApp Web</h3>
            <p>Select a conversation to start messaging</p>
            <Button
              onClick={() => setShowNewChatDialog(true)}
              className="mt-4 bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Start New Chat
            </Button>
          </div>
        </div>
      )}

      {/* New Chat Dialog */}
      <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start New Conversation</DialogTitle>
            <DialogDescription>Search for a contact to start chatting</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <ScrollArea className="h-[300px]">
              {searchingContacts ? (
                <div className="flex items-center justify-center h-20">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-20 text-muted-foreground text-sm">
                  {contactSearch.trim() ? 'No contacts found' : 'Type to search contacts'}
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map(contact => (
                    <Card
                      key={contact.id}
                      className="p-3 cursor-pointer hover:bg-accent transition-all duration-200 hover:shadow-md rounded-xl"
                      onClick={() => startNewConversation(contact)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            <User className="w-4 h-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{contact.name}</p>
                          <p className="text-sm text-muted-foreground">{contact.company}</p>
                          <p className="text-xs text-muted-foreground">
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
        </TabsContent>

        <TabsContent value="bulk" className="flex-1 mt-0">
          <BulkMessaging />
        </TabsContent>
      </Tabs>
    </div>
  );
}
