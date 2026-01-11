import { PromoNav } from '@/components/promo/PromoNav';
import { PromoFooter } from '@/components/promo/PromoFooter';
import { Link } from 'react-router-dom';
import { CheckCircle, ArrowRight, Zap, Users, Infinity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function PricingPage() {
  const plans = [
    {
      name: "Starter",
      price: "Free",
      period: "forever",
      description: "Perfect for individuals and small teams getting started",
      features: [
        "Up to 10 contacts",
        "Unlimited users",
        "Basic CRM features",
        "Email support",
        "Mobile app access",
        "Basic reports"
      ],
      cta: "Start Free",
      highlight: false,
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      name: "Professional",
      price: "₹2,999",
      period: "per month",
      description: "For growing businesses that need advanced features",
      features: [
        "Unlimited contacts",
        "Unlimited users",
        "All CRM features",
        "WhatsApp integration",
        "AI Assistant",
        "GST invoicing",
        "Sales forecasting",
        "Automation workflows",
        "Advanced reports",
        "Priority support",
        "Google Calendar sync",
        "Custom fields & tags"
      ],
      cta: "Start Free Trial",
      highlight: true,
      gradient: "from-purple-600 to-blue-600"
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "contact us",
      description: "For large organizations with custom needs",
      features: [
        "Everything in Professional",
        "Dedicated account manager",
        "Custom integrations",
        "SLA guarantees",
        "Advanced security",
        "Custom training",
        "API access",
        "White-label options",
        "On-premise deployment",
        "24/7 phone support"
      ],
      cta: "Contact Sales",
      highlight: false,
      gradient: "from-gray-700 to-gray-900"
    }
  ];

  const faqs = [
    {
      question: "Is there really no per-seat pricing?",
      answer: "Yes! Unlike traditional CRMs, we charge a flat monthly fee regardless of how many users you have. Add your entire team without worrying about costs."
    },
    {
      question: "What's included in the free plan?",
      answer: "The free plan includes all basic CRM features for up to 10 contacts with unlimited users. It's perfect for individuals and very small teams getting started."
    },
    {
      question: "Can I upgrade or downgrade anytime?",
      answer: "Absolutely! You can upgrade or downgrade your plan at any time. Changes take effect immediately and we'll prorate your billing accordingly."
    },
    {
      question: "Do you offer a free trial?",
      answer: "Yes! All paid plans come with a 14-day free trial. No credit card required. Experience all features before making a commitment."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit/debit cards, UPI, net banking, and can also process bank transfers for annual plans."
    },
    {
      question: "Is there a setup fee?",
      answer: "No setup fees, no hidden charges. The price you see is the price you pay."
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
              Grow Without Limits
            </span>
            <br />
            <span className="text-gray-900">Unlimited Users, Always</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 mb-6 max-w-3xl mx-auto leading-relaxed">
            No per-seat fees. No hidden charges. Just straightforward pricing that scales with your business.
          </p>

          <div className="flex items-center justify-center space-x-2 text-lg text-purple-600 font-semibold">
            <Infinity className="w-6 h-6" />
            <span>Add unlimited team members at no extra cost</span>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`border-2 ${
                plan.highlight
                  ? 'border-purple-500 shadow-2xl scale-105'
                  : 'border-gray-200 shadow-lg'
              } hover:shadow-2xl transition-all relative`}
            >
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}
              <CardHeader className="text-center pb-8 pt-10">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center text-white`}>
                  <Users className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-extrabold">{plan.price}</span>
                  {plan.period && (
                    <span className="text-gray-600 ml-2">/ {plan.period}</span>
                  )}
                </div>
                <p className="text-gray-600">{plan.description}</p>
              </CardHeader>
              <CardContent className="px-6 pb-8">
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link to={plan.name === "Enterprise" ? "/contact" : "/signup"} className="block">
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
          ))}
        </div>
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
            Start Your Free Trial Today
          </h2>
          <p className="text-2xl mb-10 text-purple-100">
            No credit card required. Full access to all features for 14 days.
          </p>
          <Link to="/signup">
            <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100 text-xl px-10 py-7 rounded-full shadow-2xl">
              Get Started Free <ArrowRight className="ml-2 w-6 h-6" />
            </Button>
          </Link>
        </div>
      </section>

      <PromoFooter />
    </div>
  );
}
