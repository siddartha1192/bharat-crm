import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  User,
  UserPlus,
  ListTodo,
  Target,
  FileText,
  Calendar as CalendarIcon,
  Loader2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContactDetailDialog } from '@/components/contacts/ContactDetailDialog';
import { DealDialog } from '@/components/pipeline/DealDialog';
import { LeadDialog } from '@/components/leads/LeadDialog';
import { TaskDialog } from '@/components/tasks/TaskDialog';
import { InvoiceDialog } from '@/components/invoice/InvoiceDialog';
import { Contact } from '@/types/contact';
import { Deal } from '@/types/pipeline';
import { Lead } from '@/types/lead';
import { Task } from '@/types/task';
import { Invoice } from '@/types/invoice';
import { useToast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface SearchResult {
  id: string;
  type: 'contact' | 'lead' | 'task' | 'deal' | 'invoice' | 'event';
  title: string;
  subtitle: string;
  metadata?: string;
}

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Dialog states
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [dealDialogOpen, setDealDialogOpen] = useState(false);
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);

  // Entity data states
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Search function with debounce
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      setResults(data.results || []);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEntityData = async (result: SearchResult) => {
    try {
      const token = localStorage.getItem('token');
      let endpoint = '';

      switch (result.type) {
        case 'contact':
          endpoint = `/contacts/${result.id}`;
          break;
        case 'deal':
          endpoint = `/pipeline/deals/${result.id}`;
          break;
        case 'lead':
          endpoint = `/leads/${result.id}`;
          break;
        case 'task':
          endpoint = `/tasks/${result.id}`;
          break;
        case 'invoice':
          endpoint = `/invoices/${result.id}`;
          break;
        case 'event':
          // For events, navigate to calendar since the dialog is inline
          navigate('/calendar');
          onOpenChange(false);
          setQuery('');
          return;
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch entity data');

      const data = await response.json();

      // Set the entity data and open the appropriate dialog
      switch (result.type) {
        case 'contact':
          setSelectedContact(data);
          setContactDialogOpen(true);
          break;
        case 'deal':
          setSelectedDeal(data);
          setDealDialogOpen(true);
          break;
        case 'lead':
          setSelectedLead(data);
          setLeadDialogOpen(true);
          break;
        case 'task':
          setSelectedTask(data);
          setTaskDialogOpen(true);
          break;
        case 'invoice':
          setSelectedInvoice(data);
          setInvoiceDialogOpen(true);
          break;
      }

      // Close the search dialog
      onOpenChange(false);
      setQuery('');
    } catch (error) {
      console.error('Error fetching entity data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load item details',
        variant: 'destructive',
      });
    }
  };

  const navigateTo = (result: SearchResult) => {
    fetchEntityData(result);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'contact':
        return <User className="w-4 h-4" />;
      case 'lead':
        return <UserPlus className="w-4 h-4" />;
      case 'task':
        return <ListTodo className="w-4 h-4" />;
      case 'deal':
        return <Target className="w-4 h-4" />;
      case 'invoice':
        return <FileText className="w-4 h-4" />;
      case 'event':
        return <CalendarIcon className="w-4 h-4" />;
      default:
        return <Search className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'contact':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'lead':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'task':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'deal':
        return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'invoice':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'event':
        return 'bg-pink-500/10 text-pink-600 border-pink-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  const getTypeGradient = (type: string) => {
    switch (type) {
      case 'contact':
        return 'from-blue-500/5 via-blue-500/10 to-transparent';
      case 'lead':
        return 'from-green-500/5 via-green-500/10 to-transparent';
      case 'task':
        return 'from-purple-500/5 via-purple-500/10 to-transparent';
      case 'deal':
        return 'from-orange-500/5 via-orange-500/10 to-transparent';
      case 'invoice':
        return 'from-red-500/5 via-red-500/10 to-transparent';
      case 'event':
        return 'from-pink-500/5 via-pink-500/10 to-transparent';
      default:
        return 'from-gray-500/5 via-gray-500/10 to-transparent';
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      navigateTo(results[selectedIndex]);
    }
  };

  // Handle save functions for dialogs
  const handleSaveDeal = async (deal: Partial<Deal>) => {
    // Refresh the deal data after save
    if (selectedDeal?.id) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/pipeline/deals/${selectedDeal.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const data = await response.json();
          setSelectedDeal(data);
        }
      } catch (error) {
        console.error('Error refreshing deal:', error);
      }
    }
  };

  const handleSaveLead = async (lead: Lead) => {
    // Refresh the lead data after save
    if (lead.id) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/leads/${lead.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const data = await response.json();
          setSelectedLead(data);
        }
      } catch (error) {
        console.error('Error refreshing lead:', error);
      }
    }
  };

  const handleSaveTask = async (task: Partial<Task>) => {
    // Refresh the task data after save
    if (selectedTask?.id) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/tasks/${selectedTask.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const data = await response.json();
          setSelectedTask(data);
        }
      } catch (error) {
        console.error('Error refreshing task:', error);
      }
    }
  };

  const handleSaveInvoice = async (invoice: Invoice) => {
    // Refresh the invoice data after save
    if (invoice.id) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/invoices/${invoice.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const data = await response.json();
          setSelectedInvoice(data);
        }
      } catch (error) {
        console.error('Error refreshing invoice:', error);
      }
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Global Search</DialogTitle>
          </DialogHeader>

          {/* Modern Header with Gradient */}
          <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-6 py-8 overflow-hidden">
            {/* Animated background pattern */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40"></div>

            {/* Floating orbs for visual interest */}
            <div className="absolute top-0 left-1/4 w-32 h-32 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 right-1/4 w-40 h-40 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Smart Search</h2>
                  <p className="text-sm text-white/80">Find anything across your CRM</p>
                </div>
              </div>

              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
                <Input
                  placeholder="Search contacts, leads, tasks, deals, invoices, events..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-12 pr-12 h-14 text-base bg-white/95 backdrop-blur-sm border-white/20 placeholder:text-gray-500 focus:bg-white focus:ring-2 focus:ring-white/50 transition-all shadow-xl"
                  autoFocus
                />
                {loading && (
                  <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-600 animate-spin" />
                )}
              </div>
            </div>
          </div>

          {/* Results Area */}
          <ScrollArea className="max-h-[500px]">
            {query.trim().length < 2 ? (
              <div className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 mb-4">
                  <Search className="w-10 h-10 text-indigo-600" />
                </div>
                <p className="text-base font-medium text-gray-700 mb-2">Start typing to search</p>
                <p className="text-sm text-gray-500">Search across contacts, leads, tasks, deals, invoices, and events</p>
              </div>
            ) : results.length === 0 && !loading ? (
              <div className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 mb-4">
                  <Search className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-base font-medium text-gray-700 mb-2">No results found</p>
                <p className="text-sm text-gray-500">Try different keywords or check your spelling</p>
              </div>
            ) : (
              <div className="p-3 space-y-1">
                {results.map((result, index) => (
                  <div
                    key={`${result.type}-${result.id}`}
                    className={cn(
                      'relative flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200 group overflow-hidden',
                      index === selectedIndex
                        ? 'bg-gradient-to-r shadow-lg scale-[1.02] border border-transparent ' + getTypeGradient(result.type)
                        : 'hover:bg-gradient-to-r hover:shadow-md hover:scale-[1.01] border border-transparent ' + getTypeGradient(result.type)
                    )}
                    onClick={() => navigateTo(result)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    {/* Accent line on left */}
                    <div
                      className={cn(
                        'absolute left-0 top-0 bottom-0 w-1 transition-all duration-200',
                        index === selectedIndex ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                        result.type === 'contact' && 'bg-blue-500',
                        result.type === 'lead' && 'bg-green-500',
                        result.type === 'task' && 'bg-purple-500',
                        result.type === 'deal' && 'bg-orange-500',
                        result.type === 'invoice' && 'bg-red-500',
                        result.type === 'event' && 'bg-pink-500'
                      )}
                    ></div>

                    {/* Icon */}
                    <div className={cn(
                      'p-3 rounded-xl border transition-all duration-200 shadow-sm',
                      getTypeColor(result.type),
                      index === selectedIndex && 'shadow-md scale-110'
                    )}>
                      {getIcon(result.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-900 truncate">{result.title}</p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "capitalize text-xs font-medium transition-all duration-200",
                            index === selectedIndex && 'shadow-sm'
                          )}
                        >
                          {result.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{result.subtitle}</p>
                      {result.metadata && (
                        <p className="text-xs text-gray-500 mt-1 truncate">{result.metadata}</p>
                      )}
                    </div>

                    {/* Arrow Icon */}
                    <ArrowRight
                      className={cn(
                        "w-5 h-5 text-gray-400 transition-all duration-200",
                        index === selectedIndex ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'
                      )}
                    />
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Enhanced Footer */}
          <div className="px-6 py-4 border-t bg-gradient-to-r from-gray-50 to-gray-100/50">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-gray-600">
                  <kbd className="px-2 py-1 rounded bg-white border border-gray-300 shadow-sm font-medium">↑</kbd>
                  <kbd className="px-2 py-1 rounded bg-white border border-gray-300 shadow-sm font-medium">↓</kbd>
                  <span className="ml-0.5">Navigate</span>
                </span>
                <span className="flex items-center gap-1.5 text-gray-600">
                  <kbd className="px-2 py-1 rounded bg-white border border-gray-300 shadow-sm font-medium">Enter</kbd>
                  <span className="ml-0.5">Open</span>
                </span>
                <span className="flex items-center gap-1.5 text-gray-600">
                  <kbd className="px-2 py-1 rounded bg-white border border-gray-300 shadow-sm font-medium">Esc</kbd>
                  <span className="ml-0.5">Close</span>
                </span>
              </div>
              {results.length > 0 && (
                <span className="text-gray-600 font-medium">
                  {results.length} result{results.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Entity Dialogs */}
      <ContactDetailDialog
        contact={selectedContact}
        open={contactDialogOpen}
        onOpenChange={setContactDialogOpen}
      />

      <DealDialog
        deal={selectedDeal}
        open={dealDialogOpen}
        onOpenChange={setDealDialogOpen}
        onSave={handleSaveDeal}
      />

      <LeadDialog
        lead={selectedLead}
        open={leadDialogOpen}
        onOpenChange={setLeadDialogOpen}
        onSave={handleSaveLead}
      />

      <TaskDialog
        task={selectedTask || undefined}
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        onSave={handleSaveTask}
      />

      <InvoiceDialog
        invoice={selectedInvoice || undefined}
        open={invoiceDialogOpen}
        onOpenChange={setInvoiceDialogOpen}
        onSave={handleSaveInvoice}
      />
    </>
  );
}
