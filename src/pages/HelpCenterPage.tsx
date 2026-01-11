import { PromoNav } from '@/components/promo/PromoNav';
import { PromoFooter } from '@/components/promo/PromoFooter';
import { Link } from 'react-router-dom';
import {
  Book, MessageSquare, Video, FileText, Search,
  HelpCircle, ArrowRight, Users, Settings, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function HelpCenterPage() {
  const categories = [
    {
      icon: <Book className="w-8 h-8" />,
      title: "Getting Started",
      description: "Learn the basics and set up your account",
      articles: 15,
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Lead Management",
      description: "Track and nurture your leads effectively",
      articles: 22,
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: <MessageSquare className="w-8 h-8" />,
      title: "WhatsApp Integration",
      description: "Connect and use WhatsApp Business",
      articles: 18,
      gradient: "from-green-500 to-emerald-500"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Automation",
      description: "Set up workflows and automations",
      articles: 12,
      gradient: "from-orange-500 to-red-500"
    },
    {
      icon: <Settings className="w-8 h-8" />,
      title: "Settings & Admin",
      description: "Configure your CRM settings",
      articles: 20,
      gradient: "from-indigo-500 to-blue-500"
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: "Reports & Analytics",
      description: "Understand your data and metrics",
      articles: 14,
      gradient: "from-yellow-500 to-orange-500"
    }
  ];

  const popularArticles = [
    "How to import contacts from CSV",
    "Setting up WhatsApp Business API",
    "Creating your first automation workflow",
    "Understanding sales pipeline stages",
    "Generating GST-compliant invoices",
    "Using the AI Assistant effectively",
    "Managing user roles and permissions",
    "Integrating Google Calendar"
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
              How Can We
            </span>
            <br />
            <span className="text-gray-900">Help You?</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            Search our knowledge base or browse by category
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6" />
              <Input
                type="text"
                placeholder="Search for help articles..."
                className="pl-14 pr-4 py-6 text-lg rounded-full border-2 border-gray-300 focus:border-purple-600"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Browse by
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"> Category</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {categories.map((category, index) => (
            <Card key={index} className="border-0 shadow-lg hover:shadow-2xl transition-all cursor-pointer group">
              <CardContent className="p-8">
                <div className={`w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br ${category.gradient} flex items-center justify-center text-white`}>
                  {category.icon}
                </div>
                <h3 className="text-2xl font-bold mb-2 text-gray-900 group-hover:text-purple-600 transition-colors">
                  {category.title}
                </h3>
                <p className="text-gray-600 mb-4">{category.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{category.articles} articles</span>
                  <ArrowRight className="w-5 h-5 text-purple-600 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Popular Articles */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Popular
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"> Articles</span>
            </h2>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="grid md:grid-cols-2 gap-4">
              {popularArticles.map((article, index) => (
                <Card key={index} className="border-0 shadow-md hover:shadow-lg transition-all cursor-pointer group">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <HelpCircle className="w-5 h-5 text-purple-600 flex-shrink-0" />
                        <span className="text-gray-700 group-hover:text-purple-600 transition-colors">
                          {article}
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Resources */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            More
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"> Resources</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <Card className="border-0 shadow-lg hover:shadow-2xl transition-all text-center">
            <CardContent className="p-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white">
                <Video className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Video Tutorials</h3>
              <p className="text-gray-600 mb-6">
                Watch step-by-step video guides for common tasks
              </p>
              <Button variant="outline" className="border-2 border-purple-600 text-purple-600 hover:bg-purple-50">
                Watch Videos
              </Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-2xl transition-all text-center">
            <CardContent className="p-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white">
                <Book className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Documentation</h3>
              <p className="text-gray-600 mb-6">
                Comprehensive guides and technical documentation
              </p>
              <Button variant="outline" className="border-2 border-purple-600 text-purple-600 hover:bg-purple-50">
                Read Docs
              </Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-2xl transition-all text-center">
            <CardContent className="p-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center text-white">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Contact Support</h3>
              <p className="text-gray-600 mb-6">
                Can't find what you need? Our team is here to help
              </p>
              <Link to="/contact">
                <Button variant="outline" className="border-2 border-purple-600 text-purple-600 hover:bg-purple-50">
                  Get Support
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      <PromoFooter />
    </div>
  );
}
