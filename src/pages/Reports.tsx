import { mockLeads } from '@/lib/mockData';
import { mockDeals } from '@/lib/mockData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from 'lucide-react';

export default function Reports() {
  // Lead Source Distribution
  const leadSourceData = [
    {
      name: 'Web Form',
      value: mockLeads.filter(l => l.source === 'web-form').length,
      color: '#FF9933',
    },
    {
      name: 'WhatsApp',
      value: mockLeads.filter(l => l.source === 'whatsapp').length,
      color: '#25D366',
    },
    {
      name: 'Call',
      value: mockLeads.filter(l => l.source === 'call').length,
      color: '#000080',
    },
    {
      name: 'Email',
      value: mockLeads.filter(l => l.source === 'email').length,
      color: '#138808',
    },
    {
      name: 'Referral',
      value: mockLeads.filter(l => l.source === 'referral').length,
      color: '#FFA500',
    },
    {
      name: 'Missed Call',
      value: mockLeads.filter(l => l.source === 'missed-call').length,
      color: '#800080',
    },
  ];

  // Pipeline Value by Stage
  const pipelineData = [
    {
      stage: 'Lead',
      value: mockDeals.filter(d => d.stage === 'lead').reduce((sum, d) => sum + d.value, 0) / 100000,
      count: mockDeals.filter(d => d.stage === 'lead').length,
    },
    {
      stage: 'Qualified',
      value: mockDeals.filter(d => d.stage === 'qualified').reduce((sum, d) => sum + d.value, 0) / 100000,
      count: mockDeals.filter(d => d.stage === 'qualified').length,
    },
    {
      stage: 'Proposal',
      value: mockDeals.filter(d => d.stage === 'proposal').reduce((sum, d) => sum + d.value, 0) / 100000,
      count: mockDeals.filter(d => d.stage === 'proposal').length,
    },
    {
      stage: 'Negotiation',
      value: mockDeals.filter(d => d.stage === 'negotiation').reduce((sum, d) => sum + d.value, 0) / 100000,
      count: mockDeals.filter(d => d.stage === 'negotiation').length,
    },
    {
      stage: 'Won',
      value: mockDeals.filter(d => d.stage === 'closed-won').reduce((sum, d) => sum + d.value, 0) / 100000,
      count: mockDeals.filter(d => d.stage === 'closed-won').length,
    },
  ];

  // Lead Status Distribution
  const leadStatusData = [
    { name: 'New', value: mockLeads.filter(l => l.status === 'new').length, color: '#3b82f6' },
    { name: 'Contacted', value: mockLeads.filter(l => l.status === 'contacted').length, color: '#8b5cf6' },
    { name: 'Qualified', value: mockLeads.filter(l => l.status === 'qualified').length, color: '#06b6d4' },
    { name: 'Proposal', value: mockLeads.filter(l => l.status === 'proposal').length, color: '#f59e0b' },
    { name: 'Won', value: mockLeads.filter(l => l.status === 'won').length, color: '#138808' },
  ];

  // Monthly Performance (mock data for trend)
  const monthlyData = [
    { month: 'Jan', leads: 12, deals: 5, revenue: 8.5 },
    { month: 'Feb', leads: 19, deals: 7, revenue: 12.3 },
    { month: 'Mar', leads: 15, deals: 6, revenue: 10.1 },
    { month: 'Apr', leads: 22, deals: 9, revenue: 15.8 },
    { month: 'May', leads: 18, deals: 8, revenue: 13.2 },
    { month: 'Jun', leads: 25, deals: 11, revenue: 18.5 },
  ];

  const stats = {
    totalLeads: mockLeads.length,
    conversionRate: ((mockLeads.filter(l => l.status === 'won').length / mockLeads.length) * 100).toFixed(1),
    avgDealSize: (mockDeals.reduce((sum, d) => sum + d.value, 0) / mockDeals.length / 100000).toFixed(1),
    totalRevenue: (mockDeals.filter(d => d.stage === 'closed-won').reduce((sum, d) => sum + d.value, 0) / 100000).toFixed(1),
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
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </div>

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
      </div>
    </div>
  );
}
