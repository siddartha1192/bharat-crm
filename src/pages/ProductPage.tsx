import { PromoNav } from '@/components/promo/PromoNav';
import { PromoFooter } from '@/components/promo/PromoFooter';
import { Link } from 'react-router-dom';
import {
  Users, MessageSquare, Calendar, Brain, BarChart3,
  FileText, Workflow, Shield, Zap, CheckCircle, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function ProductPage() {
  const productFeatures = [
    {
      icon: <Users className="w-8 h-8" />,
      title: "Lead & Contact Management",
      description: "Centralize all customer data in one place. Track interactions, notes, and history.",
      benefits: [
        "360-degree customer view",
        "Custom fields & tags",
        "Import/export contacts",
        "Duplicate detection"
      ],
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: <MessageSquare className="w-8 h-8" />,
      title: "WhatsApp Business Integration",
      description: "Native WhatsApp integration for seamless customer communication.",
      benefits: [
        "Two-way messaging",
        "AI auto-responses",
        "Bulk messaging",
        "Message templates"
      ],
      gradient: "from-green-500 to-emerald-500"
    },
    {
      icon: <Brain className="w-8 h-8" />,
      title: "AI Assistant",
      description: "GPT-4 powered assistant that understands your business data.",
      benefits: [
        "Natural language queries",
        "Instant insights",
        "Smart recommendations",
        "Automated responses"
      ],
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: <Calendar className="w-8 h-8" />,
      title: "Calendar & Scheduling",
      description: "Two-way Google Calendar sync with automated reminders.",
      benefits: [
        "Google Calendar sync",
        "Meeting scheduling",
        "Automatic reminders",
        "Team availability"
      ],
      gradient: "from-orange-500 to-red-500"
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Sales Pipeline",
      description: "Visual pipeline management with drag-and-drop functionality.",
      benefits: [
        "Customizable stages",
        "Drag-and-drop deals",
        "Win probability",
        "Pipeline analytics"
      ],
      gradient: "from-indigo-500 to-blue-500"
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: "GST Invoicing",
      description: "Generate professional, GST-compliant invoices instantly.",
      benefits: [
        "GST compliance",
        "Custom templates",
        "Auto-calculations",
        "PDF generation"
      ],
      gradient: "from-yellow-500 to-orange-500"
    },
    {
      icon: <Workflow className="w-8 h-8" />,
      title: "Automation & Workflows",
      description: "Automate repetitive tasks and streamline your processes.",
      benefits: [
        "Email automation",
        "Task automation",
        "Custom triggers",
        "Workflow builder"
      ],
      gradient: "from-rose-500 to-pink-500"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Security & Compliance",
      description: "Enterprise-grade security with role-based access control.",
      benefits: [
        "End-to-end encryption",
        "Role-based permissions",
        "Audit logs",
        "Data backup"
      ],
      gradient: "from-gray-500 to-slate-500"
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
            <Zap className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-semibold text-purple-600">Comprehensive CRM Platform</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Everything You Need
            </span>
            <br />
            <span className="text-gray-900">In One Powerful Platform</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            NeuraGG CRM combines sales, marketing, and customer service tools with AI-powered
            automation to help you grow your business faster.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link to="/signup">
              <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-lg px-8 py-6 rounded-full shadow-xl">
                Start Free Trial <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link to="/pricing">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 rounded-full border-2 border-purple-600 text-purple-600 hover:bg-purple-50">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Complete Feature Set for
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"> Modern Teams</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Every tool you need to manage customer relationships, close deals, and grow revenue.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {productFeatures.map((feature, index) => (
            <Card key={index} className="border-0 shadow-lg hover:shadow-2xl transition-all">
              <CardContent className="p-8">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-white mb-4 shadow-lg`}>
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900">{feature.title}</h3>
                <p className="text-gray-600 mb-4 text-lg">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.benefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{benefit}</span>
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
            Ready to Get Started?
          </h2>
          <p className="text-2xl mb-10 text-purple-100">
            Join hundreds of businesses already using NeuraGG CRM
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link to="/signup">
              <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100 text-xl px-10 py-7 rounded-full shadow-2xl">
                Start Free Trial <ArrowRight className="ml-2 w-6 h-6" />
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 text-xl px-10 py-7 rounded-full">
                Contact Sales
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <PromoFooter />
    </div>
  );
}
