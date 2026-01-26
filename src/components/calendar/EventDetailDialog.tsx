import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  FileText,
  ExternalLink,
  X,
} from 'lucide-react';
import { format } from 'date-fns';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date | string;
  endTime: Date | string;
  location?: string;
  attendees?: string[];
  googleEventId?: string;
  isAllDay: boolean;
  color: string;
  reminders?: any;
}

interface EventDetailDialogProps {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
  blue: { bg: 'bg-blue-500', text: 'text-blue-600', border: 'border-blue-500' },
  green: { bg: 'bg-green-500', text: 'text-green-600', border: 'border-green-500' },
  red: { bg: 'bg-red-500', text: 'text-red-600', border: 'border-red-500' },
  yellow: { bg: 'bg-yellow-500', text: 'text-yellow-600', border: 'border-yellow-500' },
  purple: { bg: 'bg-purple-500', text: 'text-purple-600', border: 'border-purple-500' },
  pink: { bg: 'bg-pink-500', text: 'text-pink-600', border: 'border-pink-500' },
};

export function EventDetailDialog({ event, open, onOpenChange }: EventDetailDialogProps) {
  if (!event) return null;

  const colorClass = colorClasses[event.color] || colorClasses.blue;
  const startDate = new Date(event.startTime);
  const endDate = new Date(event.endTime);

  const handleOpenInCalendar = () => {
    window.location.href = `/calendar`;
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 w-full sm:max-w-2xl overflow-hidden flex flex-col">
        {/* Accessibility: Hidden title and description for screen readers */}
        <VisuallyHidden>
          <SheetTitle>Event Details: {event.title}</SheetTitle>
          <SheetDescription>View details for the calendar event</SheetDescription>
        </VisuallyHidden>

        {/* Modern Blue Ribbon Header */}
        <div className="relative bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 text-white px-6 py-5 shadow-lg">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{event.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-3 h-3 rounded-full ${colorClass.bg}`}></div>
                  <span className="text-sm text-white/80 capitalize">{event.color} event</span>
                  {event.isAllDay && (
                    <Badge className="bg-white/20 text-white border-white/30 text-xs">
                      All Day
                    </Badge>
                  )}
                  {event.googleEventId && (
                    <Badge className="bg-white/20 text-white border-white/30 text-xs">
                      Google Synced
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="text-white hover:bg-white/20 rounded-lg"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <ScrollArea className="flex-1 px-6 py-6">
          <div className="space-y-6">
            {/* Date & Time Card */}
            <Card className={`border-l-4 ${colorClass.border} shadow-md hover:shadow-lg transition-shadow`}>
              <CardContent className="p-6">
                <h3 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
                  <div className={`p-2 bg-blue-100 rounded-lg`}>
                    <Clock className={`w-5 h-5 ${colorClass.text}`} />
                  </div>
                  Date & Time
                </h3>
                <div className="grid gap-3">
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50/50 to-transparent rounded-xl border border-blue-100/50">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <CalendarIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Start</div>
                      <div className="text-sm font-semibold">
                        {event.isAllDay
                          ? format(startDate, 'EEEE, MMMM d, yyyy')
                          : format(startDate, 'EEEE, MMMM d, yyyy \'at\' h:mm a')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50/50 to-transparent rounded-xl border border-blue-100/50">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <CalendarIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-medium text-muted-foreground mb-1">End</div>
                      <div className="text-sm font-semibold">
                        {event.isAllDay
                          ? format(endDate, 'EEEE, MMMM d, yyyy')
                          : format(endDate, 'EEEE, MMMM d, yyyy \'at\' h:mm a')}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location Card */}
            {event.location && (
              <Card className="border-l-4 border-l-green-500 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <MapPin className="w-5 h-5 text-green-600" />
                    </div>
                    Location
                  </h3>
                  <div className="p-4 bg-gradient-to-r from-green-50/50 to-transparent rounded-xl border border-green-100/50">
                    <p className="text-sm font-semibold">{event.location}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Attendees Card */}
            {event.attendees && event.attendees.length > 0 && (
              <Card className="border-l-4 border-l-purple-500 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Users className="w-5 h-5 text-purple-600" />
                    </div>
                    Attendees ({event.attendees.length})
                  </h3>
                  <div className="grid gap-2">
                    {event.attendees.map((attendee, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50/50 to-transparent rounded-xl border border-purple-100/50"
                      >
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-sm font-semibold text-purple-600">
                          {attendee.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium truncate">{attendee}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Description Card */}
            {event.description && (
              <Card className="border-l-4 border-l-amber-500 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <FileText className="w-5 h-5 text-amber-600" />
                    </div>
                    Description
                  </h3>
                  <div className="p-4 bg-gradient-to-br from-amber-50/50 to-transparent rounded-xl border border-amber-100/50">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{event.description}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        {/* Modern Action Footer */}
        <div className="border-t bg-gradient-to-r from-slate-50 to-slate-100/50 px-6 py-4 flex gap-3 shadow-lg">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm"
          >
            Close
          </Button>
          <Button
            onClick={handleOpenInCalendar}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all rounded-lg"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open in Calendar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
