import { useState } from 'react';
import { mockDeals } from '@/lib/mockData';
import { defaultPipelineStages, PipelineStage, Deal } from '@/types/pipeline';
import { DealCard } from '@/components/pipeline/DealCard';
import { StageColumn } from '@/components/pipeline/StageColumn';
import { DealDialog } from '@/components/pipeline/DealDialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import {
  Plus,
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

  const handleDragStart = (event: DragStartEvent) => {
    const deal = deals.find(d => d.id === event.active.id);
    setActiveDeal(deal || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeDeal = deals.find(d => d.id === active.id);
    if (!activeDeal) return;

    let targetStage: PipelineStage | null = null;

    // Check if we're over a stage column directly
    if (defaultPipelineStages.some(s => s.id === over.id)) {
      targetStage = over.id as PipelineStage;
    } else {
      // We're over a deal, find which stage it belongs to
      const overDeal = deals.find(d => d.id === over.id);
      if (overDeal) {
        targetStage = overDeal.stage;
      }
    }

    // Update the deal's stage if it's different
    if (targetStage && activeDeal.stage !== targetStage) {
      setDeals(prevDeals =>
        prevDeals.map(d =>
          d.id === activeDeal.id ? { ...d, stage: targetStage, updatedAt: new Date() } : d
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

    let targetStage: PipelineStage | null = null;

    // Check if we're over a stage column directly
    if (defaultPipelineStages.some(s => s.id === over.id)) {
      targetStage = over.id as PipelineStage;
    } else {
      // We're over a deal, find which stage it belongs to
      const overDeal = deals.find(d => d.id === over.id);
      if (overDeal) {
        targetStage = overDeal.stage;
      }
    }

    // Update the deal's stage if it changed
    if (targetStage && activeDeal.stage !== targetStage) {
      setDeals(prevDeals =>
        prevDeals.map(d =>
          d.id === activeDeal.id ? { ...d, stage: targetStage, updatedAt: new Date() } : d
        )
      );
      const stageName = defaultPipelineStages.find(s => s.id === targetStage)?.name;
      toast.success(`Deal moved to ${stageName}!`);
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
    <div className="min-h-screen bg-background">

      <div className="relative p-6 max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="relative">
          <div className="absolute -left-6 top-0 bottom-0 w-1 bg-primary rounded-r" />
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
              {defaultPipelineStages.map(stage => (
                <StageColumn
                  key={stage.id}
                  stage={stage}
                  deals={getDealsByStage(stage.id)}
                  onAddDeal={() => handleAddDeal(stage.id)}
                  onEditDeal={handleEditDeal}
                />
              ))}
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
