import { Lead } from '@/types/lead';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Building2,
  Mail,
  Phone,
  IndianRupee,
  Calendar,
  MessageCircle,
  Globe,
  User,
  Clock,
  Tag,
  Linkedin,
  Twitter,
  Facebook,
  ExternalLink,
  PhoneCall,
  Video,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface LeadDetailDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const sourceIcons = {
  'web-form': Globe,
  'whatsapp': MessageCircle,
  'call': PhoneCall,
  'email': Mail,
  'referral': User,
  'social-media': Twitter,
  'missed-call': PhoneCall,
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

export function LeadDetailDialog({ lead, open, onOpenChange }: LeadDetailDialogProps) {
  if (!lead) return null;

  const SourceIcon = sourceIcons[lead.source];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-semibold text-xl">
                {lead.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-2xl font-bold">{lead.name}</div>
              <div className="text-sm font-normal text-muted-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                {lead.company}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Status & Priority */}
          <div className="flex items-center gap-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Status</div>
              <Badge className={`${statusColors[lead.status]} border`}>
                {lead.status.toUpperCase()}
              </Badge>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Priority</div>
              <Badge className={`${priorityColors[lead.priority]} border`}>
                {lead.priority.toUpperCase()}
              </Badge>
            </div>
            <div className="ml-auto">
              <div className="text-xs text-muted-foreground mb-1">Estimated Value</div>
              <div className="flex items-center gap-1 text-lg font-bold text-foreground">
                <IndianRupee className="w-5 h-5" />
                ₹{lead.estimatedValue.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <Separator />

          {/* Contact Information */}
          <div>
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Contact Information
            </h3>
            <div className="grid gap-3">
              <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg hover:bg-secondary/30 transition-colors">
                <Mail className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground">Email</div>
                  <a href={`mailto:${lead.email}`} className="text-sm font-medium hover:text-primary">
                    {lead.email}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg hover:bg-secondary/30 transition-colors">
                <Phone className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground">Phone</div>
                  <a href={`tel:${lead.phone}`} className="text-sm font-medium hover:text-primary">
                    {lead.phone}
                  </a>
                </div>
              </div>
              {lead.whatsapp && (
                <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg hover:bg-secondary/30 transition-colors">
                  <MessageCircle className="w-5 h-5 text-green-600" />
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground">WhatsApp</div>
                    <a
                      href={`https://wa.me/${lead.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium hover:text-primary flex items-center gap-1"
                    >
                      {lead.whatsapp}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Social Media & Web */}
          {(lead.website || lead.linkedIn || lead.twitter || lead.facebook) && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Online Presence
                </h3>
                <div className="flex flex-wrap gap-2">
                  {lead.website && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="hover:bg-primary/10 hover:border-primary"
                    >
                      <a href={lead.website} target="_blank" rel="noopener noreferrer">
                        <Globe className="w-4 h-4 mr-2" />
                        Website
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </Button>
                  )}
                  {lead.linkedIn && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="hover:bg-blue-500/10 hover:border-blue-500"
                    >
                      <a href={lead.linkedIn} target="_blank" rel="noopener noreferrer">
                        <Linkedin className="w-4 h-4 mr-2" />
                        LinkedIn
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </Button>
                  )}
                  {lead.twitter && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="hover:bg-sky-500/10 hover:border-sky-500"
                    >
                      <a href={lead.twitter} target="_blank" rel="noopener noreferrer">
                        <Twitter className="w-4 h-4 mr-2" />
                        Twitter
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </Button>
                  )}
                  {lead.facebook && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="hover:bg-blue-600/10 hover:border-blue-600"
                    >
                      <a href={lead.facebook} target="_blank" rel="noopener noreferrer">
                        <Facebook className="w-4 h-4 mr-2" />
                        Facebook
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Lead Details */}
          <div>
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <SourceIcon className="w-5 h-5" />
              Lead Details
            </h3>
            <div className="grid gap-3">
              <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg">
                <SourceIcon className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-xs text-muted-foreground">Source</div>
                  <div className="text-sm font-medium capitalize">{lead.source.replace('-', ' ')}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg">
                <User className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-xs text-muted-foreground">Assigned To</div>
                  <div className="text-sm font-medium">{lead.assignedTo}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg">
                <Calendar className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-xs text-muted-foreground">Created</div>
                  <div className="text-sm font-medium">
                    {format(lead.createdAt, 'PPP')} ({formatDistanceToNow(lead.createdAt, { addSuffix: true })})
                  </div>
                </div>
              </div>
              {lead.lastContactedAt && (
                <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg">
                  <Clock className="w-5 h-5 text-primary" />
                  <div>
                    <div className="text-xs text-muted-foreground">Last Contacted</div>
                    <div className="text-sm font-medium">
                      {format(lead.lastContactedAt, 'PPP')} ({formatDistanceToNow(lead.lastContactedAt, { addSuffix: true })})
                    </div>
                  </div>
                </div>
              )}
              {lead.nextFollowUpAt && (
                <div className="flex items-center gap-3 p-3 bg-accent/20 rounded-lg border border-accent">
                  <Calendar className="w-5 h-5 text-accent-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Next Follow-up</div>
                    <div className="text-sm font-medium">
                      {format(lead.nextFollowUpAt, 'PPP')} ({formatDistanceToNow(lead.nextFollowUpAt, { addSuffix: true })})
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {lead.notes && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-foreground mb-3">Notes</h3>
                <p className="text-sm text-muted-foreground bg-secondary/20 p-4 rounded-lg">
                  {lead.notes}
                </p>
              </div>
            </>
          )}

          {/* Tags */}
          {lead.tags.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Tag className="w-5 h-5" />
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {lead.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-sm">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button className="flex-1">
              <PhoneCall className="w-4 h-4 mr-2" />
              Call Lead
            </Button>
            <Button className="flex-1" variant="outline">
              <Mail className="w-4 h-4 mr-2" />
              Send Email
            </Button>
            <Button className="flex-1" variant="outline">
              <Video className="w-4 h-4 mr-2" />
              Schedule Meet
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
