import { mockDeals } from '@/lib/mockData';
import { defaultPipelineStages, PipelineStage } from '@/types/pipeline';
import { DealCard } from '@/components/pipeline/DealCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Plus,
  Filter,
  Download,
  IndianRupee,
  TrendingUp,
  Target,
  Trophy,
} from 'lucide-react';
import { ProtectedFeature } from '@/components/auth/ProtectedFeature';

export default function Pipeline() {
  const stats = {
    totalValue: mockDeals
      .filter(d => !['closed-lost'].includes(d.stage))
      .reduce((sum, d) => sum + d.value, 0),
    wonValue: mockDeals
      .filter(d => d.stage === 'closed-won')
      .reduce((sum, d) => sum + d.value, 0),
    activeDeals: mockDeals.filter(d => !['closed-won', 'closed-lost'].includes(d.stage)).length,
    closingThisMonth: mockDeals.filter(
      d =>
        !['closed-won', 'closed-lost'].includes(d.stage) &&
        d.expectedCloseDate.getTime() < Date.now() + 30 * 24 * 60 * 60 * 1000
    ).length,
  };

  const getDealsByStage = (stage: PipelineStage) => {
    return mockDeals.filter(deal => deal.stage === stage);
  };

  const getStageValue = (stage: PipelineStage) => {
    return getDealsByStage(stage).reduce((sum, deal) => sum + deal.value, 0);
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
                Manage deals through customizable sales stages
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <ProtectedFeature permission="deals:export">
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </ProtectedFeature>
              <ProtectedFeature permission="deals:create">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Deal
                </Button>
              </ProtectedFeature>
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

        {/* Pipeline Board */}
        <div className="overflow-x-auto">
          <div className="flex gap-4 min-w-max pb-4">
            {defaultPipelineStages.map(stage => {
              const deals = getDealsByStage(stage.id);
              const stageValue = getStageValue(stage.id);

              return (
                <div key={stage.id} className="flex-shrink-0 w-[320px]">
                  <Card className="p-4">
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

                    <div className="space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto">
                      {deals.map(deal => (
                        <DealCard key={deal.id} deal={deal} />
                      ))}
                      {deals.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          No deals in this stage
                        </div>
                      )}
                    </div>

                    <ProtectedFeature permission="deals:create">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-3 text-muted-foreground hover:text-foreground"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Deal
                      </Button>
                    </ProtectedFeature>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
