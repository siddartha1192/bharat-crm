import { useState } from 'react';
import { Contact } from '@/types/contact';
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
  PhoneCall,
  Video,
  Users,
  Briefcase,
} from 'lucide-react';
import { format } from 'date-fns';
import { WhatsAppChatModal } from '@/components/whatsapp/WhatsAppChatModal';

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
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);

  if (!contact) return null;

  return (
    <>
      <WhatsAppChatModal
        contact={contact}
        open={whatsappModalOpen}
        onOpenChange={setWhatsappModalOpen}
      />
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-semibold text-xl">
                {contact.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-2xl font-bold">{contact.name}</div>
              <div className="text-sm font-normal text-muted-foreground">
                {contact.designation}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Type & Company */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-2xl">
                {industryIcons[contact.industry]}
              </div>
              <div>
                <div className="text-lg font-semibold text-foreground">{contact.company}</div>
                <div className="text-sm text-muted-foreground capitalize">
                  {contact.industry} • {contact.companySize} employees
                </div>
              </div>
            </div>
            <Badge className={`${typeColors[contact.type]} border`}>
              {contact.type.toUpperCase()}
            </Badge>
          </div>

          {/* Lifetime Value */}
          {contact.lifetimeValue > 0 && (
            <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <IndianRupee className="w-4 h-4" />
                Lifetime Value
              </div>
              <div className="text-2xl font-bold text-foreground">
                ₹{contact.lifetimeValue.toLocaleString('en-IN')}
              </div>
            </div>
          )}

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
                  <a href={`mailto:${contact.email}`} className="text-sm font-medium hover:text-primary">
                    {contact.email}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg hover:bg-secondary/30 transition-colors">
                <Phone className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground">Primary Phone</div>
                  <a href={`tel:${contact.phone}`} className="text-sm font-medium hover:text-primary">
                    {contact.phone}
                  </a>
                </div>
              </div>
              {contact.alternatePhone && (
                <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg hover:bg-secondary/30 transition-colors">
                  <Phone className="w-5 h-5 text-primary" />
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground">Alternate Phone</div>
                    <a href={`tel:${contact.alternatePhone}`} className="text-sm font-medium hover:text-primary">
                      {contact.alternatePhone}
                    </a>
                  </div>
                </div>
              )}
              {contact.whatsapp && (
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-5 h-5 text-green-600" />
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">WhatsApp</div>
                      <div className="text-sm font-medium">{contact.whatsapp}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        window.open(`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`, '_blank');
                      }}
                      className="hover:bg-green-100 dark:hover:bg-green-900/30"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Open
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setWhatsappModalOpen(true)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <MessageCircle className="w-3 h-3 mr-1" />
                      Send
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Social Media & Web */}
          {(contact.website || contact.linkedIn) && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Online Presence
                </h3>
                <div className="flex flex-wrap gap-2">
                  {contact.website && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="hover:bg-primary/10 hover:border-primary"
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
                      className="hover:bg-blue-500/10 hover:border-blue-500"
                    >
                      <a href={contact.linkedIn} target="_blank" rel="noopener noreferrer">
                        <Linkedin className="w-4 h-4 mr-2" />
                        LinkedIn
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Address */}
          <div>
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Address
            </h3>
            <div className="p-4 bg-secondary/20 rounded-lg">
              <div className="text-sm">
                <div>{contact.address.street}</div>
                <div>
                  {contact.address.city}, {contact.address.state} - {contact.address.pincode}
                </div>
                <div>{contact.address.country}</div>
              </div>
            </div>
          </div>

          {/* GST & PAN */}
          {(contact.gstNumber || contact.panNumber) && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Tax Information
                </h3>
                <div className="grid gap-3">
                  {contact.gstNumber && (
                    <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg">
                      <FileText className="w-5 h-5 text-primary" />
                      <div>
                        <div className="text-xs text-muted-foreground">GST Number</div>
                        <div className="text-sm font-mono font-medium">{contact.gstNumber}</div>
                      </div>
                    </div>
                  )}
                  {contact.panNumber && (
                    <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg">
                      <FileText className="w-5 h-5 text-primary" />
                      <div>
                        <div className="text-xs text-muted-foreground">PAN Number</div>
                        <div className="text-sm font-mono font-medium">{contact.panNumber}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Additional Details */}
          <div>
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Additional Details
            </h3>
            <div className="grid gap-3">
              <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg">
                <User className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-xs text-muted-foreground">Assigned To</div>
                  <div className="text-sm font-medium">{contact.assignedTo}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg">
                <Calendar className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-xs text-muted-foreground">Created</div>
                  <div className="text-sm font-medium">{format(contact.createdAt, 'PPP')}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg">
                <Calendar className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-xs text-muted-foreground">Last Updated</div>
                  <div className="text-sm font-medium">{format(contact.updatedAt, 'PPP')}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {contact.notes && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-foreground mb-3">Notes</h3>
                <p className="text-sm text-muted-foreground bg-secondary/20 p-4 rounded-lg">
                  {contact.notes}
                </p>
              </div>
            </>
          )}

          {/* Tags */}
          {contact.tags.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Tag className="w-5 h-5" />
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {contact.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-sm">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 flex-wrap">
            <Button className="flex-1">
              <PhoneCall className="w-4 h-4 mr-2" />
              Call Contact
            </Button>
            <Button className="flex-1" variant="outline">
              <Mail className="w-4 h-4 mr-2" />
              Send Email
            </Button>
            {contact.whatsapp && (
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => setWhatsappModalOpen(true)}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
            )}
            <Button className="flex-1" variant="outline">
              <Video className="w-4 h-4 mr-2" />
              Schedule Meet
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
