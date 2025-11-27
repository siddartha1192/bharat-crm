import { Contact } from '@/types/contact';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
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
  ExternalLink,
  Sparkles,
  Award,
} from 'lucide-react';

interface ContactCardProps {
  contact: Contact;
  onViewProfile?: (contact: Contact) => void;
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

export function ContactCard({ contact, onViewProfile }: ContactCardProps) {
  return (
    <Card className="p-5 hover:shadow-lg transition-all border-l-4 border-l-primary/20 hover:border-l-primary">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-14 w-14 ring-2 ring-primary/10">
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-semibold text-lg">
              {contact.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-foreground text-lg">{contact.name}</h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Award className="w-3 h-3" />
              {contact.designation}
            </p>
          </div>
        </div>
        <Badge className={`${typeColors[contact.type]} border font-medium`}>
          {contact.type}
        </Badge>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-foreground">{contact.company}</span>
          <span className="text-xs">{industryIcons[contact.industry]}</span>
        </div>
        <div className="text-xs text-muted-foreground ml-6">
          {contact.companySize} employees • {contact.industry}
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="w-4 h-4" />
          <span className="truncate">{contact.email}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Phone className="w-4 h-4" />
          <span>{contact.phone}</span>
        </div>
        {contact.whatsapp && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageCircle className="w-4 h-4 text-green-600" />
            <span>{contact.whatsapp}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span>{contact.address.city}, {contact.address.state}</span>
        </div>
      </div>

      {(contact.gstNumber || contact.panNumber) && (
        <div className="mb-4 p-2 bg-accent/10 rounded space-y-1">
          {contact.gstNumber && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="w-3 h-3" />
              <span>GST: {contact.gstNumber}</span>
            </div>
          )}
          {contact.panNumber && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="w-3 h-3" />
              <span>PAN: {contact.panNumber}</span>
            </div>
          )}
        </div>
      )}

      {contact.lifetimeValue > 0 && (
        <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-4 p-2 bg-primary/10 rounded">
          <IndianRupee className="w-4 h-4" />
          <span>Lifetime Value: ₹{contact.lifetimeValue.toLocaleString('en-IN')}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-1 mb-4">
        {contact.tags.map(tag => (
          <Badge key={tag} variant="outline" className="text-xs">
            {tag}
          </Badge>
        ))}
      </div>

      {/* Social Media Links */}
      {(contact.website || contact.linkedIn) && (
        <div className="flex gap-2 mb-4 pt-2 border-t border-border/50">
          {contact.website && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 hover:bg-primary/10"
              asChild
            >
              <a href={contact.website} target="_blank" rel="noopener noreferrer">
                <Globe className="w-4 h-4" />
              </a>
            </Button>
          )}
          {contact.linkedIn && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 hover:bg-blue-500/10 hover:text-blue-500"
              asChild
            >
              <a href={contact.linkedIn} target="_blank" rel="noopener noreferrer">
                <Linkedin className="w-4 h-4" />
              </a>
            </Button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="w-4 h-4" />
          <span>{contact.assignedTo}</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="hover:bg-primary/10">
            <MessageCircle className="w-4 h-4 mr-1" />
            Message
          </Button>
          <Button size="sm" onClick={() => onViewProfile?.(contact)} className="bg-gradient-to-r from-primary to-primary/80">
            <ExternalLink className="w-4 h-4 mr-1" />
            View Profile
          </Button>
        </div>
      </div>
    </Card>
  );
}
