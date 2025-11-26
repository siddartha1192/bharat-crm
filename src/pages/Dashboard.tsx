import { mockTasks, mockStats } from '@/lib/mockData';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { TaskCard } from '@/components/tasks/TaskCard';
import { 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function Dashboard() {
  const upcomingTasks = mockTasks
    .filter(t => t.status !== 'completed')
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .slice(0, 3);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's your task overview</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Tasks"
          value={mockStats.total}
          icon={CheckCircle2}
          colorClass="bg-gradient-to-br from-primary to-primary/80"
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="In Progress"
          value={mockStats.inProgress}
          icon={Clock}
          colorClass="bg-gradient-to-br from-secondary to-secondary/80"
        />
        <StatsCard
          title="Completed"
          value={mockStats.completed}
          icon={TrendingUp}
          colorClass="bg-gradient-to-br from-success to-success/80"
          trend={{ value: 8, isPositive: true }}
        />
        <StatsCard
          title="Due Today"
          value={mockStats.dueToday}
          icon={AlertCircle}
          colorClass="bg-gradient-to-br from-warning to-warning/80"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-1">Upcoming Tasks</h2>
              <p className="text-sm text-muted-foreground">Tasks due soon that need your attention</p>
            </div>
            <Button variant="ghost" size="sm">
              View All
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
          
          <div className="space-y-4">
            {upcomingTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-6">Quick Stats</h2>
          
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Completion Rate</span>
                <span className="text-sm font-bold text-foreground">
                  {Math.round((mockStats.completed / mockStats.total) * 100)}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-success to-success/80 transition-all"
                  style={{ width: `${(mockStats.completed / mockStats.total) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Active Tasks</span>
                <span className="text-sm font-bold text-foreground">
                  {mockStats.inProgress}/{mockStats.total}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-secondary to-secondary/80 transition-all"
                  style={{ width: `${(mockStats.inProgress / mockStats.total) * 100}%` }}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-3">Priority Distribution</p>
              <div className="space-y-2">
                {['urgent', 'high', 'medium', 'low'].map(priority => {
                  const count = mockTasks.filter(t => t.priority === priority).length;
                  return (
                    <div key={priority} className="flex items-center justify-between text-sm">
                      <span className="capitalize text-foreground">{priority}</span>
                      <span className="font-medium text-muted-foreground">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
