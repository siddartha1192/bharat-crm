import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Minimize2, Sparkles, User, Mail, Phone, Building } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface DemoFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  message: string;
}

export function FloatingChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! I'm the Neuragg CRM AI Assistant. I'm here to help you learn about our product. How can I assist you today?",
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDemoForm, setShowDemoForm] = useState(false);
  const [demoFormData, setDemoFormData] = useState<DemoFormData>({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
  });
  const [isSubmittingDemo, setIsSubmittingDemo] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, showDemoForm]);

  useEffect(() => {
    if (isOpen && !isMinimized && !showDemoForm && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized, showDemoForm]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/public/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputValue,
          conversationHistory: messages.map((m) => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.text,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.message,
        sender: 'bot',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);

      // If AI detected a demo request, show the form after a brief delay
      if (data.isDemoRequest) {
        setTimeout(() => {
          setShowDemoForm(true);
          const formPromptMessage: Message = {
            id: (Date.now() + 2).toString(),
            text: "Great! I'd love to help you schedule a demo. Please fill out the form below with your details, and our team will reach out to you within 24 hours.",
            sender: 'bot',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, formPromptMessage]);
        }, 800);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I apologize, but I'm having trouble connecting right now. Please try again in a moment or contact us directly at support@neuragg.com",
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitDemoRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!demoFormData.name || !demoFormData.email || !demoFormData.phone) {
      return;
    }

    setIsSubmittingDemo(true);

    try {
      const response = await fetch('/api/public/chat/demo-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(demoFormData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit demo request');
      }

      const data = await response.json();

      // Hide form
      setShowDemoForm(false);

      // Add success message
      const successMessage: Message = {
        id: (Date.now() + 3).toString(),
        text: `✅ ${data.message}\n\nYour contact details have been saved:\n• Name: ${demoFormData.name}\n• Email: ${demoFormData.email}\n• Phone: ${demoFormData.phone}\n\nIs there anything else I can help you with?`,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, successMessage]);

      // Reset form
      setDemoFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        message: '',
      });
    } catch (error) {
      console.error('Error submitting demo request:', error);
      const errorMessage: Message = {
        id: (Date.now() + 3).toString(),
        text: "I'm sorry, there was an error submitting your demo request. Please try again or email us directly at sales@neuragg.com",
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSubmittingDemo(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickQuestions = [
    "What is Neuragg CRM?",
    "How does AI calling work?",
    "What are the pricing plans?",
    "Can I schedule a demo?",
  ];

  const handleQuickQuestion = (question: string) => {
    setInputValue(question);
    setTimeout(() => handleSendMessage(), 100);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 group"
        aria-label="Open chat"
      >
        <div className="relative">
          {/* Animated ping effect */}
          <span className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-75" />

          {/* Main button */}
          <div className="relative flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 hover:scale-110">
            <MessageCircle className="w-8 h-8 text-white" />

            {/* AI indicator */}
            <div className="absolute -top-1 -right-1 flex items-center justify-center w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full border-2 border-white shadow-lg">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
          </div>

          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none">
            Chat with our AI Assistant
            <div className="absolute top-full right-4 -mt-1 w-2 h-2 bg-gray-900 transform rotate-45" />
          </div>
        </div>
      </button>
    );
  }

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 transition-all duration-300",
        isMinimized ? "w-80 h-14" : "w-96 h-[600px]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-full backdrop-blur-sm">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-blue-700" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-base">AI Assistant</h3>
            <p className="text-blue-100 text-xs">Neuragg CRM</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            aria-label={isMinimized ? "Maximize" : "Minimize"}
          >
            <Minimize2 className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Close chat"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.sender === 'user' ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3 shadow-sm",
                    message.sender === 'user'
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-white text-gray-800 rounded-bl-sm border border-gray-200"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                  <p
                    className={cn(
                      "text-xs mt-1",
                      message.sender === 'user' ? "text-blue-100" : "text-gray-400"
                    )}
                  >
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-gray-200">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Demo Request Form */}
            {showDemoForm && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 border-2 border-blue-200 shadow-lg">
                <h4 className="text-base font-semibold text-blue-900 mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  Schedule Your Demo
                </h4>
                <form onSubmit={handleSubmitDemoRequest} className="space-y-3">
                  <div>
                    <label className="flex items-center gap-2 text-xs font-medium text-gray-700 mb-1">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={demoFormData.name}
                      onChange={(e) => setDemoFormData({ ...demoFormData, name: e.target.value })}
                      placeholder="John Doe"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      disabled={isSubmittingDemo}
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-xs font-medium text-gray-700 mb-1">
                      <Mail className="w-3.5 h-3.5 text-blue-600" />
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={demoFormData.email}
                      onChange={(e) => setDemoFormData({ ...demoFormData, email: e.target.value })}
                      placeholder="john@company.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      disabled={isSubmittingDemo}
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-xs font-medium text-gray-700 mb-1">
                      <Phone className="w-3.5 h-3.5 text-blue-600" />
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={demoFormData.phone}
                      onChange={(e) => setDemoFormData({ ...demoFormData, phone: e.target.value })}
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      disabled={isSubmittingDemo}
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-xs font-medium text-gray-700 mb-1">
                      <Building className="w-3.5 h-3.5 text-blue-600" />
                      Company (Optional)
                    </label>
                    <input
                      type="text"
                      value={demoFormData.company}
                      onChange={(e) => setDemoFormData({ ...demoFormData, company: e.target.value })}
                      placeholder="Your Company Inc."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      disabled={isSubmittingDemo}
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowDemoForm(false)}
                      className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                      disabled={isSubmittingDemo}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isSubmittingDemo}
                    >
                      {isSubmittingDemo ? 'Submitting...' : 'Submit Request'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions (only show when conversation is fresh and form not showing) */}
          {messages.length <= 1 && !showDemoForm && (
            <div className="px-4 py-3 bg-white border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2">Quick questions:</p>
              <div className="flex flex-wrap gap-2">
                {quickQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickQuestion(question)}
                    className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors border border-blue-200"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input (hide when showing demo form) */}
          {!showDemoForm && (
            <div className="p-4 bg-white border-t border-gray-200 rounded-b-2xl">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                  aria-label="Send message"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">
                Powered by Neuragg AI
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
