import { useState, useEffect, useRef } from 'react';
import { dealsAPI, pipelineStagesAPI } from '@/lib/api';
import { defaultPipelineStages, PipelineStage, PipelineStageConfig, Deal } from '@/types/pipeline';
import { DealCard } from '@/components/pipeline/DealCard';
import { DealListView } from '@/components/pipeline/DealListView';
import { StageColumn } from '@/components/pipeline/StageColumn';
import { DealDialog } from '@/components/pipeline/DealDialog';
import { PipelineSettings } from '@/components/pipeline/PipelineSettings';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { exportDealsToCSV, importDealsFromCSV } from '@/lib/csvUtils';
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
  Upload,
  IndianRupee,
  TrendingUp,
  Target,
  Trophy,
  Loader2,
  LayoutGrid,
  List,
  Settings,
  Search,
} from 'lucide-react';
import { ProtectedFeature } from '@/components/auth/ProtectedFeature';

export default function Pipeline() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [stages, setStages] = useState<PipelineStageConfig[]>(defaultPipelineStages);
  const [loading, setLoading] = useState(true);
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [originalDealStage, setOriginalDealStage] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [selectedStage, setSelectedStage] = useState<string>('lead');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch stages and deals from API
  useEffect(() => {
    fetchStagesAndDeals();
  }, []);

  const fetchStagesAndDeals = async () => {
    try {
      setLoading(true);
      const [stagesData, dealsResponse] = await Promise.all([
        pipelineStagesAPI.getAll().catch(() => defaultPipelineStages),
        dealsAPI.getAll({ limit: 10000 }) // Get all deals for pipeline view
      ]);

      // Handle paginated response
      const dealsData = dealsResponse.data || dealsResponse;

      // Convert date strings to Date objects for stages
      const stagesWithDates = stagesData.map(s => ({
        ...s,
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt)
      }));

      setStages(stagesWithDates.sort((a, b) => a.order - b.order));
      setDeals(dealsData);
    } catch (error) {
      toast.error('Failed to load pipeline data');
      console.error('Error fetching pipeline data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeals = async () => {
    try {
      const response = await dealsAPI.getAll({ limit: 10000 });
      const data = response.data || response;
      setDeals(data);
    } catch (error) {
      toast.error('Failed to load deals');
      console.error('Error fetching deals:', error);
    }
  };

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

  const getDealsByStage = (slug: string, dealsToFilter = deals) => {
    return dealsToFilter.filter(deal => deal.stage === slug);
  };

  const getStageValue = (slug: string) => {
    return deals
      .filter(deal => deal.stage === slug)
      .reduce((sum, deal) => sum + deal.value, 0);
  };

  // Filter deals based on search query
  const getFilteredDeals = () => {
    if (!searchQuery.trim()) return deals;

    const query = searchQuery.toLowerCase();
    return deals.filter(deal =>
      deal.title?.toLowerCase().includes(query) ||
      deal.company?.toLowerCase().includes(query) ||
      deal.contactName?.toLowerCase().includes(query) ||
      deal.email?.toLowerCase().includes(query)
    );
  };

  const filteredDeals = getFilteredDeals();

  const handleDragStart = (event: DragStartEvent) => {
    const deal = deals.find(d => d.id === event.active.id);
    setActiveDeal(deal || null);
    // Store the original stage before dragging
    if (deal) {
      setOriginalDealStage(deal.stage);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeDeal = deals.find(d => d.id === active.id);
    if (!activeDeal) return;

    let targetStage: string | null = null;

    // Check if we're over a stage column directly
    const stageConfig = stages.find(s => s.id === over.id);
    if (stageConfig) {
      targetStage = stageConfig.slug;
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    // Get the deal that was dragged
    const activeDeal = deals.find(d => d.id === active.id);

    // Reset drag state
    setActiveDeal(null);

    if (!over || !activeDeal || !originalDealStage) {
      setOriginalDealStage(null);
      return;
    }

    let targetStage: string | null = null;

    // Check if we're over a stage column directly
    const stageConfig = stages.find(s => s.id === over.id);
    if (stageConfig) {
      targetStage = stageConfig.slug;
    } else {
      // We're over a deal, find which stage it belongs to
      const overDeal = deals.find(d => d.id === over.id);
      if (overDeal) {
        targetStage = overDeal.stage;
      }
    }

    // Update the deal's stage if it changed from the original
    if (targetStage && originalDealStage !== targetStage) {
      const stageName = stages.find(s => s.slug === targetStage)?.name;

      try {
        // Update in backend
        console.log('🎯 Updating deal via drag-and-drop:', activeDeal.id);
        console.log('📤 Stage update:', originalDealStage, '→', targetStage);
        const updatedDeal = await dealsAPI.update(activeDeal.id, { stage: targetStage });

        // Update local state with the backend response to ensure consistency
        setDeals(prevDeals =>
          prevDeals.map(d =>
            d.id === activeDeal.id ? { ...updatedDeal, updatedAt: new Date(updatedDeal.updatedAt) } : d
          )
        );

        toast.success(`Deal moved to ${stageName}!`);
        console.log('✅ Deal stage updated successfully');
      } catch (error) {
        // Revert on error - restore to original stage
        setDeals(prevDeals =>
          prevDeals.map(d =>
            d.id === activeDeal.id ? { ...d, stage: originalDealStage } : d
          )
        );
        toast.error('Failed to update deal. Please try again.');
        console.error('Error updating deal stage:', error);
      }
    }

    // Reset original stage
    setOriginalDealStage(null);
  };

  const handleAddDeal = (slug: string) => {
    setSelectedDeal(null);
    setSelectedStage(slug);
    setDialogOpen(true);
  };

  const handleEditDeal = (deal: Deal) => {
    setSelectedDeal(deal);
    setDialogOpen(true);
  };

  const handleDeleteDeal = async (deal: Deal) => {
    if (window.confirm(`Are you sure you want to delete "${deal.title}"?`)) {
      try {
        await dealsAPI.delete(deal.id);
        toast.success('Deal deleted successfully!');
        fetchDeals();
      } catch (error) {
        toast.error('Failed to delete deal. Please try again.');
        console.error('Error deleting deal:', error);
      }
    }
  };

  const handleSaveDeal = async (dealData: Partial<Deal>) => {
    try {
      if (selectedDeal) {
        // Update existing deal
        console.log('🎯 Updating deal via dialog:', selectedDeal.id);
        console.log('📤 Deal data being sent:', dealData);
        console.log('🔄 Stage in update:', dealData.stage);
        await dealsAPI.update(selectedDeal.id, dealData);
        toast.success('Deal updated successfully!');
      } else {
        // Create new deal
        const newDeal: Partial<Deal> = {
          title: dealData.title || '',
          company: dealData.company || '',
          contactName: dealData.contactName || '',
          stage: dealData.stage || selectedStage,
          value: dealData.value || 0,
          probability: dealData.probability || 50,
          expectedCloseDate: dealData.expectedCloseDate || new Date(),
          assignedTo: dealData.assignedTo || 'Priya Sharma',
          notes: dealData.notes || '',
          tags: dealData.tags || [],
        };
        await dealsAPI.create(newDeal);
        toast.success('Deal created successfully!');
      }
      // Refresh the deals list
      fetchDeals();
    } catch (error) {
      toast.error('Failed to save deal. Please try again.');
      console.error('Error saving deal:', error);
    }
  };

  const handleExport = () => {
    exportDealsToCSV(deals, `pipeline-export-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`${deals.length} deals exported successfully!`);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const importedDeals = await importDealsFromCSV(file);

      // Create all imported deals in the backend
      for (const deal of importedDeals) {
        await dealsAPI.create(deal);
      }

      toast.success(`${importedDeals.length} deals imported successfully!`);

      // Refresh the deals list
      fetchDeals();
    } catch (error) {
      toast.error('Failed to import deals. Please check the file format.');
      console.error('Import error:', error);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="relative p-6 space-y-6 max-w-full overflow-hidden">
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
              <Button variant="outline" onClick={() => setSettingsOpen(true)}>
                <Settings className="w-4 h-4 mr-2" />
                Manage Stages
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImport}
                accept=".csv"
                className="hidden"
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                Import CSV
              </Button>
              <ProtectedFeature permission="deals:export">
                <Button variant="outline" onClick={handleExport}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </ProtectedFeature>
              {/* Deal creation removed - deals are auto-created from leads */}
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

        {/* Search and View Toggle */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search deals by title, company, contact..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'board' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('board')}
            >
              <LayoutGrid className="w-4 h-4 mr-2" />
              Board
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4 mr-2" />
              List
            </Button>
          </div>
        </div>

        {/* Pipeline Board/List View */}
        {loading ? (
          <Card className="p-12 text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Loading pipeline...</h3>
            <p className="text-muted-foreground">
              Please wait while we fetch your deals
            </p>
          </Card>
        ) : viewMode === 'board' ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="overflow-x-auto -mx-6 px-6">
              <div className="flex gap-4 pb-4" style={{ width: 'fit-content' }}>
                {stages.map(stage => (
                  <StageColumn
                    key={stage.id}
                    stage={stage}
                    deals={getDealsByStage(stage.slug, filteredDeals)}
                    onEditDeal={handleEditDeal}
                    onDeleteDeal={handleDeleteDeal}
                  />
                ))}
              </div>
            </div>

            <DragOverlay>
              {activeDeal ? <DealCard deal={activeDeal} /> : null}
            </DragOverlay>
          </DndContext>
        ) : (
          <DealListView
            deals={filteredDeals}
            onDealClick={handleEditDeal}
            onDeleteDeal={handleDeleteDeal}
          />
        )}

        {/* Deal Dialog */}
        <DealDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSave={handleSaveDeal}
          initialStage={selectedStage}
          deal={selectedDeal}
        />

        <PipelineSettings
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          onUpdate={fetchStagesAndDeals}
        />
      </div>
    </div>
  );
}
