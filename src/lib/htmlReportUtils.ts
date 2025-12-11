import { Lead } from '@/types/lead';
import { Deal } from '@/types/pipeline';

interface ReportData {
  leads: Lead[];
  deals: Deal[];
  dateRange?: string;
}

interface ChartData {
  leadSourceData: { name: string; value: number; color: string }[];
  pipelineData: { stage: string; value: number; count: number }[];
  leadStatusData: { name: string; value: number; color: string }[];
  monthlyData: { month: string; leads: number; deals: number; revenue: number }[];
  stats: {
    totalLeads: number;
    conversionRate: string;
    avgDealSize: string;
    totalRevenue: string;
  };
}

function calculateChartData(leads: Lead[], deals: Deal[]): ChartData {
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

  // Monthly Performance
  const getMonthlyData = () => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const last6Months: any[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = monthNames[date.getMonth()];

      const monthLeads = leads.filter(l => {
        const leadDate = new Date(l.createdAt);
        return leadDate.getFullYear() === date.getFullYear() &&
               leadDate.getMonth() === date.getMonth();
      }).length;

      const monthDeals = deals.filter(d => {
        if (d.stage !== 'closed-won') return false;
        const dealDate = new Date(d.updatedAt);
        return dealDate.getFullYear() === date.getFullYear() &&
               dealDate.getMonth() === date.getMonth();
      }).length;

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

  return {
    leadSourceData,
    pipelineData,
    leadStatusData,
    monthlyData,
    stats,
  };
}

export function generateHTMLReport(data: ReportData): string {
  const { leads, deals, dateRange = 'Last 30 Days' } = data;
  const chartData = calculateChartData(leads, deals);
  const reportDate = new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sales & Analytics Report - ${reportDate}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      color: #333;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }

    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }

    .header h1 {
      font-size: 36px;
      margin-bottom: 10px;
      font-weight: 700;
    }

    .header p {
      font-size: 18px;
      opacity: 0.9;
    }

    .meta-info {
      background: rgba(255, 255, 255, 0.1);
      padding: 20px;
      margin-top: 20px;
      border-radius: 10px;
      display: flex;
      justify-content: space-around;
      flex-wrap: wrap;
      gap: 20px;
    }

    .meta-item {
      text-align: center;
    }

    .meta-label {
      font-size: 14px;
      opacity: 0.8;
      margin-bottom: 5px;
    }

    .meta-value {
      font-size: 18px;
      font-weight: 600;
    }

    .content {
      padding: 40px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 25px;
      margin-bottom: 40px;
    }

    .stat-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
      transition: transform 0.3s ease;
    }

    .stat-card:nth-child(2) {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }

    .stat-card:nth-child(3) {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    }

    .stat-card:nth-child(4) {
      background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
    }

    .stat-label {
      font-size: 14px;
      opacity: 0.9;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .stat-value {
      font-size: 42px;
      font-weight: 700;
      line-height: 1;
    }

    .charts-section {
      margin-top: 40px;
    }

    .chart-container {
      background: #f8f9fa;
      border-radius: 15px;
      padding: 30px;
      margin-bottom: 30px;
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
    }

    .chart-title {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 25px;
      color: #333;
      border-left: 4px solid #667eea;
      padding-left: 15px;
    }

    .chart-wrapper {
      position: relative;
      height: 400px;
      margin-top: 20px;
    }

    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
      gap: 30px;
    }

    .footer {
      background: #f8f9fa;
      padding: 30px 40px;
      text-align: center;
      border-top: 3px solid #667eea;
    }

    .footer p {
      color: #666;
      font-size: 14px;
      margin-bottom: 5px;
    }

    .footer .generated-time {
      color: #999;
      font-size: 12px;
    }

    @media print {
      body {
        background: white;
        padding: 0;
      }

      .container {
        box-shadow: none;
      }

      .chart-wrapper {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Sales & Analytics Report</h1>
      <p>Comprehensive Performance Overview</p>
      <div class="meta-info">
        <div class="meta-item">
          <div class="meta-label">Report Period</div>
          <div class="meta-value">${dateRange}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Generated On</div>
          <div class="meta-value">${reportDate}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Total Records</div>
          <div class="meta-value">${leads.length + deals.length}</div>
        </div>
      </div>
    </div>

    <div class="content">
      <!-- Key Metrics -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Leads</div>
          <div class="stat-value">${chartData.stats.totalLeads}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Conversion Rate</div>
          <div class="stat-value">${chartData.stats.conversionRate}%</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Avg Deal Size</div>
          <div class="stat-value">₹${chartData.stats.avgDealSize}L</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Total Revenue</div>
          <div class="stat-value">₹${chartData.stats.totalRevenue}L</div>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="charts-section">
        <!-- Pipeline Value -->
        <div class="chart-container">
          <h2 class="chart-title">Pipeline Value by Stage</h2>
          <div class="chart-wrapper">
            <canvas id="pipelineChart"></canvas>
          </div>
        </div>

        <!-- Monthly Performance -->
        <div class="chart-container">
          <h2 class="chart-title">Monthly Performance Trend</h2>
          <div class="chart-wrapper">
            <canvas id="monthlyChart"></canvas>
          </div>
        </div>

        <!-- Two Column Charts -->
        <div class="charts-grid">
          <div class="chart-container">
            <h2 class="chart-title">Lead Source Distribution</h2>
            <div class="chart-wrapper">
              <canvas id="leadSourceChart"></canvas>
            </div>
          </div>

          <div class="chart-container">
            <h2 class="chart-title">Lead Status Distribution</h2>
            <div class="chart-wrapper">
              <canvas id="leadStatusChart"></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="footer">
      <p><strong>CRM Analytics Dashboard</strong></p>
      <p class="generated-time">Generated automatically on ${new Date().toLocaleString('en-IN')}</p>
    </div>
  </div>

  <script>
    // Chart.js configuration
    Chart.defaults.font.family = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
    Chart.defaults.font.size = 14;

    // Pipeline Value Chart
    new Chart(document.getElementById('pipelineChart'), {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(chartData.pipelineData.map(d => d.stage))},
        datasets: [{
          label: 'Pipeline Value (₹L)',
          data: ${JSON.stringify(chartData.pipelineData.map(d => d.value))},
          backgroundColor: 'rgba(102, 126, 234, 0.8)',
          borderColor: 'rgba(102, 126, 234, 1)',
          borderWidth: 2,
          borderRadius: 8,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return 'Value: ₹' + context.parsed.y.toFixed(1) + 'L';
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '₹' + value + 'L';
              }
            }
          }
        }
      }
    });

    // Monthly Performance Chart
    new Chart(document.getElementById('monthlyChart'), {
      type: 'line',
      data: {
        labels: ${JSON.stringify(chartData.monthlyData.map(d => d.month))},
        datasets: [
          {
            label: 'Leads',
            data: ${JSON.stringify(chartData.monthlyData.map(d => d.leads))},
            borderColor: 'rgba(255, 153, 51, 1)',
            backgroundColor: 'rgba(255, 153, 51, 0.1)',
            borderWidth: 3,
            tension: 0.4,
            fill: true,
          },
          {
            label: 'Deals',
            data: ${JSON.stringify(chartData.monthlyData.map(d => d.deals))},
            borderColor: 'rgba(19, 136, 8, 1)',
            backgroundColor: 'rgba(19, 136, 8, 0.1)',
            borderWidth: 3,
            tension: 0.4,
            fill: true,
          },
          {
            label: 'Revenue (₹L)',
            data: ${JSON.stringify(chartData.monthlyData.map(d => d.revenue))},
            borderColor: 'rgba(0, 0, 128, 1)',
            backgroundColor: 'rgba(0, 0, 128, 0.1)',
            borderWidth: 3,
            tension: 0.4,
            fill: true,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });

    // Lead Source Distribution Chart
    new Chart(document.getElementById('leadSourceChart'), {
      type: 'doughnut',
      data: {
        labels: ${JSON.stringify(chartData.leadSourceData.map(d => d.name))},
        datasets: [{
          data: ${JSON.stringify(chartData.leadSourceData.map(d => d.value))},
          backgroundColor: ${JSON.stringify(chartData.leadSourceData.map(d => d.color))},
          borderWidth: 3,
          borderColor: '#fff',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((context.parsed / total) * 100).toFixed(1);
                return context.label + ': ' + context.parsed + ' (' + percentage + '%)';
              }
            }
          }
        }
      }
    });

    // Lead Status Distribution Chart
    new Chart(document.getElementById('leadStatusChart'), {
      type: 'doughnut',
      data: {
        labels: ${JSON.stringify(chartData.leadStatusData.map(d => d.name))},
        datasets: [{
          data: ${JSON.stringify(chartData.leadStatusData.map(d => d.value))},
          backgroundColor: ${JSON.stringify(chartData.leadStatusData.map(d => d.color))},
          borderWidth: 3,
          borderColor: '#fff',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return context.label + ': ' + context.parsed;
              }
            }
          }
        }
      }
    });
  </script>
</body>
</html>
  `;

  return html;
}

export function downloadHTMLReport(data: ReportData, filename?: string) {
  const html = generateHTMLReport(data);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `sales-report-${new Date().toISOString().split('T')[0]}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
