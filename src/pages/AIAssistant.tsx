import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Send, Bot, User, Loader2, Database, BookOpen, TrendingUp, Zap, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

// Interesting facts and quotes to show while AI is thinking
const AI_THINKING_MESSAGES = [
  "💡 Did you know? CRM systems can increase sales by up to 29% and productivity by 34%",
  "🤖 AI can analyze thousands of customer interactions to predict buying patterns",
  "📊 Companies using CRM see an average ROI of $8.71 for every dollar spent",
  "🎯 80% of sales require 5 follow-ups, but 44% of salespeople give up after one",
  "⚡ AI-powered CRMs can automate up to 30% of sales activities",
  "🔮 Predictive analytics in CRM can forecast sales outcomes with 85% accuracy",
  "💼 65% of sales reps using mobile CRM hit their sales quotas",
  "🚀 Personalized emails deliver 6x higher transaction rates",
  "🧠 AI can process customer sentiment from emails, chats, and calls in real-time",
  "📈 CRM automation can reduce data entry time by up to 74%",
  "🎨 AI assistants like me can answer customer queries 24/7 without getting tired!",
  "⏱️ The average sales rep spends only 34% of their time actually selling",
  "🤝 CRM helps maintain relationships with thousands of customers simultaneously",
  "💬 AI chatbots can handle 80% of routine customer service questions",
  "🔍 Vector databases help me remember everything about your products instantly",
];

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [currentThinkingMessage, setCurrentThinkingMessage] = useState(0);
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  const [aiMode, setAiMode] = useState<'full' | 'minimal'>(() => {
    // Load preference from localStorage
    const saved = localStorage.getItem('aiMode');
    return (saved === 'minimal' ? 'minimal' : 'full') as 'full' | 'minimal';
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAIStatus();
    loadConversationHistory();
  }, []);

  const loadConversationHistory = async () => {
    try {
      console.log('🔄 Loading conversation history...');
      setLoadingHistory(true);

      const token = localStorage.getItem('token');
      if (!token) {
        console.log('⚠️ No token found, skipping history load');
        setLoadingHistory(false);
        showWelcomeMessage();
        return;
      }

      const response = await fetch(`${API_URL}/ai/conversation`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error('❌ Failed to load conversation:', response.status, response.statusText);
        throw new Error('Failed to load conversation history');
      }

      const data = await response.json();
      console.log('📦 Received conversation data:', data);

      // If there are existing messages, load them
      if (data.conversation && data.conversation.messages && data.conversation.messages.length > 0) {
        const loadedMessages = data.conversation.messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          data: msg.data,
        }));

        setMessages(loadedMessages);
        console.log(`✅ Loaded ${loadedMessages.length} messages from conversation history`);
      } else {
        console.log('ℹ️ No conversation history found, showing welcome message');
        // No conversation history, show welcome message
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
      }
    } catch (error) {
      console.error('❌ Error loading conversation history:', error);
      showWelcomeMessage();

      // Show error toast
      toast({
        title: 'Could not load conversation history',
        description: 'Starting a fresh conversation. Your previous messages are still saved.',
        variant: 'default',
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  const showWelcomeMessage = () => {
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
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Rotate thinking messages while AI is processing
  useEffect(() => {
    if (!loading) return;

    // Pick a random starting message
    setCurrentThinkingMessage(Math.floor(Math.random() * AI_THINKING_MESSAGES.length));

    const interval = setInterval(() => {
      setCurrentThinkingMessage((prev) => (prev + 1) % AI_THINKING_MESSAGES.length);
    }, 3000); // Change message every 3 seconds

    return () => clearInterval(interval);
  }, [loading]);

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
          aiMode: aiMode, // Pass the AI mode to backend
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

  const handleAiModeChange = (checked: boolean) => {
    const newMode = checked ? 'full' : 'minimal';
    setAiMode(newMode);
    localStorage.setItem('aiMode', newMode);

    toast({
      title: `AI Mode: ${checked ? 'Full' : 'Minimal'}`,
      description: checked
        ? 'Using full AI capabilities - all tools enabled (more credits)'
        : 'Using minimal AI mode - database queries enabled, web search disabled (fewer credits)',
      variant: 'default',
    });
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
    <div className="flex flex-col h-[calc(100vh-8rem)] p-4">
      {/* Header */}
      <div className="mb-6 px-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">AI Assistant</h1>
            <p className="text-muted-foreground mt-1">
              Ask anything about your CRM data, features, or documentation
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* AI Quality Toggle */}
            <div className="flex items-center gap-3 px-4 py-2 rounded-lg border bg-card shadow-sm">
              <div className="flex items-center gap-2">
                <Sparkles className={`w-4 h-4 ${aiMode === 'minimal' ? 'text-muted-foreground' : 'text-yellow-600'}`} />
                <Label htmlFor="ai-mode" className="text-sm font-medium cursor-pointer">
                  {aiMode === 'full' ? 'Full AI' : 'Minimal AI'}
                </Label>
              </div>
              <Switch
                id="ai-mode"
                checked={aiMode === 'full'}
                onCheckedChange={handleAiModeChange}
              />
              <Zap className={`w-4 h-4 ${aiMode === 'full' ? 'text-blue-600' : 'text-muted-foreground'}`} />
            </div>

            {/* AI Status Badges */}
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
      </div>

      {/* Chat Container */}
      <Card className="flex-1 flex flex-col rounded-2xl shadow-xl border-border overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-background to-muted/10">
          {loadingHistory && messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                <p className="text-sm text-muted-foreground">Loading conversation history...</p>
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : ''}`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}

              <div
                className={`flex-1 max-w-[80%] ${
                  message.role === 'user' ? 'text-right' : ''
                }`}
              >
                <div
                  className={`inline-block rounded-2xl px-4 py-3 shadow-md ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-br-md'
                      : 'bg-muted rounded-bl-md'
                  }`}
                >
                  {message.role === 'user' ? (
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {message.content}
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-pre:bg-muted-foreground/10 prose-pre:text-foreground">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>

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
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-md">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="inline-block rounded-2xl rounded-bl-md px-5 py-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 shadow-md max-w-[85%]">
                  <div className="flex items-start gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Thinking...
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed animate-fade-in">
                        {AI_THINKING_MESSAGES[currentThinkingMessage]}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {messages.length === 1 && !loading && (
          <div className="px-6 py-3 border-t bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <p className="text-sm text-muted-foreground mb-2">Quick actions:</p>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
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
        <div className="p-6 border-t bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask anything about your CRM data, features, or documentation..."
              className="min-h-[60px] resize-none rounded-xl shadow-sm"
              disabled={loading}
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              size="lg"
              className="px-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
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
