import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Send, Bot, User, Loader2, Database, BookOpen, TrendingUp } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  data?: any;
  sources?: any[];
  stats?: any;
  timestamp: Date;
}

interface AIStatus {
  portal: {
    enabled: boolean;
    model: string;
    temperature: number;
  };
  vectorDatabase: {
    name: string;
    pointsCount: number;
    vectorSize: number;
    distance: string;
  } | null;
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAIStatus();
    // Add welcome message
    setMessages([
      {
        role: 'assistant',
        content: `👋 Hello! I'm your enterprise AI assistant with **full database access**.

I can query your CRM data in real-time and provide insights:

**🔍 Query Data:**
- "Show me top 5 leads from last week"
- "List all high priority pending tasks"
- "Find contacts added this month"

**📊 Get Analytics:**
- "What's our conversion rate this month?"
- "Show me total pipeline value"
- "How many deals are in negotiation?"

**💼 Search Deals & Invoices:**
- "Show deals worth over $10,000"
- "List all paid invoices from this quarter"

**📅 Check Calendar:**
- "What meetings do I have today?"
- "Show upcoming events this week"

Try the quick action buttons below or ask me anything!`,
        timestamp: new Date(),
      },
    ]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchAIStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_URL}/ai/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setAiStatus(data);
    } catch (error) {
      console.error('Error fetching AI status:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const token = localStorage.getItem('token');
    if (!token) {
      toast({
        title: 'Authentication Error',
        description: 'Please log in to use the AI assistant',
        variant: 'destructive',
      });
      return;
    }

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: input,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        data: data.data,
        sources: data.sources,
        stats: data.stats,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to get AI response. Please try again.',
        variant: 'destructive',
      });

      // Add error message
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your request. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickActions = [
    { label: 'Show top leads', query: 'Show me the top 5 leads from last week sorted by value' },
    { label: 'Conversion rate', query: 'What is our lead to deal conversion rate this month?' },
    { label: 'Pipeline value', query: 'What is our total pipeline value right now?' },
    { label: 'Recent contacts', query: 'Show me the 10 most recent contacts added to the system' },
    { label: 'Won deals', query: 'Show me all deals that were won this month with their values' },
    { label: 'Pending tasks', query: 'List all high priority tasks that are pending' },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">AI Assistant</h1>
            <p className="text-muted-foreground mt-1">
              Ask anything about your CRM data, features, or documentation
            </p>
          </div>
          {aiStatus && (
            <div className="flex gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Bot className="w-3 h-3" />
                {aiStatus.portal.model}
              </Badge>
              {aiStatus.vectorDatabase && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  {aiStatus.vectorDatabase.pointsCount} docs
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chat Container */}
      <Card className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : ''}`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}

              <div
                className={`flex-1 max-w-[80%] ${
                  message.role === 'user' ? 'text-right' : ''
                }`}
              >
                <div
                  className={`inline-block rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-muted'
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content}
                  </div>
                </div>

                {/* Show data if available */}
                {message.data && Array.isArray(message.data) && message.data.length > 0 && (
                  <div className="mt-3 space-y-3">
                    {message.data.map((funcCall: any, idx: number) => {
                      const result = funcCall.result;
                      const functionName = funcCall.function;

                      // Skip if error
                      if (result.error) return null;

                      // Determine what to display based on result structure
                      let itemsToShow = [];
                      let totalCount = 0;
                      let displayData: any = null;

                      if (result.leads) {
                        itemsToShow = result.leads;
                        totalCount = result.count || result.leads.length;
                      } else if (result.contacts) {
                        itemsToShow = result.contacts;
                        totalCount = result.count || result.contacts.length;
                      } else if (result.deals) {
                        itemsToShow = result.deals;
                        totalCount = result.count || result.deals.length;
                      } else if (result.tasks) {
                        itemsToShow = result.tasks;
                        totalCount = result.count || result.tasks.length;
                      } else if (result.invoices) {
                        itemsToShow = result.invoices;
                        totalCount = result.count || result.invoices.length;
                      } else if (result.events) {
                        itemsToShow = result.events;
                        totalCount = result.count || result.events.length;
                      } else if (result.data) {
                        // Analytics result
                        displayData = result.data;
                      }

                      return (
                        <div key={idx} className="p-3 bg-accent rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Database className="w-4 h-4" />
                            <span className="text-sm font-medium">
                              {functionName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                              {totalCount > 0 && ` (${totalCount} items)`}
                            </span>
                          </div>

                          {itemsToShow.length > 0 && (
                            <>
                              <pre className="text-xs overflow-x-auto">
                                {JSON.stringify(itemsToShow.slice(0, 3), null, 2)}
                              </pre>
                              {itemsToShow.length > 3 && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  ... and {itemsToShow.length - 3} more
                                </p>
                              )}
                            </>
                          )}

                          {displayData && (
                            <div className="text-sm space-y-1">
                              {Object.entries(displayData).map(([key, value]) => (
                                <div key={key} className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    {key.replace(/([A-Z])/g, ' $1').trim()}:
                                  </span>
                                  <strong>{typeof value === 'number' ? value.toLocaleString() : String(value)}</strong>
                                </div>
                              ))}
                            </div>
                          )}

                          {result.totalValue !== undefined && (
                            <div className="text-xs text-muted-foreground mt-2">
                              Total Value: <strong>₹{result.totalValue.toLocaleString()}</strong>
                            </div>
                          )}
                          {result.totalAmount !== undefined && (
                            <div className="text-xs text-muted-foreground mt-2">
                              Total Amount: <strong>₹{result.totalAmount.toLocaleString()}</strong>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Show sources if available */}
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <BookOpen className="w-4 h-4 text-muted-foreground" />
                    {message.sources.map((source, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {source.filename || `Source ${i + 1}`}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Show stats if available */}
                {message.stats && (
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <TrendingUp className="w-4 h-4" />
                    {Object.entries(message.stats).map(([key, value]) => (
                      <span key={key}>
                        {key}: <strong>{value as any}</strong>
                      </span>
                    ))}
                  </div>
                )}

                <div className="text-xs text-muted-foreground mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="inline-block rounded-lg px-4 py-3 bg-muted">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {messages.length === 1 && !loading && (
          <div className="px-6 py-3 border-t">
            <p className="text-sm text-muted-foreground mb-2">Quick actions:</p>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setInput(action.query);
                  }}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-6 border-t">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask anything about your CRM data, features, or documentation..."
              className="min-h-[60px] resize-none"
              disabled={loading}
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              size="lg"
              className="px-6"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </Card>
    </div>
  );
}
