import { PromoNav } from '@/components/promo/PromoNav';
import { PromoFooter } from '@/components/promo/PromoFooter';
import { Link } from 'react-router-dom';
import {
  Sparkles, Users, MessageSquare, Calendar, TrendingUp,
  Zap, Brain, BarChart3, FileText, Workflow, ArrowRight,
  CheckCircle, Target, Clock, DollarSign, Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function FeaturesPage() {
  const coreFeatures = [
    {
      icon: <Users className="w-10 h-10" />,
      title: "Smart Lead Management",
      description: "AI-powered lead scoring, tracking, and nurturing",
      details: [
        "Automatic lead scoring based on engagement",
        "Round-robin lead assignment",
        "Custom lead stages and pipelines",
        "Lead source tracking and attribution",
        "Duplicate detection and merging"
      ],
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: <MessageSquare className="w-10 h-10" />,
      title: "WhatsApp Business",
      description: "Native WhatsApp integration with AI",
      details: [
        "Two-way messaging from CRM",
        "AI-powered auto-responses 24/7",
        "Bulk messaging with templates",
        "Media sharing (images, documents, videos)",
        "Conversation history tracking"
      ],
      gradient: "from-green-500 to-emerald-500"
    },
    {
      icon: <Brain className="w-10 h-10" />,
      title: "AI Assistant Portal",
      description: "Ask questions in plain English",
      details: [
        "Natural language queries about your data",
        "Instant insights and analytics",
        "Smart recommendations",
        "Automated report generation",
        "Predictive analytics"
      ],
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: <Calendar className="w-10 h-10" />,
      title: "Calendar & Scheduling",
      description: "Two-way Google Calendar sync",
      details: [
        "Automatic calendar synchronization",
        "Meeting scheduling with availability",
        "Automated reminders and notifications",
        "Team calendar visibility",
        "Booking links for customers"
      ],
      gradient: "from-orange-500 to-red-500"
    },
    {
      icon: <TrendingUp className="w-10 h-10" />,
      title: "Sales Pipeline",
      description: "Visual drag-and-drop pipeline",
      details: [
        "Kanban-style deal management",
        "Customizable pipeline stages",
        "Win probability tracking",
        "Deal value forecasting",
        "Pipeline health analytics"
      ],
      gradient: "from-indigo-500 to-blue-500"
    },
    {
      icon: <FileText className="w-10 h-10" />,
      title: "GST Invoicing",
      description: "Professional GST-compliant invoices",
      details: [
        "GST-compliant invoice templates",
        "Automatic tax calculations",
        "PDF generation and email delivery",
        "Payment tracking",
        "Invoice customization"
      ],
      gradient: "from-yellow-500 to-orange-500"
    },
    {
      icon: <BarChart3 className="w-10 h-10" />,
      title: "Sales Forecasting",
      description: "AI-powered revenue predictions",
      details: [
        "Revenue trend analysis",
        "Team performance metrics",
        "Pipeline analytics",
        "Conversion rate tracking",
        "Goal setting and monitoring"
      ],
      gradient: "from-teal-500 to-cyan-500"
    },
    {
      icon: <Workflow className="w-10 h-10" />,
      title: "Smart Automation",
      description: "Trigger-based workflows",
      details: [
        "Email automation sequences",
        "Task creation automation",
        "Custom trigger conditions",
        "Multi-step workflows",
        "Integration webhooks"
      ],
      gradient: "from-rose-500 to-pink-500"
    }
  ];

  const benefits = [
    {
      icon: <Target className="w-8 h-8" />,
      title: "Close More Deals",
      stat: "40%",
      description: "Increase in deal closure rate with AI-powered insights"
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: "Save Time",
      stat: "10+ hrs",
      description: "Hours saved per week with automation"
    },
    {
      icon: <DollarSign className="w-8 h-8" />,
      title: "Unlimited Users",
      stat: "₹0",
      description: "Per-seat fees - grow your team without limits"
    },
    {
      icon: <Smartphone className="w-8 h-8" />,
      title: "Faster Response",
      stat: "10x",
      description: "Faster customer response with WhatsApp + AI"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <PromoNav />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-blue-600/10 to-cyan-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center space-x-2 bg-purple-100 px-4 py-2 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-semibold text-purple-600">Powerful Features</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Built for Performance
            </span>
            <br />
            <span className="text-gray-900">Designed for Growth</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            Discover the features that make NeuraGG CRM the most powerful and easy-to-use
            customer relationship management platform for modern businesses.
          </p>
        </div>
      </section>

      {/* Benefits Stats */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {benefits.map((benefit, index) => (
            <Card key={index} className="border-0 shadow-xl bg-white hover:scale-105 transition-transform">
              <CardContent className="p-6 text-center">
                <div className="flex justify-center mb-3 text-purple-600">
                  {benefit.icon}
                </div>
                <div className="text-4xl font-extrabold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                  {benefit.stat}
                </div>
                <div className="text-sm font-semibold text-gray-900 mb-1">{benefit.title}</div>
                <div className="text-xs text-gray-600">{benefit.description}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Core Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Everything You Need to
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"> Succeed</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Comprehensive features designed to streamline your sales process and delight your customers.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {coreFeatures.map((feature, index) => (
            <Card key={index} className="border-0 shadow-lg hover:shadow-2xl transition-all">
              <CardContent className="p-8">
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-white mb-4 shadow-lg`}>
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold mb-2 text-gray-900">{feature.title}</h3>
                <p className="text-gray-600 mb-4 text-lg">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.details.map((detail, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{detail}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-purple-600 to-blue-600 py-20 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Experience All Features Free
          </h2>
          <p className="text-2xl mb-10 text-purple-100">
            No credit card required. Full access to all features.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link to="/signup">
              <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100 text-xl px-10 py-7 rounded-full shadow-2xl">
                Start Free Trial <ArrowRight className="ml-2 w-6 h-6" />
              </Button>
            </Link>
            <Link to="/pricing">
              <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 text-xl px-10 py-7 rounded-full">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <PromoFooter />
    </div>
  );
}
