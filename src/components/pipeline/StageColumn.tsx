import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, IndianRupee } from 'lucide-react';
import { Deal, PipelineStageConfig } from '@/types/pipeline';
import { DealCard } from './DealCard';

interface StageColumnProps {
  stage: PipelineStageConfig;
  deals: Deal[];
  onAddDeal: () => void;
  onEditDeal: (deal: Deal) => void;
  onDeleteDeal: (deal: Deal) => void;
}

export function StageColumn({ stage, deals, onAddDeal, onEditDeal, onDeleteDeal }: StageColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  });

  const stageValue = deals.reduce((sum, deal) => sum + deal.value, 0);

  return (
    <div className="flex-shrink-0 w-[320px]">
      <Card
        ref={setNodeRef}
        className={`p-4 transition-colors ${
          isOver ? 'ring-2 ring-primary bg-primary/5' : ''
        }`}
      >
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${stage.color}`} />
              <h3 className="font-semibold text-foreground">{stage.name}</h3>
              <Badge variant="secondary" className="text-xs">
                {deals.length}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <IndianRupee className="w-3 h-3" />
            <span>₹{(stageValue / 100000).toFixed(1)}L</span>
          </div>
        </div>

        <SortableContext
          items={deals.map(d => d.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto min-h-[200px]">
            {deals.map(deal => (
              <DealCard
                key={deal.id}
                deal={deal}
                onClick={() => onEditDeal(deal)}
                onDelete={onDeleteDeal}
              />
            ))}
            {deals.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No deals in this stage
              </div>
            )}
          </div>
        </SortableContext>

        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-3 text-muted-foreground hover:text-foreground"
          onClick={onAddDeal}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Deal
        </Button>
      </Card>
    </div>
  );
}
