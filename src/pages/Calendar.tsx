import { useState, useEffect, useCallback } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer, Views, SlotInfo } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addHours } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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

  const userId = localStorage.getItem('userId');

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

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/calendar/auth/status`, {
        headers: {
          'X-User-Id': userId || '',
        },
      });

      if (!response.ok) throw new Error('Failed to check connection status');

      const data = await response.json();
      setIsConnected(data.connected);
    } catch (error) {
      console.error('Error checking connection status:', error);
    }
  };

  const fetchEvents = async (syncWithGoogle = false) => {
    try {
      if (syncWithGoogle) {
        setSyncing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch(
        `${API_URL}/calendar/events?syncWithGoogle=${syncWithGoogle}`,
        {
          headers: {
            'X-User-Id': userId || '',
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

  const connectGoogleCalendar = async () => {
    try {
      const response = await fetch(`${API_URL}/calendar/auth/url`);

      if (!response.ok) throw new Error('Failed to get auth URL');

      const data = await response.json();
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('Error connecting Google Calendar:', error);
      toast({
        title: 'Error',
        description: 'Failed to connect Google Calendar',
        variant: 'destructive',
      });
    }
  };

  const disconnectGoogleCalendar = async () => {
    try {
      const response = await fetch(`${API_URL}/calendar/auth/disconnect`, {
        method: 'POST',
        headers: {
          'X-User-Id': userId || '',
        },
      });

      if (!response.ok) throw new Error('Failed to disconnect');

      setIsConnected(false);
      toast({
        title: 'Disconnected',
        description: 'Google Calendar disconnected successfully',
      });
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error);
      toast({
        title: 'Error',
        description: 'Failed to disconnect Google Calendar',
        variant: 'destructive',
      });
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
            'X-User-Id': userId || '',
          },
          body: JSON.stringify(eventData),
        });
      } else {
        response = await fetch(`${API_URL}/calendar/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': userId || '',
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
      const response = await fetch(`${API_URL}/calendar/events/${selectedEvent.id}`, {
        method: 'DELETE',
        headers: {
          'X-User-Id': userId || '',
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

          {isConnected ? (
            <Button variant="outline" onClick={disconnectGoogleCalendar}>
              <Unlink className="w-4 h-4 mr-2" />
              Disconnect Google
            </Button>
          ) : (
            <Button variant="outline" onClick={connectGoogleCalendar}>
              <LinkIcon className="w-4 h-4 mr-2" />
              Connect Google Calendar
            </Button>
          )}

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
        </div>
      </div>

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
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Edit Event' : 'Create New Event'}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? 'Update the event details below'
                : 'Fill in the details for your new event'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Event title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Event description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="endTime">End Time *</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
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
              <Label htmlFor="isAllDay">All day event</Label>
            </div>

            <div>
              <Label htmlFor="location">
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
              />
            </div>

            <div>
              <Label htmlFor="attendees">
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
              />
            </div>

            <div>
              <Label htmlFor="color">Event Color</Label>
              <Select
                value={formData.color}
                onValueChange={(value) => setFormData({ ...formData, color: value })}
              >
                <SelectTrigger>
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
                <Label htmlFor="syncWithGoogle">Sync with Google Calendar</Label>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            {isEditMode && (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowEventDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEvent}>
              {isEditMode ? 'Update' : 'Create'} Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
