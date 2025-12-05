import { Deal } from '@/types/pipeline';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Building2,
  IndianRupee,
  Calendar,
  TrendingUp,
  User,
  Target,
  GripVertical,
  Trash2,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface DealCardProps {
  deal: Deal;
  onClick?: () => void;
  onDelete?: (deal: Deal) => void;
}

export function DealCard({ deal, onClick, onDelete }: DealCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const probabilityColor =
    deal.probability >= 80
      ? 'text-green-600'
      : deal.probability >= 60
      ? 'text-amber-600'
      : 'text-blue-600';

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="p-4 hover:shadow-md transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing mt-1"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1 line-clamp-2">
                {deal.title}
              </h3>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Building2 className="w-3 h-3" />
                <span className="truncate">{deal.company}</span>
              </div>
            </div>
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(deal);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
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
      </div>
    </Card>
  );
}
