import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { leadsAPI, contactsAPI, invoicesAPI, tasksAPI } from '@/lib/api';
import { Task } from '@/types/task';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { TaskCard } from '@/components/tasks/TaskCard';
import {
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  Users,
  Building2,
  FileText,
  IndianRupee,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const [leadStats, setLeadStats] = useState({ total: 0, new: 0, qualified: 0, totalValue: 0 });
  const [contactStats, setContactStats] = useState({ total: 0, customers: 0, vendors: 0, totalLifetimeValue: 0 });
  const [invoiceStats, setInvoiceStats] = useState({ totalInvoices: 0, paidAmount: 0, pendingAmount: 0, overdueAmount: 0 });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllStats();
  }, []);

  const fetchAllStats = async () => {
    try {
      setLoading(true);
      const [leads, contacts, invoices, tasksResponse] = await Promise.all([
        leadsAPI.getStats(),
        contactsAPI.getStats(),
        invoicesAPI.getStats(),
        tasksAPI.getAll({ limit: 100 }) // Get tasks for dashboard
      ]);
      setLeadStats(leads);
      setContactStats(contacts);
      setInvoiceStats(invoices);

      // Handle paginated response
      const allTasks = tasksResponse.data || tasksResponse;
      setTasks(allTasks);
    } catch (error) {
      toast({
        title: "Error fetching stats",
        description: "Failed to load dashboard statistics. Please check if the backend is running.",
        variant: "destructive",
      });
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const upcomingTasks = tasks
    .filter(t => t.status !== 'completed')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 3);

  const handleViewAllTasks = () => {
    navigate('/tasks');
  };

  const handleTaskClick = (task: Task) => {
    // Navigate to tasks page - the Tasks page will handle opening the task dialog
    navigate('/tasks');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="relative">
          <div className="absolute -left-6 top-0 bottom-0 w-1 bg-primary rounded-r" />
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Dashboard
            </h1>
            <p className="text-muted-foreground">Welcome back! Here's your business overview</p>
          </div>
        </div>

      {loading ? (
        <Card className="p-12 text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Loading dashboard...</h3>
          <p className="text-muted-foreground">
            Please wait while we fetch your data
          </p>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Total Leads"
              value={leadStats.total}
              icon={Users}
              colorClass="bg-gradient-to-br from-primary to-primary/80"
            />
            <StatsCard
              title="Total Contacts"
              value={contactStats.total}
              icon={Building2}
              colorClass="bg-gradient-to-br from-secondary to-secondary/80"
            />
            <StatsCard
              title="Total Invoices"
              value={invoiceStats.totalInvoices}
              icon={FileText}
              colorClass="bg-gradient-to-br from-accent to-accent/80"
            />
            <StatsCard
              title="Paid Amount"
              value={`₹${(invoiceStats.paidAmount / 100000).toFixed(1)}L`}
              icon={IndianRupee}
              colorClass="bg-gradient-to-br from-success to-success/80"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">New Leads</p>
                  <p className="text-2xl font-bold text-foreground">{leadStats.new}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Customers</p>
                  <p className="text-2xl font-bold text-foreground">{contactStats.customers}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Pending Amount</p>
                  <p className="text-2xl font-bold text-foreground">₹{(invoiceStats.pendingAmount / 100000).toFixed(1)}L</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-warning to-warning/80 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Overdue Amount</p>
                  <p className="text-2xl font-bold text-foreground">₹{(invoiceStats.overdueAmount / 100000).toFixed(1)}L</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-destructive to-destructive/80 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
              </div>
            </Card>
          </div>
        </>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-1">Upcoming Tasks</h2>
              <p className="text-sm text-muted-foreground">Tasks due soon that need your attention</p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleViewAllTasks}>
              View All
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <div className="space-y-4">
            {upcomingTasks.length > 0 ? (
              upcomingTasks.map(task => (
                <TaskCard key={task.id} task={task} onClick={() => handleTaskClick(task)} />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No upcoming tasks</p>
                <p className="text-sm mt-2">You're all caught up! 🎉</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-6">Business Metrics</h2>

          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Lead Conversion Rate</span>
                <span className="text-sm font-bold text-foreground">
                  {leadStats.total > 0 ? Math.round((leadStats.qualified / leadStats.total) * 100) : 0}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-success to-success/80 transition-all"
                  style={{ width: `${leadStats.total > 0 ? (leadStats.qualified / leadStats.total) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Invoice Payment Rate</span>
                <span className="text-sm font-bold text-foreground">
                  {invoiceStats.totalInvoices > 0
                    ? Math.round((invoiceStats.paidAmount / (invoiceStats.paidAmount + invoiceStats.pendingAmount + invoiceStats.overdueAmount)) * 100)
                    : 0}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all"
                  style={{ width: `${invoiceStats.totalInvoices > 0
                    ? (invoiceStats.paidAmount / (invoiceStats.paidAmount + invoiceStats.pendingAmount + invoiceStats.overdueAmount)) * 100
                    : 0}%` }}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-3">CRM Overview</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground">Total Leads</span>
                  <span className="font-medium text-muted-foreground">{leadStats.total}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground">Total Contacts</span>
                  <span className="font-medium text-muted-foreground">{contactStats.total}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground">Total Invoices</span>
                  <span className="font-medium text-muted-foreground">{invoiceStats.totalInvoices}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground">Pipeline Value</span>
                  <span className="font-medium text-muted-foreground">₹{(leadStats.totalValue / 100000).toFixed(1)}L</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
      </div>
    </div>
  );
}
