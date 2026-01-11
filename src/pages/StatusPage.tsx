import { PromoNav } from '@/components/promo/PromoNav';
import { PromoFooter } from '@/components/promo/PromoFooter';
import { CheckCircle, Clock, AlertCircle, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function StatusPage() {
  const systems = [
    {
      name: "API",
      status: "operational",
      uptime: "99.99%",
      responseTime: "45ms"
    },
    {
      name: "Web Application",
      status: "operational",
      uptime: "99.98%",
      responseTime: "120ms"
    },
    {
      name: "WhatsApp Integration",
      status: "operational",
      uptime: "99.95%",
      responseTime: "200ms"
    },
    {
      name: "Email Service",
      status: "operational",
      uptime: "99.97%",
      responseTime: "80ms"
    },
    {
      name: "Database",
      status: "operational",
      uptime: "99.99%",
      responseTime: "25ms"
    },
    {
      name: "AI Assistant",
      status: "operational",
      uptime: "99.96%",
      responseTime: "1500ms"
    }
  ];

  const incidents = [
    {
      date: "Jan 5, 2026",
      title: "Scheduled Maintenance",
      description: "Database optimization completed successfully",
      status: "resolved",
      duration: "30 minutes"
    },
    {
      date: "Dec 28, 2025",
      title: "Minor API Slowdown",
      description: "Brief increase in API response times detected and resolved",
      status: "resolved",
      duration: "15 minutes"
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'down':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'down':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const allOperational = systems.every(s => s.status === 'operational');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <PromoNav />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-blue-600/10 to-cyan-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center space-x-2 bg-purple-100 px-4 py-2 rounded-full mb-6">
            <Activity className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-semibold text-purple-600">System Status</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
            <span className="text-gray-900">All Systems</span>
            <br />
            <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Operational
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            Real-time status of NeuraGG CRM services
          </p>

          {allOperational && (
            <div className="inline-flex items-center space-x-2 bg-green-50 border-2 border-green-500 px-6 py-3 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <span className="text-lg font-semibold text-green-900">All Services Running Smoothly</span>
            </div>
          )}
        </div>
      </section>

      {/* System Status */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <Card className="border-0 shadow-2xl">
          <CardHeader className="border-b border-gray-200 bg-white">
            <h2 className="text-2xl font-bold text-gray-900">Current Status</h2>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-200">
              {systems.map((system, index) => (
                <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      {getStatusIcon(system.status)}
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{system.name}</h3>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6 text-sm">
                      <div className="text-right">
                        <p className="text-gray-500">Uptime</p>
                        <p className="font-semibold text-gray-900">{system.uptime}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-500">Response Time</p>
                        <p className="font-semibold text-gray-900">{system.responseTime}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(system.status)}`}></div>
                        <span className="font-semibold text-gray-900 capitalize">{system.status}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Incident History */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <h2 className="text-3xl font-bold mb-8 text-gray-900">Recent Incidents</h2>
        <div className="space-y-4">
          {incidents.map((incident, index) => (
            <Card key={index} className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-sm font-semibold text-green-600 uppercase">Resolved</span>
                      <span className="text-sm text-gray-500">{incident.date}</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-gray-900">{incident.title}</h3>
                    <p className="text-gray-600 mb-2">{incident.description}</p>
                    <p className="text-sm text-gray-500">Duration: {incident.duration}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {incidents.length === 0 && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2 text-gray-900">No Recent Incidents</h3>
              <p className="text-gray-600">All systems have been running smoothly</p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Uptime Info */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-4">
              99.9%
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"> Uptime Guarantee</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              We're committed to keeping NeuraGG CRM available and performant 24/7.
              Our infrastructure is monitored around the clock to ensure maximum reliability.
            </p>
          </div>
        </div>
      </section>

      <PromoFooter />
    </div>
  );
}
