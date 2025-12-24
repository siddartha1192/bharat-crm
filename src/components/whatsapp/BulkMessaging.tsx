import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
      // API returns {data: [...], pagination: {...}}
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

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        c =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.phone.includes(searchQuery)
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      // You can add custom filters here (e.g., by company, tags, etc.)
    }

    return filtered;
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

    if (!message.trim()) {
      toast({
        title: 'No Message',
        description: 'Please enter a message to send',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSending(true);
      setShowResults(false);

      const selectedContactsData = contacts.filter(c => selectedContacts.has(c.id));

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
      setResults(data.results || []);
      setShowResults(true);

      const successCount = data.results.filter((r: BulkMessageResult) => r.success).length;
      const failureCount = data.results.length - successCount;

      toast({
        title: 'Bulk Messages Sent',
        description: `Successfully sent to ${successCount} contact(s). ${failureCount > 0 ? `${failureCount} failed.` : ''}`,
      });

      // Clear selection and message after successful send
      setSelectedContacts(new Set());
      setMessage('');
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
      <Card className="w-[500px] flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Compose Message
          </CardTitle>
          <CardDescription>
            Write your message to send to all selected contacts
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4">
          <div className="flex-1 flex flex-col gap-2">
            <label className="text-sm font-medium">Message</label>
            <Textarea
              placeholder="Type your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 min-h-[300px] resize-none"
            />
            <div className="text-xs text-muted-foreground text-right">
              {message.length} characters
            </div>
          </div>

          <Button
            onClick={sendBulkMessages}
            disabled={sending || selectedContacts.size === 0 || !message.trim()}
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

          {/* Info Alert */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
            <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-900 dark:text-blue-100">
              <p className="font-medium mb-1">Bulk Messaging Tips:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Messages are sent individually to each contact</li>
                <li>Please comply with WhatsApp's messaging policies</li>
                <li>Avoid sending spam or unsolicited messages</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
