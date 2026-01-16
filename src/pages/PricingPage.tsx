import { PromoNav } from '@/components/promo/PromoNav';
import { PromoFooter } from '@/components/promo/PromoFooter';
import { Link } from 'react-router-dom';
import { CheckCircle, ArrowRight, Clock, CreditCard, Zap, Building2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function PricingPage() {
  const plans = [
    {
      name: "Free Trial",
      price: "Free",
      period: "25 days",
      description: "Try all features risk-free for 25 days",
      icon: Clock,
      features: [
        "All features included",
        "AI Chatbot & AI Calls",
        "WhatsApp Integration",
        "Email Campaigns",
        "Up to 5 users",
        "Sales Pipeline Management",
        "Advanced Analytics",
        "GST Invoicing"
      ],
      cta: "Start Free Trial",
      highlight: false,
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      name: "Standard",
      price: "₹999",
      period: "per month",
      description: "Perfect for growing teams without AI needs",
      icon: CreditCard,
      features: [
        "All core CRM features",
        "WhatsApp Integration",
        "Email Campaigns",
        "Up to 25 users",
        "Sales Pipeline Management",
        "Advanced Analytics",
        "GST Invoicing",
        "Priority Support"
      ],
      notIncluded: [
        "AI Chatbot",
        "AI Calls",
        "API Access"
      ],
      cta: "Get Started",
      highlight: false,
      gradient: "from-green-500 to-emerald-500"
    },
    {
      name: "Professional",
      price: "₹1,300",
      period: "per month",
      description: "Complete solution with AI-powered features",
      icon: Zap,
      features: [
        "All features included",
        "AI Chatbot & AI Calls",
        "WhatsApp Integration",
        "Email Campaigns",
        "Up to 100 users",
        "Sales Automation",
        "Advanced Analytics",
        "GST Invoicing",
        "Priority Support",
        "Custom Workflows"
      ],
      cta: "Start Free Trial",
      highlight: true,
      gradient: "from-purple-600 to-blue-600"
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "contact us",
      description: "For large organizations with custom requirements",
      icon: Building2,
      features: [
        "Everything in Professional",
        "Unlimited users (up to 500)",
        "API Access",
        "Custom integrations",
        "Dedicated account manager",
        "SLA guarantees",
        "Advanced security",
        "Custom training",
        "White-label options",
        "24/7 phone support"
      ],
      cta: "Contact Sales",
      highlight: false,
      gradient: "from-gray-700 to-gray-900"
    }
  ];

  const faqs = [
    {
      question: "What happens after my 25-day free trial ends?",
      answer: "Your account will be automatically deactivated. You can upgrade to any paid plan to continue using all features without losing your data."
    },
    {
      question: "What's the difference between Standard and Professional plans?",
      answer: "The main difference is AI features. Standard plan includes all core CRM features but excludes AI Chatbot and AI Calls. Professional includes all features including AI capabilities."
    },
    {
      question: "Can I upgrade or downgrade anytime?",
      answer: "Yes! You can upgrade or downgrade your plan at any time through your tenant admin dashboard. Changes take effect immediately."
    },
    {
      question: "How does the user limit work?",
      answer: "Each plan has a maximum number of users: Free (5), Standard (25), Professional (100), and Enterprise (500). You can add users up to your plan limit."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit/debit cards, UPI, net banking, and can process bank transfers for annual subscriptions."
    },
    {
      question: "Is there a setup fee?",
      answer: "No setup fees, no hidden charges. The price you see is what you pay."
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
            <span className="text-sm font-semibold text-purple-600">Simple, Transparent Pricing</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Choose Your Plan
            </span>
            <br />
            <span className="text-gray-900">Start with 25 Days Free</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 mb-6 max-w-3xl mx-auto leading-relaxed">
            Try all features for 25 days, then choose the plan that fits your business needs.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            return (
              <Card
                key={index}
                className={`border-2 ${
                  plan.highlight
                    ? 'border-purple-500 shadow-2xl scale-105 lg:scale-110'
                    : 'border-gray-200 shadow-lg'
                } hover:shadow-2xl transition-all relative`}
              >
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                    <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardHeader className="text-center pb-8 pt-10">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center text-white`}>
                    <Icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-extrabold">{plan.price}</span>
                    {plan.period && (
                      <span className="text-gray-600 text-sm block mt-1">{plan.period}</span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm">{plan.description}</p>
                </CardHeader>
                <CardContent className="px-6 pb-8">
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start space-x-3">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 text-sm">{feature}</span>
                      </li>
                    ))}
                    {plan.notIncluded && plan.notIncluded.map((feature, idx) => (
                      <li key={`not-${idx}`} className="flex items-start space-x-3">
                        <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-500 text-sm line-through">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/contact" className="block">
                    <Button
                      size="lg"
                      className={`w-full ${
                        plan.highlight
                          ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
                          : 'bg-gray-900 hover:bg-gray-800'
                      } text-white py-6 rounded-xl`}
                    >
                      {plan.cta} <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            Compare
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"> Plans</span>
          </h2>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Feature</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Free</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Standard</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Professional</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-700">User Limit</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-900">5</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-900">25</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-900">100</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-900">500</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-700">CRM Features</td>
                  <td className="px-6 py-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-700">WhatsApp Integration</td>
                  <td className="px-6 py-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-700">AI Chatbot & AI Calls</td>
                  <td className="px-6 py-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><X className="w-5 h-5 text-red-400 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-700">API Access</td>
                  <td className="px-6 py-4 text-center"><X className="w-5 h-5 text-red-400 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><X className="w-5 h-5 text-red-400 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><X className="w-5 h-5 text-red-400 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Frequently Asked
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"> Questions</span>
          </h2>
        </div>

        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <Card key={index} className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold mb-2 text-gray-900">{faq.question}</h3>
                <p className="text-gray-600">{faq.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-purple-600 to-blue-600 py-20 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Start Your 25-Day Free Trial Today
          </h2>
          <p className="text-2xl mb-10 text-purple-100">
            No credit card required. Try all features including AI capabilities.
          </p>
          <Link to="/contact">
            <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100 text-xl px-10 py-7 rounded-full shadow-2xl">
              Get Started <ArrowRight className="ml-2 w-6 h-6" />
            </Button>
          </Link>
        </div>
      </section>

      <PromoFooter />
    </div>
  );
}
