import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { TrendingUp, DollarSign, Target, Users, Calendar, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';

interface ForecastData {
  expectedRevenue: number;
  pipelineValue: number;
  weightedValue: number;
  leadCount: number;
  dealCount: number;
  wonCount: number;
  lostCount: number;
  conversionRate: number;
  stageBreakdown: Record<string, { count: number; value: number; probability: number }>;
  userBreakdown: Record<string, { userName: string; revenue: number; deals: number; leads: number }>;
  previousPeriodRevenue: number;
  growthRate: number;
  wonRevenue: number;
}

interface PipelineHealth {
  totalDeals: number;
  totalValue: number;
  averageDealSize: number;
  averageProbability: number;
  stageDistribution: Record<string, { count: number; value: number }>;
  aging: Record<string, number>;
}

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export default function SalesForecast() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [pipelineHealth, setPipelineHealth] = useState<PipelineHealth | null>(null);
  const [trends, setTrends] = useState<any>(null);

  useEffect(() => {
    loadForecastData();
  }, [period]);

  const loadForecastData = async () => {
    try {
      setLoading(true);

      // Load current forecast
      const forecastRes = await api.get(`/forecast/calculate?period=${period}`);
      setForecast(forecastRes.data);

      // Load pipeline health
      const healthRes = await api.get('/forecast/pipeline-health');
      setPipelineHealth(healthRes.data);

      // Load trend data
      const trendsRes = await api.get(`/forecast/trends?period=${period}&months=6`);
      setTrends(trendsRes.data);

    } catch (error) {
      console.error('Error loading forecast data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Prepare chart data
  const stageChartData = forecast?.stageBreakdown
    ? Object.entries(forecast.stageBreakdown).map(([stage, data]) => ({
        name: stage.toUpperCase(),
        count: data.count,
        value: data.value,
        probability: data.probability
      }))
    : [];

  const userChartData = forecast?.userBreakdown
    ? Object.entries(forecast.userBreakdown).map(([userId, data]) => ({
        name: data.userName,
        revenue: data.revenue,
        deals: data.deals,
        leads: data.leads
      }))
    : [];

  const agingChartData = pipelineHealth?.aging
    ? Object.entries(pipelineHealth.aging).map(([range, count]) => ({
        name: `${range} days`,
        count
      }))
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading forecast data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Sales Forecast</h1>
          <p className="text-muted-foreground">Enterprise-grade sales forecasting and analytics</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadForecastData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expected Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(forecast?.expectedRevenue || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {forecast && forecast.growthRate >= 0 ? '+' : ''}
              {formatPercent(forecast?.growthRate || 0)} from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(forecast?.pipelineValue || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Weighted: {formatCurrency(forecast?.weightedValue || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercent(forecast?.conversionRate || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {forecast?.wonCount || 0} won / {forecast?.dealCount || 0} total deals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{forecast?.leadCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {forecast?.dealCount || 0} deals in pipeline
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenue Trends</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline Analysis</TabsTrigger>
          <TabsTrigger value="performance">Team Performance</TabsTrigger>
          <TabsTrigger value="health">Pipeline Health</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Forecast</CardTitle>
              <CardDescription>Expected vs actual revenue over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={trends?.forecasts || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="forecastDate" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="expectedRevenue"
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.6}
                    name="Expected Revenue"
                  />
                  <Area
                    type="monotone"
                    dataKey="wonRevenue"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.6}
                    name="Actual Revenue"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Pipeline by Stage</CardTitle>
                <CardDescription>Deal distribution across stages</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stageChartData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {stageChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Value by Stage</CardTitle>
                <CardDescription>Revenue distribution by stage</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stageChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="value" fill="#8b5cf6" name="Total Value" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Performance</CardTitle>
              <CardDescription>Revenue and deal metrics by team member</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={userChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" orientation="left" stroke="#8b5cf6" />
                  <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" />
                  <Tooltip formatter={(value: number, name: string) => {
                    if (name === 'Revenue') return formatCurrency(value);
                    return value;
                  }} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="revenue" fill="#8b5cf6" name="Revenue" />
                  <Bar yAxisId="right" dataKey="deals" fill="#3b82f6" name="Deals" />
                  <Bar yAxisId="right" dataKey="leads" fill="#10b981" name="Leads" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Pipeline Health Metrics</CardTitle>
                <CardDescription>Current pipeline statistics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Active Deals</span>
                  <span className="font-bold">{pipelineHealth?.totalDeals || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Pipeline Value</span>
                  <span className="font-bold">{formatCurrency(pipelineHealth?.totalValue || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Average Deal Size</span>
                  <span className="font-bold">{formatCurrency(pipelineHealth?.averageDealSize || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Average Probability</span>
                  <span className="font-bold">{formatPercent(pipelineHealth?.averageProbability || 0)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Deal Aging Analysis</CardTitle>
                <CardDescription>How long deals have been in pipeline</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={agingChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#f59e0b" name="Number of Deals" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
