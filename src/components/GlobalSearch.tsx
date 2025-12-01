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
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const userId = localStorage.getItem('userId');

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
      const response = await fetch(`${API_URL}/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'X-User-Id': userId || '',
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

  const navigateTo = (result: SearchResult) => {
    onOpenChange(false);
    setQuery('');

    switch (result.type) {
      case 'contact':
        navigate('/contacts');
        break;
      case 'lead':
        navigate('/leads');
        break;
      case 'task':
        navigate('/tasks');
        break;
      case 'deal':
        navigate('/pipeline');
        break;
      case 'invoice':
        navigate('/invoices');
        break;
      case 'event':
        navigate('/calendar');
        break;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle className="sr-only">Global Search</DialogTitle>
        </DialogHeader>

        <div className="relative px-4 pb-4">
          <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search contacts, leads, tasks, deals, invoices, events..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-12 h-12 text-base"
            autoFocus
          />
          {loading && (
            <Loader2 className="absolute right-7 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground animate-spin" />
          )}
        </div>

        <ScrollArea className="max-h-[400px]">
          {query.trim().length < 2 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Start typing to search across all your data</p>
              <p className="text-xs mt-2">Search contacts, leads, tasks, deals, invoices, and events</p>
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="p-8 text-center text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No results found for "{query}"</p>
              <p className="text-xs mt-2">Try different keywords</p>
            </div>
          ) : (
            <div className="px-2 pb-2">
              {results.map((result, index) => (
                <div
                  key={`${result.type}-${result.id}`}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors group',
                    index === selectedIndex
                      ? 'bg-accent'
                      : 'hover:bg-accent/50'
                  )}
                  onClick={() => navigateTo(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className={cn('p-2 rounded-md border', getTypeColor(result.type))}>
                    {getIcon(result.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium truncate">{result.title}</p>
                      <Badge variant="outline" className="capitalize text-xs">
                        {result.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{result.subtitle}</p>
                    {result.metadata && (
                      <p className="text-xs text-muted-foreground mt-1">{result.metadata}</p>
                    )}
                  </div>

                  <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="px-4 py-3 border-t bg-muted/30 text-xs text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-background border">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-background border">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-background border">Enter</kbd>
              Open
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-background border">Esc</kbd>
              Close
            </span>
          </div>
          <span>{results.length} results</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
