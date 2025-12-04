import { Lead } from '@/types/lead';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Building2,
  Mail,
  Phone,
  IndianRupee,
  Edit,
  Trash2,
  Eye,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface LeadListViewProps {
  leads: Lead[];
  onViewDetails?: (lead: Lead) => void;
  onEdit?: (lead: Lead) => void;
  onDelete?: (lead: Lead) => void;
}

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

export function LeadListView({ leads, onViewDetails, onEdit, onDelete }: LeadListViewProps) {
  return (
    <div className="bg-card rounded-lg border">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-4 font-semibold text-sm">Name</th>
              <th className="text-left p-4 font-semibold text-sm">Company</th>
              <th className="text-left p-4 font-semibold text-sm">Contact</th>
              <th className="text-left p-4 font-semibold text-sm">Status</th>
              <th className="text-left p-4 font-semibold text-sm">Priority</th>
              <th className="text-left p-4 font-semibold text-sm">Value</th>
              <th className="text-left p-4 font-semibold text-sm">Source</th>
              <th className="text-left p-4 font-semibold text-sm">Created</th>
              <th className="text-right p-4 font-semibold text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead, index) => {
              const getCreatedDate = () => {
                try {
                  return formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true });
                } catch {
                  return 'Recently';
                }
              };

              return (
              <tr
                key={lead.id}
                className={`border-b hover:bg-muted/30 transition-colors ${
                  index % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                }`}
              >
                <td className="p-4">
                  <div className="font-medium text-foreground">{lead.name || 'Unknown'}</div>
                  <div className="text-sm text-muted-foreground">{lead.assignedTo || 'Unassigned'}</div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{lead.company || 'No Company'}</span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-3 h-3 text-muted-foreground" />
                      <span className="truncate max-w-[180px]">{lead.email || 'No Email'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-3 h-3 text-muted-foreground" />
                      <span>{lead.phone || 'No Phone'}</span>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <Badge className={`${statusColors[lead.status] || statusColors.new} border`}>
                    {lead.status || 'new'}
                  </Badge>
                </td>
                <td className="p-4">
                  <Badge className={`${priorityColors[lead.priority] || priorityColors.medium} border`}>
                    {lead.priority || 'medium'}
                  </Badge>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-1 text-sm font-medium">
                    <IndianRupee className="w-4 h-4" />
                    {((lead.estimatedValue || 0) / 100000).toFixed(1)}L
                  </div>
                </td>
                <td className="p-4">
                  <span className="text-sm capitalize">{(lead.source || 'unknown').replace('-', ' ')}</span>
                </td>
                <td className="p-4 text-sm text-muted-foreground">
                  {getCreatedDate()}
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-end gap-1">
                    {onViewDetails && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onViewDetails(lead)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEdit(lead)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => onDelete(lead)}
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
