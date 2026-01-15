import { PromoNav } from '@/components/promo/PromoNav';
import { PromoFooter } from '@/components/promo/PromoFooter';
import { Link } from 'react-router-dom';
import { Target, Users, Heart, Zap, ArrowRight, Globe, TrendingUp, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function AboutPage() {
  const values = [
    {
      icon: <Target className="w-8 h-8" />,
      title: "Customer First",
      description: "Every decision we make starts with how it benefits our customers"
    },
    {
      icon: <Heart className="w-8 h-8" />,
      title: "Built for India",
      description: "Designed specifically for Indian businesses with local integrations"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Innovation",
      description: "Constantly evolving with AI and automation at our core"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Transparency",
      description: "No hidden fees, no surprises - just honest pricing"
    }
  ];

  const stats = [
    { number: "500+", label: "Active Businesses", icon: <Globe className="w-6 h-6" /> },
    { number: "50K+", label: "Contacts Managed", icon: <Users className="w-6 h-6" /> },
    { number: "99.9%", label: "Uptime", icon: <TrendingUp className="w-6 h-6" /> },
    { number: "24/7", label: "Support", icon: <Award className="w-6 h-6" /> }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <PromoNav />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-blue-600/10 to-cyan-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Empowering Businesses
            </span>
            <br />
            <span className="text-gray-900">With AI-Powered CRM</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            We're on a mission to make world-class CRM technology accessible to every business in India,
            regardless of size or budget.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Card key={index} className="border-0 shadow-lg bg-white hover:scale-105 transition-transform">
              <CardContent className="p-6 text-center">
                <div className="flex justify-center mb-2 text-purple-600">
                  {stat.icon}
                </div>
                <div className="text-4xl font-extrabold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-1">
                  {stat.number}
                </div>
                <div className="text-sm text-gray-600 font-medium">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Our
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"> Mission</span>
          </h2>
          <p className="text-xl text-gray-600 leading-relaxed mb-8">
            Traditional CRMs are expensive, complex, and charge per user - making them inaccessible
            to small and medium businesses. We're changing that.
          </p>
          <p className="text-xl text-gray-600 leading-relaxed">
            NeuraGG CRM combines powerful features like WhatsApp integration, AI assistance, and
            unlimited users at a fraction of the cost. We believe every business deserves access
            to world-class tools to grow and succeed.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Our
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"> Values</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-2xl transition-all text-center">
                <CardContent className="p-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white">
                    {value.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-gray-900">{value.title}</h3>
                  <p className="text-gray-600">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Built by a Team That
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"> Cares</span>
          </h2>
          <p className="text-xl text-gray-600 leading-relaxed">
            We're a team of engineers, designers, and business experts passionate about helping
            Indian businesses thrive. Based in India, we understand the unique challenges and
            opportunities of the Indian market.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-purple-600 to-blue-600 py-20 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Join Us on Our Journey
          </h2>
          <p className="text-2xl mb-10 text-purple-100">
            Be part of the CRM revolution in India
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link to="/contact">
              <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100 text-xl px-10 py-7 rounded-full shadow-2xl">
                Request Demo <ArrowRight className="ml-2 w-6 h-6" />
              </Button>
            </Link>
            <Link to="/careers">
              <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 text-xl px-10 py-7 rounded-full">
                Join Our Team
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <PromoFooter />
    </div>
  );
}
