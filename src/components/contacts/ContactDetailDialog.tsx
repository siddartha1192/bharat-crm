import { Contact } from '@/types/contact';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  Linkedin,
  MessageCircle,
  IndianRupee,
  User,
  FileText,
  Calendar,
  Tag,
  ExternalLink,
  Video,
  Briefcase,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';

interface ContactDetailDialogProps {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const typeColors = {
  'customer': 'bg-green-500/10 text-green-600 border-green-500/20',
  'prospect': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'partner': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  'vendor': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
};

const industryIcons = {
  'technology': '💻',
  'manufacturing': '🏭',
  'retail': '🛒',
  'export': '🚢',
  'services': '💼',
  'textile': '🧵',
  'food': '🍽️',
  'healthcare': '🏥',
  'other': '🏢',
};

export function ContactDetailDialog({ contact, open, onOpenChange }: ContactDetailDialogProps) {
  const handleSendEmail = () => {
    if (!contact) return;
    // Navigate to emails page
    window.location.href = `/emails?compose=true&to=${encodeURIComponent(contact.email)}&subject=${encodeURIComponent(`Follow-up: ${contact.name}`)}`;
  };

  const handleScheduleMeeting = () => {
    if (!contact) return;
    // Navigate to calendar page
    window.location.href = `/calendar?new=true&title=${encodeURIComponent(`Meeting with ${contact.name}`)}&attendees=${encodeURIComponent(contact.email)}`;
  };

  if (!contact) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 w-full sm:max-w-2xl lg:max-w-4xl overflow-hidden flex flex-col">
        {/* Modern Blue Ribbon Header */}
        <div className="relative bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 text-white px-8 py-6 shadow-lg">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40"></div>
          <div className="relative flex items-start gap-4">
            <Avatar className="h-20 w-20 border-4 border-white/30 shadow-xl ring-4 ring-white/20">
              <AvatarFallback className="bg-white text-blue-600 font-bold text-2xl">
                {contact.name?.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase() || 'C'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-bold text-white truncate mb-1">
                    {contact.name}
                  </h2>
                  <div className="text-blue-100 mb-3">
                    {contact.designation}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-blue-100">
                      <div className="text-2xl">{industryIcons[contact.industry]}</div>
                      <div>
                        <div className="font-semibold">{contact.company}</div>
                        <div className="text-xs opacity-90 capitalize">{contact.industry} • {contact.companySize} employees</div>
                      </div>
                    </div>
                  </div>
                </div>
                <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                  {contact.type.toUpperCase()}
                </Badge>
              </div>
              {contact.lifetimeValue > 0 && (
                <div className="flex items-center gap-2 mt-4 text-white/90">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm font-medium">Lifetime Value:</span>
                  <span className="text-lg font-bold">
                    ₹{contact.lifetimeValue.toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <ScrollArea className="flex-1 px-8 py-6">
          <div className="space-y-6">
            {/* Contact Information Card */}
            <Card className="border-l-4 border-l-blue-500 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Phone className="w-5 h-5 text-blue-600" />
                  </div>
                  Contact Information
                </h3>
                <div className="grid gap-3">
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50/50 to-transparent rounded-xl hover:from-blue-50 transition-colors border border-blue-100/50">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Mail className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Email</div>
                      <a href={`mailto:${contact.email}`} className="text-sm font-semibold hover:text-blue-600 transition-colors truncate block">
                        {contact.email}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50/50 to-transparent rounded-xl hover:from-blue-50 transition-colors border border-blue-100/50">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Phone className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Primary Phone</div>
                      <a href={`tel:${contact.phone}`} className="text-sm font-semibold hover:text-blue-600 transition-colors truncate block">
                        {contact.phone}
                      </a>
                    </div>
                  </div>
                  {contact.alternatePhone && (
                    <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50/50 to-transparent rounded-xl hover:from-blue-50 transition-colors border border-blue-100/50">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <Phone className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-muted-foreground mb-1">Alternate Phone</div>
                        <a href={`tel:${contact.alternatePhone}`} className="text-sm font-semibold hover:text-blue-600 transition-colors truncate block">
                          {contact.alternatePhone}
                        </a>
                      </div>
                    </div>
                  )}
                  {contact.whatsapp && (
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50/50 to-transparent rounded-xl border border-green-100/50">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                          <MessageCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-muted-foreground mb-1">WhatsApp</div>
                          <div className="text-sm font-semibold truncate">{contact.whatsapp}</div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => window.open(`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`, '_blank')}
                        className="bg-green-600 hover:bg-green-700 shadow-sm ml-3"
                      >
                        <MessageCircle className="w-3 h-3 mr-1" />
                        Open
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Online Presence Card */}
            {(contact.website || contact.linkedIn) && (
              <Card className="border-l-4 border-l-purple-500 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Globe className="w-5 h-5 text-purple-600" />
                    </div>
                    Online Presence
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {contact.website && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="rounded-lg shadow-sm hover:shadow-md hover:scale-105 transition-all"
                      >
                        <a href={contact.website} target="_blank" rel="noopener noreferrer">
                          <Globe className="w-4 h-4 mr-2" />
                          Website
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      </Button>
                    )}
                    {contact.linkedIn && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="rounded-lg shadow-sm hover:shadow-md hover:scale-105 transition-all hover:bg-blue-500/10 hover:border-blue-500 hover:text-blue-600"
                      >
                        <a href={contact.linkedIn} target="_blank" rel="noopener noreferrer">
                          <Linkedin className="w-4 h-4 mr-2" />
                          LinkedIn
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Address Card */}
            <Card className="border-l-4 border-l-amber-500 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <MapPin className="w-5 h-5 text-amber-600" />
                  </div>
                  Address
                </h3>
                <div className="p-4 bg-gradient-to-br from-amber-50/50 to-transparent rounded-xl border border-amber-100/50">
                  <div className="text-sm leading-relaxed">
                    <div className="font-semibold">{contact.address.street}</div>
                    <div className="text-muted-foreground">
                      {contact.address.city}, {contact.address.state} - {contact.address.pincode}
                    </div>
                    <div className="text-muted-foreground">{contact.address.country}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tax Information Card */}
            {(contact.gstNumber || contact.panNumber) && (
              <Card className="border-l-4 border-l-indigo-500 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <FileText className="w-5 h-5 text-indigo-600" />
                    </div>
                    Tax Information
                  </h3>
                  <div className="grid gap-3">
                    {contact.gstNumber && (
                      <div className="p-4 bg-gradient-to-br from-indigo-50/50 to-transparent rounded-xl border border-indigo-100/50">
                        <div className="text-xs font-medium text-muted-foreground mb-1">GST Number</div>
                        <div className="text-sm font-mono font-semibold">{contact.gstNumber}</div>
                      </div>
                    )}
                    {contact.panNumber && (
                      <div className="p-4 bg-gradient-to-br from-indigo-50/50 to-transparent rounded-xl border border-indigo-100/50">
                        <div className="text-xs font-medium text-muted-foreground mb-1">PAN Number</div>
                        <div className="text-sm font-mono font-semibold">{contact.panNumber}</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Additional Details Card */}
            <Card className="border-l-4 border-l-green-500 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Briefcase className="w-5 h-5 text-green-600" />
                  </div>
                  Additional Details
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 sm:col-span-1 p-4 bg-gradient-to-br from-green-50/50 to-transparent rounded-xl border border-green-100/50">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
                      <User className="w-4 h-4 text-green-600" />
                      Assigned To
                    </div>
                    <div className="text-sm font-semibold">{contact.assignedTo}</div>
                  </div>
                  <div className="col-span-2 sm:col-span-1 p-4 bg-gradient-to-br from-green-50/50 to-transparent rounded-xl border border-green-100/50">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
                      <Calendar className="w-4 h-4 text-green-600" />
                      Created
                    </div>
                    <div className="text-sm font-semibold">{format(new Date(contact.createdAt), 'PPP')}</div>
                  </div>
                  <div className="col-span-2 p-4 bg-gradient-to-br from-green-50/50 to-transparent rounded-xl border border-green-100/50">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
                      <Calendar className="w-4 h-4 text-green-600" />
                      Last Updated
                    </div>
                    <div className="text-sm font-semibold">{format(new Date(contact.updatedAt), 'PPP')}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes Card */}
            {contact.notes && (
              <Card className="border-l-4 border-l-rose-500 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
                    <div className="p-2 bg-rose-100 rounded-lg">
                      <FileText className="w-5 h-5 text-rose-600" />
                    </div>
                    Notes
                  </h3>
                  <div className="p-4 bg-gradient-to-br from-rose-50/50 to-transparent rounded-xl border border-rose-100/50">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{contact.notes}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tags Card */}
            {contact.tags && contact.tags.length > 0 && (
              <Card className="border-l-4 border-l-pink-500 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
                    <div className="p-2 bg-pink-100 rounded-lg">
                      <Tag className="w-5 h-5 text-pink-600" />
                    </div>
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {contact.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="px-3 py-1 text-sm font-medium rounded-full shadow-sm hover:shadow-md transition-shadow">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        {/* Modern Action Footer */}
        <div className="border-t bg-gradient-to-r from-slate-50 to-slate-100/50 px-8 py-4 flex gap-3 shadow-lg">
          <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all" onClick={handleSendEmail}>
            <Mail className="w-4 h-4 mr-2" />
            Send Email
          </Button>
          <Button className="flex-1 border-2 border-blue-200 hover:border-blue-300 hover:bg-blue-50 shadow-sm hover:shadow-md transition-all" variant="outline" onClick={handleScheduleMeeting}>
            <Video className="w-4 h-4 mr-2" />
            Schedule Meeting
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
