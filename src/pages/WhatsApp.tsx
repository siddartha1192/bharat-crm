import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  MessageCircle,
  Send,
  Phone,
  Search,
  MoreVertical,
  Paperclip,
  Smile,
  CheckCheck,
} from 'lucide-react';

// Mock WhatsApp conversations
const mockConversations = [
  {
    id: '1',
    name: 'Rajesh Kumar',
    company: 'Tech Innovations',
    lastMessage: 'Thanks for the demo! Looking forward to the proposal.',
    timestamp: '2 min ago',
    unread: 2,
    status: 'active',
  },
  {
    id: '2',
    name: 'Sunita Reddy',
    company: 'Hyderabad Exports',
    lastMessage: 'Can we schedule a call tomorrow?',
    timestamp: '15 min ago',
    unread: 1,
    status: 'active',
  },
  {
    id: '3',
    name: 'Amit Patel',
    company: 'Mumbai Traders',
    lastMessage: 'What are the pricing options?',
    timestamp: '1 hour ago',
    unread: 0,
    status: 'responded',
  },
  {
    id: '4',
    name: 'Vikram Singh',
    company: 'Delhi Retail',
    lastMessage: 'Got it, thanks!',
    timestamp: '3 hours ago',
    unread: 0,
    status: 'responded',
  },
];

const mockMessages = [
  {
    id: '1',
    sender: 'customer',
    message: 'Hi, I saw your CRM solution online. Can you tell me more about the GST features?',
    timestamp: '10:30 AM',
    status: 'read',
  },
  {
    id: '2',
    sender: 'me',
    message: 'Hello! Thanks for reaching out. Our CRM includes full GST-compliant invoicing with automatic tax calculations.',
    timestamp: '10:32 AM',
    status: 'read',
  },
  {
    id: '3',
    sender: 'customer',
    message: 'That sounds great! Can you send me a demo video?',
    timestamp: '10:35 AM',
    status: 'read',
  },
  {
    id: '4',
    sender: 'me',
    message: 'Absolutely! I\'ll send you a personalized demo video. Would you also like to schedule a live demo call?',
    timestamp: '10:37 AM',
    status: 'read',
  },
  {
    id: '5',
    sender: 'customer',
    message: 'Thanks for the demo! Looking forward to the proposal.',
    timestamp: '11:20 AM',
    status: 'read',
  },
];

export default function WhatsApp() {
  const [selectedChat, setSelectedChat] = useState(mockConversations[0]);
  const [message, setMessage] = useState('');

  return (
    <div className="min-h-screen relative">
      {/* Tricolor Background */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="h-1/3 bg-gradient-to-b from-primary to-primary/50" />
        <div className="h-1/3 bg-gradient-to-b from-background/80 to-background" />
        <div className="h-1/3 bg-gradient-to-t from-success to-success/50" />
      </div>

      <div className="relative p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="relative">
          <div className="absolute -left-6 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-background to-success rounded-r" />
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                WhatsApp Business Integration
              </h1>
              <p className="text-muted-foreground">
                Manage WhatsApp conversations with leads and customers
              </p>
            </div>
            <div className="flex gap-2">
              <Badge className="bg-green-500/10 text-green-600 border-green-500/20 border">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                Connected
              </Badge>
            </div>
          </div>
        </div>

        {/* WhatsApp Chat Interface */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Conversations List */}
          <Card className="p-4 lg:col-span-1">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {mockConversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => setSelectedChat(conv)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedChat.id === conv.id
                      ? 'bg-primary/10 border border-primary/20'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-green-500 text-white">
                        {conv.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-sm text-foreground truncate">
                          {conv.name}
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          {conv.timestamp}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{conv.company}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground truncate flex-1">
                          {conv.lastMessage}
                        </p>
                        {conv.unread > 0 && (
                          <Badge className="bg-green-500 text-white ml-2">
                            {conv.unread}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Chat Window */}
          <Card className="lg:col-span-2 flex flex-col h-[700px]">
            {/* Chat Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-green-500 text-white">
                    {selectedChat.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-foreground">{selectedChat.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedChat.company}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost">
                  <Phone className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-muted/20">
              {mockMessages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      msg.sender === 'me'
                        ? 'bg-green-500 text-white'
                        : 'bg-card border border-border'
                    }`}
                  >
                    <p className="text-sm mb-1">{msg.message}</p>
                    <div className="flex items-center justify-end gap-1">
                      <span
                        className={`text-xs ${
                          msg.sender === 'me' ? 'text-white/70' : 'text-muted-foreground'
                        }`}
                      >
                        {msg.timestamp}
                      </span>
                      {msg.sender === 'me' && (
                        <CheckCheck className="w-3 h-3 text-white/70" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-border">
              <div className="flex items-end gap-2">
                <Button size="sm" variant="ghost">
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost">
                  <Smile className="w-4 h-4" />
                </Button>
                <Textarea
                  placeholder="Type a message..."
                  className="flex-1 min-h-[60px] max-h-[120px] resize-none"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <Button size="sm" className="bg-green-500 hover:bg-green-600">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                WhatsApp Business API Integration
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Connect your WhatsApp Business account to manage all customer conversations in one place.
                Send automated messages, create templates, and track conversation metrics.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Send/Receive Messages</Badge>
                <Badge variant="outline">Message Templates</Badge>
                <Badge variant="outline">Automated Responses</Badge>
                <Badge variant="outline">Lead Capture</Badge>
                <Badge variant="outline">Conversation Analytics</Badge>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
