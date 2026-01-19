import { useState, useEffect } from 'react';
import { leadsAPI, dealsAPI, pipelineStagesAPI } from '@/lib/api';
import { Lead } from '@/types/lead';
import { Deal } from '@/types/pipeline';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { exportLeadsToCSV, exportDealsToCSV } from '@/lib/csvUtils';
import { downloadHTMLReport } from '@/lib/htmlReportUtils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProtectedFeature } from '@/components/auth/ProtectedFeature';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Download,
  TrendingUp,
  IndianRupee,
  Target,
  Users,
  Calendar,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface PipelineStage {
  id: string;
  name: string;
  slug: string;
  color: string;
  order: number;
  stageType: 'LEAD' | 'DEAL' | 'BOTH';
  isActive: boolean;
  isWonStage?: boolean;
  isLostStage?: boolean;
}

export default function Reports() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch data from API
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [leadsResponse, dealsResponse, stagesData] = await Promise.all([
        leadsAPI.getAll({ limit: 10000 }), // Get all leads for reports
        dealsAPI.getAll({ limit: 10000 }), // Get all deals for reports
        pipelineStagesAPI.getAll() // Get pipeline stages
      ]);

      // Handle paginated responses
      const leadsData = leadsResponse.data || leadsResponse;
      const dealsData = dealsResponse.data || dealsResponse;

      setLeads(leadsData);
      setDeals(dealsData);
      setPipelineStages(stagesData.filter((s: PipelineStage) => s.isActive));
    } catch (error) {
      toast.error('Failed to load report data. Please check if the backend is running.');
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };
  // Lead Source Distribution
  const leadSourceData = [
    {
      name: 'Web Form',
      value: leads.filter(l => l.source === 'web-form').length,
      color: '#FF9933',
    },
    {
      name: 'WhatsApp',
      value: leads.filter(l => l.source === 'whatsapp').length,
      color: '#25D366',
    },
    {
      name: 'Call',
      value: leads.filter(l => l.source === 'call').length,
      color: '#000080',
    },
    {
      name: 'Email',
      value: leads.filter(l => l.source === 'email').length,
      color: '#138808',
    },
    {
      name: 'Referral',
      value: leads.filter(l => l.source === 'referral').length,
      color: '#FFA500',
    },
    {
      name: 'Missed Call',
      value: leads.filter(l => l.source === 'missed-call').length,
      color: '#800080',
    },
  ];

  // Pipeline Value by Stage - DYNAMIC based on actual pipeline stages
  const pipelineData = pipelineStages
    .filter(stage => stage.stageType === 'DEAL' || stage.stageType === 'BOTH')
    .sort((a, b) => a.order - b.order)
    .map(stage => {
      const stageDeals = deals.filter(d => d.stageId === stage.id);
      return {
        stage: stage.name,
        value: stageDeals.reduce((sum, d) => sum + d.value, 0) / 100000,
        count: stageDeals.length,
        color: stage.color,
      };
    })
    .filter(d => d.count > 0); // Only show stages with deals

  // Lead Status Distribution - DYNAMIC based on actual pipeline stages
  const leadStatusData = pipelineStages
    .filter(stage => stage.stageType === 'LEAD' || stage.stageType === 'BOTH')
    .sort((a, b) => a.order - b.order)
    .map(stage => {
      const stageLeads = leads.filter(l => l.stageId === stage.id);
      return {
        name: stage.name,
        value: stageLeads.length,
        color: `#${stage.color}`,
      };
    })
    .filter(d => d.value > 0); // Only show stages with leads

  // Get won and lost stage IDs for dynamic filtering
  // First try explicit flags, then fall back to slug-based detection
  let wonStageIds = pipelineStages.filter(s => s.isWonStage).map(s => s.id);
  let lostStageIds = pipelineStages.filter(s => s.isLostStage).map(s => s.id);

  // FALLBACK: If no stages are explicitly marked, detect by slug pattern
  if (wonStageIds.length === 0) {
    wonStageIds = pipelineStages.filter(s => s.slug?.includes('won')).map(s => s.id);
  }
  if (lostStageIds.length === 0) {
    lostStageIds = pipelineStages.filter(s => s.slug?.includes('lost')).map(s => s.id);
  }

  // Monthly Performance - Calculate from real data
  const getMonthlyData = () => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const last6Months: any[] = [];

    // Generate last 6 months data
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = monthNames[date.getMonth()];

      // Count leads created in this month
      const monthLeads = leads.filter(l => {
        const leadDate = new Date(l.createdAt);
        return leadDate.getFullYear() === date.getFullYear() &&
               leadDate.getMonth() === date.getMonth();
      }).length;

      // Count won deals in this month (using dynamic won stages)
      const monthDeals = deals.filter(d => {
        if (!wonStageIds.includes(d.stageId)) return false;
        const dealDate = new Date(d.updatedAt);
        return dealDate.getFullYear() === date.getFullYear() &&
               dealDate.getMonth() === date.getMonth();
      }).length;

      // Calculate revenue from won deals in this month (using dynamic won stages)
      const monthRevenue = deals
        .filter(d => {
          if (!wonStageIds.includes(d.stageId)) return false;
          const dealDate = new Date(d.updatedAt);
          return dealDate.getFullYear() === date.getFullYear() &&
                 dealDate.getMonth() === date.getMonth();
        })
        .reduce((sum, d) => sum + d.value, 0) / 100000;

      last6Months.push({
        month: monthName,
        leads: monthLeads,
        deals: monthDeals,
        revenue: parseFloat(monthRevenue.toFixed(1)),
      });
    }

    return last6Months;
  };

  const monthlyData = getMonthlyData();

  // Calculate stats using dynamic stage mapping
  const wonDealsCount = deals.filter(d => wonStageIds.includes(d.stageId)).length;
  const wonDealsRevenue = deals.filter(d => wonStageIds.includes(d.stageId)).reduce((sum, d) => sum + d.value, 0);

  const stats = {
    totalLeads: leads.length,
    // Conversion Rate = Won Deals / Total Leads (if no won stage or zero won deals, show 0)
    conversionRate: (leads.length > 0 && wonDealsCount > 0)
      ? ((wonDealsCount / leads.length) * 100).toFixed(1)
      : '0.0',
    avgDealSize: deals.length > 0 ? (deals.reduce((sum, d) => sum + d.value, 0) / deals.length / 100000).toFixed(1) : '0.0',
    totalRevenue: (wonDealsRevenue / 100000).toFixed(1),
  };

  const handleExportLeads = () => {
    exportLeadsToCSV(leads, `leads-report-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`${leads.length} leads exported successfully!`);
  };

  const handleExportDeals = () => {
    exportDealsToCSV(deals, `deals-report-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`${deals.length} deals exported successfully!`);
  };

  const handleExportAll = () => {
    handleExportLeads();
    handleExportDeals();
    toast.success('All reports exported successfully!');
  };

  const handleExportHTML = () => {
    const reportDate = new Date().toISOString().split('T')[0];
    downloadHTMLReport(
      { leads, deals, dateRange: 'Last 30 Days' },
      `sales-analytics-report-${reportDate}.html`
    );
    toast.success('HTML report generated successfully!');
  };

  return (
    <div className="min-h-screen bg-background">

      <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="relative">
          <div className="absolute -left-3 sm:-left-6 top-0 bottom-0 w-1 bg-primary rounded-r" />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Reports & Analytics</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Track your sales performance and conversion metrics
              </p>
            </div>
            <div className="flex gap-2">
              <Select defaultValue="30days">
                <SelectTrigger className="w-[180px]">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="90days">Last 90 Days</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
              <ProtectedFeature permission="reports:export">
                <Button variant="outline" onClick={handleExportHTML}>
                  <Download className="w-4 h-4 mr-2" />
                  Export HTML Report
                </Button>
              </ProtectedFeature>
            </div>
          </div>
        </div>

        {loading ? (
          <Card className="p-12 text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Loading report data...</h3>
            <p className="text-muted-foreground">
              Please wait while we analyze your data
            </p>
          </Card>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Leads</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalLeads}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Conversion Rate</p>
                <p className="text-2xl font-bold text-foreground">{stats.conversionRate}%</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Avg Deal Size</p>
                <p className="text-2xl font-bold text-foreground">₹{stats.avgDealSize}L</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-foreground">₹{stats.totalRevenue}L</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-warning to-warning/80 flex items-center justify-center">
                <IndianRupee className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pipeline Value by Stage */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Pipeline Value by Stage
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={pipelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="stage" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="value" fill="#FF9933" name="Value (₹L)" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Lead Source Distribution */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Lead Source Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={leadSourceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {leadSourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Monthly Performance Trend */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Monthly Performance Trend
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="leads" stroke="#FF9933" name="Leads" strokeWidth={2} />
                <Line type="monotone" dataKey="deals" stroke="#138808" name="Deals" strokeWidth={2} />
                <Line type="monotone" dataKey="revenue" stroke="#000080" name="Revenue (₹L)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Lead Status Distribution */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Lead Status Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={leadStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {leadStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>
          </>
        )}
      </div>
    </div>
  );
}
