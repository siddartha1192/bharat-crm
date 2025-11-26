import { useState } from 'react';
import { mockDeals } from '@/lib/mockData';
import { defaultPipelineStages, PipelineStage, Deal } from '@/types/pipeline';
import { DealCard } from '@/components/pipeline/DealCard';
import { DealDialog } from '@/components/pipeline/DealDialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import {
  Plus,
  Filter,
  Download,
  IndianRupee,
  TrendingUp,
  Target,
  Trophy,
} from 'lucide-react';

export default function Pipeline() {
  const [deals, setDeals] = useState<Deal[]>(mockDeals);
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [selectedStage, setSelectedStage] = useState<PipelineStage>('lead');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const stats = {
    totalValue: deals
      .filter(d => !['closed-lost'].includes(d.stage))
      .reduce((sum, d) => sum + d.value, 0),
    wonValue: deals
      .filter(d => d.stage === 'closed-won')
      .reduce((sum, d) => sum + d.value, 0),
    activeDeals: deals.filter(d => !['closed-won', 'closed-lost'].includes(d.stage)).length,
    closingThisMonth: deals.filter(
      d =>
        !['closed-won', 'closed-lost'].includes(d.stage) &&
        d.expectedCloseDate.getTime() < Date.now() + 30 * 24 * 60 * 60 * 1000
    ).length,
  };

  const getDealsByStage = (stage: PipelineStage) => {
    return deals.filter(deal => deal.stage === stage);
  };

  const getStageValue = (stage: PipelineStage) => {
    return getDealsByStage(stage).reduce((sum, deal) => sum + deal.value, 0);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const deal = deals.find(d => d.id === event.active.id);
    setActiveDeal(deal || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeDeal = deals.find(d => d.id === active.id);
    if (!activeDeal) return;

    // Check if we're over a stage column
    const overStage = over.id as PipelineStage;
    if (defaultPipelineStages.some(s => s.id === overStage) && activeDeal.stage !== overStage) {
      setDeals(prevDeals =>
        prevDeals.map(d =>
          d.id === activeDeal.id ? { ...d, stage: overStage, updatedAt: new Date() } : d
        )
      );
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDeal(null);

    const { active, over } = event;
    if (!over) return;

    const activeDeal = deals.find(d => d.id === active.id);
    if (!activeDeal) return;

    const overStage = over.id as PipelineStage;
    if (defaultPipelineStages.some(s => s.id === overStage)) {
      toast.success(`Deal moved to ${defaultPipelineStages.find(s => s.id === overStage)?.name}`);
    }
  };

  const handleAddDeal = (stage: PipelineStage) => {
    setSelectedDeal(null);
    setSelectedStage(stage);
    setDialogOpen(true);
  };

  const handleEditDeal = (deal: Deal) => {
    setSelectedDeal(deal);
    setDialogOpen(true);
  };

  const handleSaveDeal = (dealData: Partial<Deal>) => {
    if (selectedDeal) {
      // Update existing deal
      setDeals(prevDeals =>
        prevDeals.map(d =>
          d.id === selectedDeal.id
            ? { ...d, ...dealData, updatedAt: new Date() }
            : d
        )
      );
      toast.success('Deal updated successfully!');
    } else {
      // Create new deal
      const newDeal: Deal = {
        id: `D${(deals.length + 1).toString().padStart(3, '0')}`,
        title: dealData.title || '',
        company: dealData.company || '',
        contactName: dealData.contactName || '',
        stage: dealData.stage || selectedStage,
        value: dealData.value || 0,
        probability: dealData.probability || 50,
        expectedCloseDate: dealData.expectedCloseDate || new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        assignedTo: dealData.assignedTo || 'Priya Sharma',
        notes: dealData.notes || '',
        tags: dealData.tags || [],
        nextAction: dealData.nextAction || '',
        source: dealData.source || 'website',
      };
      setDeals(prevDeals => [...prevDeals, newDeal]);
      toast.success('Deal created successfully!');
    }
  };

  const handleExport = () => {
    // Create CSV content
    const headers = ['ID', 'Title', 'Company', 'Contact', 'Stage', 'Value (₹)', 'Probability (%)', 'Expected Close', 'Assigned To', 'Next Action'];
    const rows = deals.map(d => [
      d.id,
      d.title,
      d.company,
      d.contactName,
      d.stage,
      d.value.toString(),
      d.probability.toString(),
      d.expectedCloseDate.toLocaleDateString('en-IN'),
      d.assignedTo,
      d.nextAction,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `pipeline-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Pipeline exported successfully!');
  };

  return (
    <div className="min-h-screen relative">
      {/* Tricolor Background */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="h-1/3 bg-gradient-to-b from-primary to-primary/50" />
        <div className="h-1/3 bg-gradient-to-b from-background/80 to-background" />
        <div className="h-1/3 bg-gradient-to-t from-success to-success/50" />
      </div>

      <div className="relative p-6 max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="relative">
          <div className="absolute -left-6 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-background to-success rounded-r" />
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Sales Pipeline</h1>
              <p className="text-muted-foreground">
                Drag and drop deals between stages to update your pipeline
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={() => handleAddDeal('lead')}>
                <Plus className="w-4 h-4 mr-2" />
                Add Deal
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Pipeline Value</p>
                <p className="text-2xl font-bold text-foreground">
                  ₹{(stats.totalValue / 100000).toFixed(1)}L
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                <IndianRupee className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Won This Month</p>
                <p className="text-2xl font-bold text-foreground">
                  ₹{(stats.wonValue / 100000).toFixed(1)}L
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Active Deals</p>
                <p className="text-2xl font-bold text-foreground">{stats.activeDeals}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-secondary to-secondary/80 flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Closing This Month</p>
                <p className="text-2xl font-bold text-foreground">{stats.closingThisMonth}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-warning to-warning/80 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>
        </div>

        {/* Pipeline Board with Drag and Drop */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="overflow-x-auto">
            <div className="flex gap-4 min-w-max pb-4">
              {defaultPipelineStages.map(stage => {
                const stageDeals = getDealsByStage(stage.id);
                const stageValue = getStageValue(stage.id);

                return (
                  <SortableContext
                    key={stage.id}
                    id={stage.id}
                    items={stageDeals.map(d => d.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="flex-shrink-0 w-[320px]">
                      <Card className="p-4">
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                              <h3 className="font-semibold text-foreground">{stage.name}</h3>
                              <Badge variant="secondary" className="text-xs">
                                {stageDeals.length}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <IndianRupee className="w-3 h-3" />
                            <span>₹{(stageValue / 100000).toFixed(1)}L</span>
                          </div>
                        </div>

                        <div className="space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto">
                          {stageDeals.map(deal => (
                            <DealCard
                              key={deal.id}
                              deal={deal}
                              onClick={() => handleEditDeal(deal)}
                            />
                          ))}
                          {stageDeals.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                              No deals in this stage
                            </div>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mt-3 text-muted-foreground hover:text-foreground"
                          onClick={() => handleAddDeal(stage.id)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Deal
                        </Button>
                      </Card>
                    </div>
                  </SortableContext>
                );
              })}
            </div>
          </div>

          <DragOverlay>
            {activeDeal ? <DealCard deal={activeDeal} /> : null}
          </DragOverlay>
        </DndContext>

        {/* Deal Dialog */}
        <DealDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSave={handleSaveDeal}
          initialStage={selectedStage}
          deal={selectedDeal}
        />
      </div>
    </div>
  );
}
