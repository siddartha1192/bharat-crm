import { Deal } from '@/types/pipeline';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Building2,
  IndianRupee,
  Calendar,
  TrendingUp,
  User,
  Target,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface DealCardProps {
  deal: Deal;
}

export function DealCard({ deal }: DealCardProps) {
  const probabilityColor =
    deal.probability >= 80
      ? 'text-green-600'
      : deal.probability >= 60
      ? 'text-amber-600'
      : 'text-blue-600';

  return (
    <Card className="p-4 hover:shadow-md transition-all cursor-pointer">
      <div className="space-y-3">
        <div>
          <h3 className="font-semibold text-foreground mb-1 line-clamp-2">
            {deal.title}
          </h3>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Building2 className="w-3 h-3" />
            <span className="truncate">{deal.company}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-lg font-bold text-primary">
            <IndianRupee className="w-4 h-4" />
            <span>₹{(deal.value / 1000).toFixed(0)}K</span>
          </div>
          <div className={`flex items-center gap-1 text-sm font-medium ${probabilityColor}`}>
            <TrendingUp className="w-3 h-3" />
            <span>{deal.probability}%</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="w-3 h-3" />
          <span>Close: {format(deal.expectedCloseDate, 'MMM dd')}</span>
        </div>

        {deal.nextAction && (
          <div className="p-2 bg-accent/10 rounded text-xs text-muted-foreground">
            <div className="flex items-center gap-1 mb-1">
              <Target className="w-3 h-3" />
              <span className="font-medium">Next Action:</span>
            </div>
            <p className="line-clamp-2">{deal.nextAction}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-1">
          {deal.tags.slice(0, 2).map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {deal.tags.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{deal.tags.length - 2}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-semibold">
                {deal.assignedTo.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">{deal.assignedTo}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(deal.updatedAt, { addSuffix: true })}
          </span>
        </div>
      </div>
    </Card>
  );
}
