import { Deal } from '@/types/pipeline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Building2,
  User,
  IndianRupee,
  Calendar,
  TrendingUp,
  Edit,
  Trash2,
  Eye,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface DealListViewProps {
  deals: Deal[];
  onDealClick?: (deal: Deal) => void;
  onDeleteDeal?: (deal: Deal) => void;
}

const stageColors = {
  'lead': 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  'qualified': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'proposal': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  'negotiation': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  'closed-won': 'bg-green-500/10 text-green-600 border-green-500/20',
  'closed-lost': 'bg-red-500/10 text-red-600 border-red-500/20',
};

const stageLabels = {
  'lead': 'Lead',
  'qualified': 'Qualified',
  'proposal': 'Proposal',
  'negotiation': 'Negotiation',
  'closed-won': 'Closed Won',
  'closed-lost': 'Closed Lost',
};

export function DealListView({ deals, onDealClick, onDeleteDeal }: DealListViewProps) {
  return (
    <div className="bg-card rounded-lg border">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-4 font-semibold text-sm">Deal</th>
              <th className="text-left p-4 font-semibold text-sm">Company</th>
              <th className="text-left p-4 font-semibold text-sm">Contact</th>
              <th className="text-left p-4 font-semibold text-sm">Stage</th>
              <th className="text-left p-4 font-semibold text-sm">Value</th>
              <th className="text-left p-4 font-semibold text-sm">Probability</th>
              <th className="text-left p-4 font-semibold text-sm">Close Date</th>
              <th className="text-left p-4 font-semibold text-sm">Assigned To</th>
              <th className="text-right p-4 font-semibold text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {deals.map((deal, index) => (
              <tr
                key={deal.id}
                className={`border-b hover:bg-muted/30 transition-colors cursor-pointer ${
                  index % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                }`}
                onClick={() => onDealClick?.(deal)}
              >
                <td className="p-4">
                  <div className="font-medium text-foreground">{deal.title}</div>
                  {deal.notes && (
                    <div className="text-sm text-muted-foreground line-clamp-1">
                      {deal.notes}
                    </div>
                  )}
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{deal.company}</span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>{deal.contactName}</span>
                  </div>
                </td>
                <td className="p-4">
                  <Badge className={`${stageColors[deal.stage]} border`}>
                    {stageLabels[deal.stage]}
                  </Badge>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-1 text-sm font-medium">
                    <IndianRupee className="w-4 h-4" />
                    {(deal.value / 100000).toFixed(1)}L
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{deal.probability}%</span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div>{format(deal.expectedCloseDate, 'MMM dd, yyyy')}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(deal.expectedCloseDate, { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-sm">
                  {deal.assignedTo || 'Unassigned'}
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-end gap-1">
                    {onDealClick && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDealClick(deal);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {onDeleteDeal && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteDeal(deal);
                        }}
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
