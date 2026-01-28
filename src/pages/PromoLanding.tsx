import { Link } from 'react-router-dom';
import {
  Sparkles, Users, MessageSquare, Calendar, TrendingUp,
  Zap, Shield, Smartphone, Brain, BarChart3,
  FileText, Globe, CheckCircle, ArrowRight, Star,
  Target, DollarSign, Clock, Workflow, Send, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useState, useRef } from 'react';
import axios from 'axios';
import { PhoneInput } from '@/components/shared/PhoneInput';
import { Label } from '@/components/ui/label';
import { PromoNav } from '@/components/promo/PromoNav';
import { PromoFooter } from '@/components/promo/PromoFooter';

export default function PromoLanding() {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
  const leadFormRef = useRef<HTMLDivElement>(null);

  // Function to scroll to lead form
  const scrollToLeadForm = () => {
    leadFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Lead form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    phoneCountryCode: '+91',
    company: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await axios.post(`${API_URL}/promo/lead`, formData);

      if (response.data.success) {
        setSubmitSuccess(true);
        setFormData({ name: '', email: '', phone: '', phoneCountryCode: '+91', company: '', message: '' });

        // Reset success message after 5 seconds
        setTimeout(() => setSubmitSuccess(false), 5000);
      }
    } catch (error: any) {
      setSubmitError(
        error.response?.data?.error ||
        'Failed to submit your request. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const features = [
    {
      icon: <Users className="w-8 h-8" />,
      title: "Smart Lead Management",
      description: "AI-powered lead scoring, tracking, and nurturing. Never lose a potential customer again.",
      gradient: "from-blue-500 to-cyan-500",
      benefits: ["Auto-assign leads", "Priority scoring", "Smart follow-ups"]
    },
    {
      icon: <MessageSquare className="w-8 h-8" />,
      title: "WhatsApp Business Integration",
      description: "Native WhatsApp integration with AI auto-responses. Chat with customers where they are.",
      gradient: "from-green-500 to-emerald-500",
      benefits: ["24/7 AI responses", "Bulk messaging", "Message templates"]
    },
    {
      icon: <Brain className="w-8 h-8" />,
      title: "AI Assistant Portal",
      description: "Ask questions in plain English. Get instant insights from your CRM data.",
      gradient: "from-purple-500 to-pink-500",
      benefits: ["Natural language", "Data insights", "Smart suggestions"]
    },
    {
      icon: <Calendar className="w-8 h-8" />,
      title: "Calendar & Scheduling",
      description: "Two-way Google Calendar sync. Book appointments effortlessly.",
      gradient: "from-orange-500 to-red-500",
      benefits: ["Google sync", "Auto reminders", "Team availability"]
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Sales Pipeline",
      description: "Visual drag-and-drop pipeline. Track every deal from lead to close.",
      gradient: "from-indigo-500 to-blue-500",
      benefits: ["Kanban boards", "Deal tracking", "Win rate analysis"]
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: "GST Invoicing",
      description: "Generate GST-compliant invoices instantly. Built for Indian businesses.",
      gradient: "from-yellow-500 to-orange-500",
      benefits: ["GST templates", "Auto calculations", "Email delivery"]
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Sales Forecasting",
      description: "AI-powered revenue predictions. Make data-driven decisions with confidence.",
      gradient: "from-teal-500 to-cyan-500",
      benefits: ["Revenue trends", "Team metrics", "Pipeline analytics"]
    },
    {
      icon: <Workflow className="w-8 h-8" />,
      title: "Smart Automation",
      description: "Trigger-based workflows. Automate emails, tasks, and follow-ups.",
      gradient: "from-rose-500 to-pink-500",
      benefits: ["Email automation", "Task creation", "Custom triggers"]
    }
  ];

  const benefits = [
    {
      icon: <Target className="w-6 h-6" />,
      title: "Close More Deals",
      description: "AI-powered insights help you prioritize high-value leads and close deals 40% faster.",
      color: "text-blue-600"
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Save 10+ Hours Weekly",
      description: "Automation handles repetitive tasks. Focus on what matters - building relationships.",
      color: "text-green-600"
    },
    {
      icon: <DollarSign className="w-6 h-6" />,
      title: "Unlimited Users, Zero Per-Seat Fees",
      description: "No hidden costs. Grow your team without growing your CRM bill.",
      color: "text-purple-600"
    },
    {
      icon: <Smartphone className="w-6 h-6" />,
      title: "Connect Where Customers Are",
      description: "WhatsApp integration means instant customer engagement on their preferred platform.",
      color: "text-emerald-600"
    }
  ];

  const stats = [
    { number: "10x", label: "Faster Response Time", color: "from-blue-500 to-cyan-500" },
    { number: "40%", label: "More Deals Closed", color: "from-purple-500 to-pink-500" },
    { number: "∞", label: "Unlimited Users", color: "from-green-500 to-emerald-500" },
    { number: "24/7", label: "AI Auto-Responses", color: "from-orange-500 to-red-500" }
  ];

  const useCases = [
    {
      title: "Real Estate Agents",
      description: "Track property inquiries, schedule site visits via WhatsApp, manage deals",
      icon: "🏢"
    },
    {
      title: "Consultants & Service Providers",
      description: "Client relationship management, proposals, invoicing, project tracking",
      icon: "💼"
    },
    {
      title: "E-commerce Businesses",
      description: "Customer support via WhatsApp, order tracking, automated follow-ups",
      icon: "🛍️"
    },
    {
      title: "B2B Sales Teams",
      description: "Complex deal pipelines, team collaboration, performance analytics",
      icon: "📈"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <PromoNav />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-blue-600/10 to-cyan-600/10"></div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-10 left-1/2 w-72 h-72 bg-cyan-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center space-x-2 bg-purple-100 px-4 py-2 rounded-full mb-6">
            <Zap className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-semibold text-purple-600">AI-Powered CRM for Modern Businesses</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Transform Customer
            </span>
            <br />
            <span className="text-gray-900">Relationships with AI</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            The only CRM built for Indian businesses with <span className="font-semibold text-purple-600">WhatsApp integration</span>,
            <span className="font-semibold text-blue-600"> AI assistant</span>, and
            <span className="font-semibold text-green-600"> unlimited users</span>. No per-seat fees, ever.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link to="/contact">
              <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-lg px-8 py-6 rounded-full shadow-xl hover:shadow-2xl transition-all">
                Request Demo <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              onClick={scrollToLeadForm}
              className="text-lg px-8 py-6 rounded-full border-2 border-purple-600 text-purple-600 hover:bg-purple-50"
            >
              Watch Demo <Sparkles className="ml-2 w-5 h-5" />
            </Button>
          </div>

          <p className="mt-6 text-sm text-gray-500">
            ✓ No credit card required  ✓ Setup in 5 minutes  ✓ Free forever for up to 10 contacts
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 mb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Card key={index} className="border-0 shadow-xl bg-white/90 backdrop-blur hover:scale-105 transition-transform">
              <CardContent className="p-6 text-center">
                <div className={`text-4xl md:text-5xl font-extrabold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent mb-2`}>
                  {stat.number}
                </div>
                <div className="text-sm text-gray-600 font-medium">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Everything You Need to
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"> Grow Faster</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Powerful features that work together seamlessly to supercharge your sales and customer relationships.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card
              key={index}
              className={`border-0 shadow-lg hover:shadow-2xl transition-all cursor-pointer ${
                hoveredFeature === index ? 'scale-105' : ''
              }`}
              onMouseEnter={() => setHoveredFeature(index)}
              onMouseLeave={() => setHoveredFeature(null)}
            >
              <CardContent className="p-6">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-white mb-4 shadow-lg`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">{feature.title}</h3>
                <p className="text-gray-600 mb-4">{feature.description}</p>
                {hoveredFeature === index && (
                  <div className="space-y-2 animate-fadeIn">
                    {feature.benefits.map((benefit, idx) => (
                      <div key={idx} className="flex items-center space-x-2 text-sm text-gray-700">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Why Businesses
              <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent"> Love Neuragg CRM</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Real results that impact your bottom line from day one.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start space-x-4 p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white hover:shadow-lg transition-shadow">
                <div className={`${benefit.color} mt-1`}>
                  {benefit.icon}
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-gray-900">{benefit.title}</h3>
                  <p className="text-gray-600">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Perfect For
            <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent"> Every Industry</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {useCases.map((useCase, index) => (
            <Card key={index} className="border-2 border-gray-100 hover:border-purple-300 hover:shadow-xl transition-all">
              <CardContent className="p-6 text-center">
                <div className="text-5xl mb-4">{useCase.icon}</div>
                <h3 className="text-lg font-bold mb-2 text-gray-900">{useCase.title}</h3>
                <p className="text-sm text-gray-600">{useCase.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* AI Highlight Section */}
      <section className="bg-gradient-to-br from-purple-600 to-blue-600 py-20 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center space-x-2 bg-white/20 px-4 py-2 rounded-full mb-6">
                <Brain className="w-5 h-5" />
                <span className="text-sm font-semibold">Powered by GPT-4</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Your AI Sales Assistant Works 24/7
              </h2>
              <p className="text-xl mb-6 text-purple-100">
                Ask questions in plain English. Get instant answers about your leads, deals, and revenue.
                WhatsApp messages auto-replied with AI that knows your business.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 flex-shrink-0 mt-1" />
                  <span className="text-lg">"Show me all high-priority leads from this month"</span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 flex-shrink-0 mt-1" />
                  <span className="text-lg">"What's my revenue forecast for next quarter?"</span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 flex-shrink-0 mt-1" />
                  <span className="text-lg">"Reply to customer WhatsApp queries automatically"</span>
                </li>
              </ul>
            </div>
            <div className="relative">
              <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl">
                <div className="bg-white rounded-2xl p-6 text-gray-900">
                  <div className="flex items-start space-x-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white">
                      <Brain className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="bg-purple-50 rounded-lg p-3 mb-2">
                        <p className="text-sm">Show me deals closing this week</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-sm font-semibold text-blue-900 mb-2">Found 5 deals closing this week:</p>
                        <div className="space-y-1 text-xs">
                          <p>• ABC Corp - ₹5,00,000 (95% probability)</p>
                          <p>• XYZ Ltd - ₹3,50,000 (80% probability)</p>
                          <p>• Tech Solutions - ₹2,00,000 (90% probability)</p>
                        </div>
                        <p className="text-xs text-blue-700 mt-2">Total potential: ₹10,50,000</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <Sparkles className="w-4 h-4" />
                    <span>AI Assistant powered by GPT-4</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WhatsApp Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-12">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <div className="bg-white rounded-2xl p-6 shadow-xl">
                <div className="flex items-center space-x-3 mb-4 pb-4 border-b">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Customer Support</p>
                    <p className="text-sm text-gray-500">via WhatsApp Business</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="bg-gray-100 rounded-lg p-3 max-w-xs">
                    <p className="text-sm">What are your business hours?</p>
                    <p className="text-xs text-gray-500 mt-1">10:30 AM</p>
                  </div>
                  <div className="bg-green-500 text-white rounded-lg p-3 max-w-xs ml-auto">
                    <p className="text-sm">We're open Mon-Sat, 9 AM to 6 PM. How can I help you today?</p>
                    <p className="text-xs text-green-100 mt-1">10:30 AM ✓✓</p>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <Brain className="w-4 h-4" />
                    <span>Auto-replied by AI</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <MessageSquare className="w-16 h-16 text-green-600 mb-6" />
              <h2 className="text-4xl font-bold mb-4 text-gray-900">
                WhatsApp Business Integration
              </h2>
              <p className="text-xl text-gray-600 mb-6">
                The first CRM with native WhatsApp Business API. Chat with customers,
                send bulk messages, and let AI handle FAQs automatically.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-gray-700">Two-way messaging directly from CRM</span>
                </li>
                <li className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-gray-700">AI auto-responses with custom knowledge base</span>
                </li>
                <li className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-gray-700">Bulk messaging and templates</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Lead Capture Form Section */}
      <section ref={leadFormRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 rounded-3xl p-1 shadow-2xl">
          <div className="bg-white rounded-3xl p-8 md:p-12">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-10">
                <div className="inline-flex items-center space-x-2 bg-purple-100 px-4 py-2 rounded-full mb-4">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-semibold text-purple-600">Get Started Today</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
                  Ready to Transform Your Sales?
                </h2>
                <p className="text-xl text-gray-600">
                  Request a personalized demo and see Neuragg CRM in action
                </p>
              </div>

              {submitSuccess ? (
                <div className="bg-green-50 border-2 border-green-500 rounded-2xl p-8 text-center">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-green-900 mb-2">Thank You!</h3>
                  <p className="text-green-700 text-lg">
                    We've received your request and will be in touch shortly to schedule your personalized demo.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="John Doe"
                        className="h-12 text-base border-2 border-gray-300 focus:border-purple-500"
                        disabled={isSubmitting}
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="john@company.com"
                        className="h-12 text-base border-2 border-gray-300 focus:border-purple-500"
                        disabled={isSubmitting}
                      />
                    </div>

                    <div>
                      <PhoneInput
                        label="Phone Number"
                        id="phone"
                        phoneValue={formData.phone}
                        countryCodeValue={formData.phoneCountryCode}
                        onPhoneChange={(value) => setFormData({ ...formData, phone: value })}
                        onCountryCodeChange={(value) => setFormData({ ...formData, phoneCountryCode: value })}
                        placeholder="9876543210"
                        disabled={isSubmitting}
                      />
                    </div>

                    <div>
                      <label htmlFor="company" className="block text-sm font-semibold text-gray-700 mb-2">
                        Company Name
                      </label>
                      <Input
                        id="company"
                        name="company"
                        type="text"
                        value={formData.company}
                        onChange={handleInputChange}
                        placeholder="Your Company"
                        className="h-12 text-base border-2 border-gray-300 focus:border-purple-500"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-2">
                      What are you looking for?
                    </label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder="Tell us about your sales team, your challenges, or any specific features you're interested in..."
                      rows={4}
                      className="text-base border-2 border-gray-300 focus:border-purple-500"
                      disabled={isSubmitting}
                    />
                  </div>

                  {submitError && (
                    <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                      <p className="text-red-700 font-medium">{submitError}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-lg py-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Request Demo <Send className="ml-2 w-5 h-5" />
                      </>
                    )}
                  </Button>

                  <p className="text-center text-sm text-gray-500">
                    By submitting this form, you agree to our privacy policy. We'll never share your information.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing / CTA Section */}
      <section className="bg-gradient-to-br from-gray-900 to-gray-800 py-20 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Transform Your Business?
          </h2>
          <p className="text-2xl mb-4 text-gray-300">
            Start your free trial today. No credit card required.
          </p>
          <p className="text-xl mb-10 text-gray-400">
            Join hundreds of Indian businesses already using Neuragg CRM
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 mb-12">
            <Link to="/contact">
              <Button size="lg" className="bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-white text-xl px-10 py-7 rounded-full shadow-2xl hover:shadow-3xl transition-all">
                Request Demo <ArrowRight className="ml-2 w-6 h-6" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              onClick={scrollToLeadForm}
              className="border-2 border-white text-white hover:bg-white/10 text-xl px-10 py-7 rounded-full"
            >
              Request Demo <Sparkles className="ml-2 w-6 h-6" />
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="flex flex-col items-center">
              <Shield className="w-12 h-12 mb-3 text-green-400" />
              <h3 className="font-bold mb-2">Enterprise Security</h3>
              <p className="text-sm text-gray-400">Bank-grade encryption</p>
            </div>
            <div className="flex flex-col items-center">
              <Users className="w-12 h-12 mb-3 text-blue-400" />
              <h3 className="font-bold mb-2">Unlimited Users</h3>
              <p className="text-sm text-gray-400">No per-seat fees ever</p>
            </div>
            <div className="flex flex-col items-center">
              <Globe className="w-12 h-12 mb-3 text-purple-400" />
              <h3 className="font-bold mb-2">24/7 Support</h3>
              <p className="text-sm text-gray-400">We're here to help</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Loved by
            <span className="bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent"> Sales Teams</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              name: "Rajesh Kumar",
              role: "Sales Director, Real Estate",
              content: "WhatsApp integration changed everything. We close deals 2x faster now. The AI assistant saves us hours every day.",
              rating: 5
            },
            {
              name: "Priya Sharma",
              role: "Founder, E-commerce Startup",
              content: "Finally, a CRM that doesn't charge per user! Our entire team of 20 can use it without breaking the bank.",
              rating: 5
            },
            {
              name: "Amit Patel",
              role: "B2B Sales Manager",
              content: "The sales forecasting is incredibly accurate. We can predict revenue with confidence and plan better.",
              rating: 5
            }
          ].map((testimonial, index) => (
            <Card key={index} className="border-2 border-gray-100 hover:border-yellow-300 hover:shadow-xl transition-all">
              <CardContent className="p-6">
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">"{testimonial.content}"</p>
                <div>
                  <p className="font-bold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-500">{testimonial.role}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <PromoFooter />

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
