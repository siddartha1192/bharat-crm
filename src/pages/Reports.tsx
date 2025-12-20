import { useState, useEffect } from 'react';
import { leadsAPI, dealsAPI } from '@/lib/api';
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

export default function Reports() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch data from API
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [leadsResponse, dealsResponse] = await Promise.all([
        leadsAPI.getAll({ limit: 10000 }), // Get all leads for reports
        dealsAPI.getAll({ limit: 10000 }) // Get all deals for reports
      ]);

      // Handle paginated responses
      const leadsData = leadsResponse.data || leadsResponse;
      const dealsData = dealsResponse.data || dealsResponse;

      setLeads(leadsData);
      setDeals(dealsData);
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

  // Pipeline Value by Stage
  const pipelineData = [
    {
      stage: 'Lead',
      value: deals.filter(d => d.stage === 'lead').reduce((sum, d) => sum + d.value, 0) / 100000,
      count: deals.filter(d => d.stage === 'lead').length,
    },
    {
      stage: 'Qualified',
      value: deals.filter(d => d.stage === 'qualified').reduce((sum, d) => sum + d.value, 0) / 100000,
      count: deals.filter(d => d.stage === 'qualified').length,
    },
    {
      stage: 'Proposal',
      value: deals.filter(d => d.stage === 'proposal').reduce((sum, d) => sum + d.value, 0) / 100000,
      count: deals.filter(d => d.stage === 'proposal').length,
    },
    {
      stage: 'Negotiation',
      value: deals.filter(d => d.stage === 'negotiation').reduce((sum, d) => sum + d.value, 0) / 100000,
      count: deals.filter(d => d.stage === 'negotiation').length,
    },
    {
      stage: 'Won',
      value: deals.filter(d => d.stage === 'closed-won').reduce((sum, d) => sum + d.value, 0) / 100000,
      count: deals.filter(d => d.stage === 'closed-won').length,
    },
  ];

  // Lead Status Distribution
  const leadStatusData = [
    { name: 'New', value: leads.filter(l => l.status === 'new').length, color: '#3b82f6' },
    { name: 'Contacted', value: leads.filter(l => l.status === 'contacted').length, color: '#8b5cf6' },
    { name: 'Qualified', value: leads.filter(l => l.status === 'qualified').length, color: '#06b6d4' },
    { name: 'Proposal', value: leads.filter(l => l.status === 'proposal').length, color: '#f59e0b' },
    { name: 'Won', value: leads.filter(l => l.status === 'won').length, color: '#138808' },
  ];

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

      // Count won deals in this month (closed-won)
      const monthDeals = deals.filter(d => {
        if (d.stage !== 'closed-won') return false;
        const dealDate = new Date(d.updatedAt);
        return dealDate.getFullYear() === date.getFullYear() &&
               dealDate.getMonth() === date.getMonth();
      }).length;

      // Calculate revenue from won deals in this month
      const monthRevenue = deals
        .filter(d => {
          if (d.stage !== 'closed-won') return false;
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

  const stats = {
    totalLeads: leads.length,
    conversionRate: leads.length > 0 ? ((leads.filter(l => l.status === 'won').length / leads.length) * 100).toFixed(1) : '0.0',
    avgDealSize: deals.length > 0 ? (deals.reduce((sum, d) => sum + d.value, 0) / deals.length / 100000).toFixed(1) : '0.0',
    totalRevenue: (deals.filter(d => d.stage === 'closed-won').reduce((sum, d) => sum + d.value, 0) / 100000).toFixed(1),
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

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="relative">
          <div className="absolute -left-6 top-0 bottom-0 w-1 bg-primary rounded-r" />
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Reports & Analytics</h1>
              <p className="text-muted-foreground">
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
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-secondary to-secondary/80 flex items-center justify-center">
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
