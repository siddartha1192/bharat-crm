import { PromoNav } from '@/components/promo/PromoNav';
import { PromoFooter } from '@/components/promo/PromoFooter';
import { Calendar, User, ArrowRight, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function BlogPage() {
  const posts = [
    {
      title: "10 Ways AI is Transforming Sales Teams in 2026",
      excerpt: "Discover how artificial intelligence is revolutionizing the way sales teams work, from lead scoring to automated follow-ups.",
      date: "Jan 8, 2026",
      author: "NeuraGG Team",
      category: "AI & Automation",
      image: "🤖"
    },
    {
      title: "WhatsApp for Business: The Complete Guide",
      excerpt: "Learn how to leverage WhatsApp Business API to connect with customers and close more deals faster.",
      date: "Jan 5, 2026",
      author: "NeuraGG Team",
      category: "WhatsApp",
      image: "💬"
    },
    {
      title: "How to Choose the Right CRM for Your Business",
      excerpt: "A comprehensive guide to evaluating CRM solutions and finding the perfect fit for your team.",
      date: "Jan 2, 2026",
      author: "NeuraGG Team",
      category: "CRM Guide",
      image: "📊"
    },
    {
      title: "Sales Forecasting: Predict Revenue with Confidence",
      excerpt: "Master the art of sales forecasting using AI-powered analytics and historical data.",
      date: "Dec 28, 2025",
      author: "NeuraGG Team",
      category: "Sales",
      image: "📈"
    },
    {
      title: "Building a High-Performance Sales Pipeline",
      excerpt: "Best practices for creating and managing a sales pipeline that drives consistent results.",
      date: "Dec 25, 2025",
      author: "NeuraGG Team",
      category: "Sales",
      image: "⚡"
    },
    {
      title: "The Future of Customer Relationship Management",
      excerpt: "Exploring emerging trends and technologies shaping the future of CRM.",
      date: "Dec 20, 2025",
      author: "NeuraGG Team",
      category: "Industry Trends",
      image: "🚀"
    }
  ];

  const categories = ["All Posts", "AI & Automation", "WhatsApp", "CRM Guide", "Sales", "Industry Trends"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <PromoNav />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-blue-600/10 to-cyan-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
              NeuraGG
            </span>
            <br />
            <span className="text-gray-900">Blog</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            Insights, tips, and best practices for modern sales teams
          </p>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="flex flex-wrap justify-center gap-3">
          {categories.map((category, index) => (
            <Button
              key={index}
              variant={index === 0 ? "default" : "outline"}
              className={index === 0
                ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                : "border-2 border-gray-300 hover:border-purple-600"
              }
            >
              <Tag className="w-4 h-4 mr-2" />
              {category}
            </Button>
          ))}
        </div>
      </section>

      {/* Blog Posts */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post, index) => (
            <Card key={index} className="border-0 shadow-lg hover:shadow-2xl transition-all cursor-pointer group">
              <CardContent className="p-0">
                <div className="bg-gradient-to-br from-purple-600 to-blue-600 h-48 flex items-center justify-center text-8xl">
                  {post.image}
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-purple-100 text-purple-600">
                      {post.category}
                    </span>
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="w-4 h-4 mr-1" />
                      {post.date}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-gray-900 group-hover:text-purple-600 transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-500">
                      <User className="w-4 h-4 mr-1" />
                      {post.author}
                    </div>
                    <Button variant="ghost" size="sm" className="text-purple-600 hover:text-purple-700">
                      Read More <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button size="lg" variant="outline" className="border-2 border-purple-600 text-purple-600 hover:bg-purple-50">
            Load More Posts
          </Button>
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-gradient-to-br from-purple-600 to-blue-600 py-20 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Subscribe to Our Newsletter
          </h2>
          <p className="text-2xl mb-10 text-purple-100">
            Get the latest CRM insights and tips delivered to your inbox
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-6 py-4 rounded-full text-gray-900 focus:outline-none focus:ring-2 focus:ring-white"
            />
            <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100 px-8 py-4 rounded-full">
              Subscribe
            </Button>
          </div>
        </div>
      </section>

      <PromoFooter />
    </div>
  );
}
