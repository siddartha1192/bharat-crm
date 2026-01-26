import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as BigCalendar, dateFnsLocalizer, Views, SlotInfo } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addHours } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { ProtectedFeature } from '@/components/auth/ProtectedFeature';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Edit,
  RefreshCw,
  Link as LinkIcon,
  Unlink,
  Loader2,
  Users,
  MapPin,
  Clock,
  MoreVertical,
  X,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees?: string[];
  googleEventId?: string;
  isAllDay: boolean;
  color: string;
  reminders?: any;
}

export default function Calendar() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [view, setView] = useState(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    location: '',
    attendees: '',
    isAllDay: false,
    color: 'blue',
    syncWithGoogle: true,
  });

  // Fetch connection status
  useEffect(() => {
    checkConnectionStatus();
  }, []);

  // Fetch events on mount
  useEffect(() => {
    fetchEvents(false);
  }, []);

  // Refresh status when component becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('[Calendar] Tab became visible, refreshing connection status...');
        checkConnectionStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found in localStorage');
        return;
      }

      const response = await fetch(`${API_URL}/calendar/auth/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to check connection status');

      const data = await response.json();
      console.log('[Calendar] Connection status response:', data);
      setIsConnected(data.status?.connected || false);
    } catch (error) {
      console.error('Error checking connection status:', error);
      setIsConnected(false);
    }
  };

  const fetchEvents = async (syncWithGoogle = false) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found in localStorage');
        setLoading(false);
        setSyncing(false);
        return;
      }

      if (syncWithGoogle) {
        setSyncing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch(
        `${API_URL}/calendar/events?syncWithGoogle=${syncWithGoogle}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch events');

      const data = await response.json();
      const formattedEvents = data.events.map((event: any) => ({
        ...event,
        startTime: new Date(event.startTime),
        endTime: new Date(event.endTime),
      }));

      setEvents(formattedEvents);

      // Refresh connection status after syncing
      if (syncWithGoogle) {
        console.log('[Calendar] Sync completed, refreshing connection status...');
        await checkConnectionStatus();
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: 'Error',
        description: 'Failed to load events',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    const start = new Date(slotInfo.start);
    const end = new Date(slotInfo.end);

    setFormData({
      title: '',
      description: '',
      startTime: format(start, "yyyy-MM-dd'T'HH:mm"),
      endTime: format(end, "yyyy-MM-dd'T'HH:mm"),
      location: '',
      attendees: '',
      isAllDay: false,
      color: 'blue',
      syncWithGoogle: isConnected,
    });

    setSelectedEvent(null);
    setIsEditMode(false);
    setShowEventDialog(true);
  }, [isConnected]);

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      startTime: format(new Date(event.startTime), "yyyy-MM-dd'T'HH:mm"),
      endTime: format(new Date(event.endTime), "yyyy-MM-dd'T'HH:mm"),
      location: event.location || '',
      attendees: (event.attendees || []).join(', '),
      isAllDay: event.isAllDay,
      color: event.color,
      syncWithGoogle: !!event.googleEventId,
    });
    setIsEditMode(true);
    setShowEventDialog(true);
  }, []);

  const handleSaveEvent = async () => {
    if (!formData.title.trim() || !formData.startTime || !formData.endTime) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found in localStorage');
        toast({
          title: 'Authentication Error',
          description: 'Please log in first',
          variant: 'destructive',
        });
        return;
      }

      const eventData = {
        title: formData.title,
        description: formData.description,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
        location: formData.location,
        attendees: formData.attendees
          .split(',')
          .map((email) => email.trim())
          .filter((email) => email),
        isAllDay: formData.isAllDay,
        color: formData.color,
        syncWithGoogle: formData.syncWithGoogle,
      };

      let response;

      if (isEditMode && selectedEvent) {
        response = await fetch(`${API_URL}/calendar/events/${selectedEvent.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(eventData),
        });
      } else {
        response = await fetch(`${API_URL}/calendar/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(eventData),
        });
      }

      if (!response.ok) throw new Error('Failed to save event');

      toast({
        title: 'Success',
        description: `Event ${isEditMode ? 'updated' : 'created'} successfully`,
      });

      setShowEventDialog(false);
      fetchEvents(false);
    } catch (error) {
      console.error('Error saving event:', error);
      toast({
        title: 'Error',
        description: `Failed to ${isEditMode ? 'update' : 'create'} event`,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found in localStorage');
        toast({
          title: 'Authentication Error',
          description: 'Please log in first',
          variant: 'destructive',
        });
        return;
      }

      const response = await fetch(`${API_URL}/calendar/events/${selectedEvent.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete event');

      toast({
        title: 'Success',
        description: 'Event deleted successfully',
      });

      setShowDeleteDialog(false);
      setShowEventDialog(false);
      fetchEvents(false);
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete event',
        variant: 'destructive',
      });
    }
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    const colorMap: Record<string, string> = {
      blue: '#3b82f6',
      green: '#10b981',
      red: '#ef4444',
      yellow: '#f59e0b',
      purple: '#8b5cf6',
      pink: '#ec4899',
    };

    return {
      style: {
        backgroundColor: colorMap[event.color] || '#3b82f6',
        borderRadius: '5px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
      },
    };
  };

  return (
    <div className="p-6 h-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CalendarIcon className="w-8 h-8" />
            Calendar
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your events and schedules
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => fetchEvents(true)}
            disabled={syncing || !isConnected}
          >
            {syncing ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Sync with Google
          </Button>

          {!isConnected && (
            <Button
              variant="outline"
              onClick={() => navigate('/settings?tab=integrations')}
            >
              <LinkIcon className="w-4 h-4 mr-2" />
              Connect Calendar
            </Button>
          )}

          <ProtectedFeature permission="calendar:create">
            <Button
              onClick={() => {
                setSelectedEvent(null);
                setIsEditMode(false);
                setFormData({
                  title: '',
                  description: '',
                  startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
                  endTime: format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm"),
                  location: '',
                  attendees: '',
                  isAllDay: false,
                  color: 'blue',
                  syncWithGoogle: isConnected,
                });
                setShowEventDialog(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Event
            </Button>
          </ProtectedFeature>
        </div>
      </div>

      {!isConnected && !loading && (
        <Alert className="mb-4">
          <LinkIcon className="h-4 w-4" />
          <AlertDescription>
            Connect your Google Calendar to sync events. Go to{' '}
            <button
              onClick={() => navigate('/settings?tab=integrations')}
              className="font-semibold underline hover:text-primary"
            >
              Settings &gt; Integrations
            </button>{' '}
            to connect.
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="bg-card rounded-lg border p-4" style={{ height: 'calc(100vh - 250px)' }}>
          <BigCalendar
            localizer={localizer}
            events={events}
            startAccessor="startTime"
            endAccessor="endTime"
            titleAccessor="title"
            view={view}
            onView={setView}
            date={date}
            onNavigate={setDate}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            selectable
            eventPropGetter={eventStyleGetter}
            views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
            popup
          />
        </div>
      )}

      {/* Event Dialog */}
      <Sheet open={showEventDialog} onOpenChange={setShowEventDialog}>
        <SheetContent className="p-0 w-full sm:max-w-2xl overflow-hidden flex flex-col">
          {/* Accessibility: Hidden title and description for screen readers */}
          <VisuallyHidden>
            <SheetTitle>{isEditMode ? 'Edit Event' : 'Create New Event'}</SheetTitle>
            <SheetDescription>
              {isEditMode
                ? 'Update the event details below'
                : 'Fill in the details for your new event'}
            </SheetDescription>
          </VisuallyHidden>

          {/* Modern Blue Ribbon Header */}
          <div className="relative bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 text-white px-6 py-5 shadow-lg">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40"></div>
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <CalendarIcon className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold">{isEditMode ? 'Edit Event' : 'Create New Event'}</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowEventDialog(false)}
                className="text-white hover:bg-white/20 rounded-lg"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Scrollable Form Area */}
          <ScrollArea className="flex-1 px-6 py-6">
            <div className="space-y-6">
              {/* Event Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-foreground border-l-4 border-l-blue-500 pl-3">Event Details</h3>
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-semibold">Title *</Label>
                  <Input
                    id="title"
                    placeholder="Event title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="border-2 focus:border-blue-500 rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Event description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                    className="border-2 focus:border-blue-500 rounded-lg resize-none"
                  />
                </div>
              </div>

              {/* Date & Time */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-foreground border-l-4 border-l-purple-500 pl-3">Date & Time</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime" className="text-sm font-semibold">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Start Time *
                    </Label>
                    <Input
                      id="startTime"
                      type="datetime-local"
                      value={formData.startTime}
                      onChange={(e) => {
                        const newStartTime = e.target.value;
                        // Auto-update end time to be 1 hour after start time
                        const startDate = new Date(newStartTime);
                        const endDate = addHours(startDate, 1);
                        setFormData({
                          ...formData,
                          startTime: newStartTime,
                          endTime: format(endDate, "yyyy-MM-dd'T'HH:mm")
                        });
                      }}
                      className="border-2 focus:border-blue-500 rounded-lg"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endTime" className="text-sm font-semibold">
                      <Clock className="w-4 h-4 inline mr-1" />
                      End Time *
                    </Label>
                    <Input
                      id="endTime"
                      type="datetime-local"
                      value={formData.endTime}
                      onChange={(e) =>
                        setFormData({ ...formData, endTime: e.target.value })
                      }
                      className="border-2 focus:border-blue-500 rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isAllDay"
                    checked={formData.isAllDay}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isAllDay: checked })
                    }
                  />
                  <Label htmlFor="isAllDay" className="text-sm font-semibold">All day event</Label>
                </div>
              </div>

              {/* Location & Attendees */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-foreground border-l-4 border-l-green-500 pl-3">Location & Attendees</h3>
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-sm font-semibold">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Location
                  </Label>
                  <Input
                    id="location"
                    placeholder="Event location"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    className="border-2 focus:border-blue-500 rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="attendees" className="text-sm font-semibold">
                    <Users className="w-4 h-4 inline mr-1" />
                    Attendees (comma separated emails)
                  </Label>
                  <Input
                    id="attendees"
                    placeholder="email1@example.com, email2@example.com"
                    value={formData.attendees}
                    onChange={(e) =>
                      setFormData({ ...formData, attendees: e.target.value })
                    }
                    className="border-2 focus:border-blue-500 rounded-lg"
                  />
                </div>
              </div>

              {/* Appearance & Sync */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-foreground border-l-4 border-l-amber-500 pl-3">Appearance & Sync</h3>
                <div className="space-y-2">
                  <Label htmlFor="color" className="text-sm font-semibold">Event Color</Label>
                  <Select
                    value={formData.color}
                    onValueChange={(value) => setFormData({ ...formData, color: value })}
                  >
                    <SelectTrigger className="border-2 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blue">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-blue-500"></div>
                          Blue
                        </div>
                      </SelectItem>
                      <SelectItem value="green">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-green-500"></div>
                          Green
                        </div>
                      </SelectItem>
                      <SelectItem value="red">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-red-500"></div>
                          Red
                        </div>
                      </SelectItem>
                      <SelectItem value="yellow">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-yellow-500"></div>
                          Yellow
                        </div>
                      </SelectItem>
                      <SelectItem value="purple">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-purple-500"></div>
                          Purple
                        </div>
                      </SelectItem>
                      <SelectItem value="pink">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-pink-500"></div>
                          Pink
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isConnected && (
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="syncWithGoogle"
                      checked={formData.syncWithGoogle}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, syncWithGoogle: checked })
                      }
                    />
                    <Label htmlFor="syncWithGoogle" className="text-sm font-semibold">Sync with Google Calendar</Label>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          {/* Modern Action Footer */}
          <div className="border-t bg-gradient-to-r from-slate-50 to-slate-100/50 px-6 py-4 flex gap-3 shadow-lg">
            {isEditMode && (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                className="rounded-lg shadow-sm"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setShowEventDialog(false)}
              className="flex-1 border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEvent}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all rounded-lg"
            >
              {isEditMode ? 'Update' : 'Create'} Event
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this event? This action cannot be undone.
              {selectedEvent?.googleEventId &&
                ' This will also delete the event from Google Calendar.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteEvent}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
