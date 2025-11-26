import { Lead } from '@/types/lead';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Building2,
  Mail,
  Phone,
  IndianRupee,
  Calendar,
  MessageCircle,
  PhoneCall,
  Globe,
  User,
  PhoneMissed,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface LeadCardProps {
  lead: Lead;
}

const sourceIcons = {
  'web-form': Globe,
  'whatsapp': MessageCircle,
  'call': PhoneCall,
  'email': Mail,
  'referral': User,
  'social-media': Globe,
  'missed-call': PhoneMissed,
};

const statusColors = {
  'new': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'contacted': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  'qualified': 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  'proposal': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  'negotiation': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  'won': 'bg-green-500/10 text-green-500 border-green-500/20',
  'lost': 'bg-red-500/10 text-red-500 border-red-500/20',
};

const priorityColors = {
  'low': 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  'medium': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'high': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  'urgent': 'bg-red-500/10 text-red-600 border-red-500/20',
};

export function LeadCard({ lead }: LeadCardProps) {
  const SourceIcon = sourceIcons[lead.source];

  return (
    <Card className="p-4 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
              {lead.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-foreground">{lead.name}</h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Building2 className="w-3 h-3" />
              <span>{lead.company}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1 items-end">
          <Badge className={`${statusColors[lead.status]} border`}>
            {lead.status}
          </Badge>
          <Badge className={`${priorityColors[lead.priority]} border`}>
            {lead.priority}
          </Badge>
        </div>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="w-4 h-4" />
          <span>{lead.email}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Phone className="w-4 h-4" />
          <span>{lead.phone}</span>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <IndianRupee className="w-4 h-4" />
          <span>₹{lead.estimatedValue.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
        <SourceIcon className="w-3 h-3" />
        <span>Source: {lead.source.replace('-', ' ')}</span>
        <span className="mx-1">•</span>
        <span>Created {formatDistanceToNow(lead.createdAt, { addSuffix: true })}</span>
      </div>

      {lead.nextFollowUpAt && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 p-2 bg-accent/10 rounded">
          <Calendar className="w-3 h-3" />
          <span>
            Follow-up: {formatDistanceToNow(lead.nextFollowUpAt, { addSuffix: true })}
          </span>
        </div>
      )}

      {lead.notes && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{lead.notes}</p>
      )}

      <div className="flex flex-wrap gap-1 mb-3">
        {lead.tags.map(tag => (
          <Badge key={tag} variant="outline" className="text-xs">
            {tag}
          </Badge>
        ))}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="w-4 h-4" />
          <span>{lead.assignedTo}</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline">
            <MessageCircle className="w-4 h-4 mr-1" />
            Contact
          </Button>
          <Button size="sm">
            View Details
          </Button>
        </div>
      </div>
    </Card>
  );
}
