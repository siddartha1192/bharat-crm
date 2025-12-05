import { Contact } from '@/types/contact';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  IndianRupee,
  Edit,
  Trash2,
  Eye,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ContactListViewProps {
  contacts: Contact[];
  onViewProfile?: (contact: Contact) => void;
  onEdit?: (contact: Contact) => void;
  onDelete?: (contact: Contact) => void;
}

const typeColors = {
  'customer': 'bg-green-500/10 text-green-600 border-green-500/20',
  'prospect': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'partner': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  'vendor': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
};

export function ContactListView({ contacts, onViewProfile, onEdit, onDelete }: ContactListViewProps) {
  return (
    <div className="bg-card rounded-lg border">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-4 font-semibold text-sm">Name</th>
              <th className="text-left p-4 font-semibold text-sm">Company</th>
              <th className="text-left p-4 font-semibold text-sm">Contact</th>
              <th className="text-left p-4 font-semibold text-sm">Type</th>
              <th className="text-left p-4 font-semibold text-sm">Location</th>
              <th className="text-left p-4 font-semibold text-sm">Lifetime Value</th>
              <th className="text-left p-4 font-semibold text-sm">Created</th>
              <th className="text-right p-4 font-semibold text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact, index) => (
              <tr
                key={contact.id}
                className={`border-b hover:bg-muted/30 transition-colors ${
                  index % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                }`}
              >
                <td className="p-4">
                  <div className="font-medium text-foreground">{contact.name}</div>
                  <div className="text-sm text-muted-foreground">{contact.designation}</div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{contact.company}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{contact.companySize}</div>
                </td>
                <td className="p-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-3 h-3 text-muted-foreground" />
                      <span className="truncate max-w-[180px]">{contact.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-3 h-3 text-muted-foreground" />
                      <span>{contact.phone}</span>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <Badge className={`${typeColors[contact.type]} border`}>
                    {contact.type}
                  </Badge>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div>{contact.address.city}</div>
                      <div className="text-xs text-muted-foreground">{contact.address.state}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-1 text-sm font-medium">
                    <IndianRupee className="w-4 h-4" />
                    {(contact.lifetimeValue / 100000).toFixed(1)}L
                  </div>
                </td>
                <td className="p-4 text-sm text-muted-foreground">
                  {formatDistanceToNow(contact.createdAt, { addSuffix: true })}
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-end gap-1">
                    {onViewProfile && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onViewProfile(contact)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEdit(contact)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => onDelete(contact)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
