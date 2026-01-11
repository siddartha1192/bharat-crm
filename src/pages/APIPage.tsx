import { PromoNav } from '@/components/promo/PromoNav';
import { PromoFooter } from '@/components/promo/PromoFooter';
import { Link } from 'react-router-dom';
import { Code, Zap, Shield, Book, Terminal, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function APIPage() {
  const apiFeatures = [
    {
      icon: <Code className="w-8 h-8" />,
      title: "RESTful API",
      description: "Simple, predictable REST API with comprehensive documentation"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Real-time Webhooks",
      description: "Get instant notifications for CRM events"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Secure Authentication",
      description: "OAuth 2.0 and API key authentication"
    },
    {
      icon: <Book className="w-8 h-8" />,
      title: "Complete Documentation",
      description: "Detailed guides, examples, and SDKs"
    }
  ];

  const endpoints = [
    {
      method: "GET",
      path: "/api/leads",
      description: "List all leads"
    },
    {
      method: "POST",
      path: "/api/leads",
      description: "Create a new lead"
    },
    {
      method: "GET",
      path: "/api/contacts/{id}",
      description: "Get contact details"
    },
    {
      method: "PUT",
      path: "/api/deals/{id}",
      description: "Update deal information"
    },
    {
      method: "POST",
      path: "/api/whatsapp/send",
      description: "Send WhatsApp message"
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
            <Terminal className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-semibold text-purple-600">Developer API</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Build Custom Integrations
            </span>
            <br />
            <span className="text-gray-900">With Our Powerful API</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            Connect NeuraGG CRM with your existing tools and workflows using our comprehensive REST API.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link to="/contact">
              <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-lg px-8 py-6 rounded-full shadow-xl">
                Get API Access <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6 rounded-full border-2 border-purple-600 text-purple-600 hover:bg-purple-50">
              View Documentation
            </Button>
          </div>
        </div>
      </section>

      {/* API Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            API
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"> Features</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {apiFeatures.map((feature, index) => (
            <Card key={index} className="border-0 shadow-lg hover:shadow-2xl transition-all">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Example Code */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-start">
          <div>
            <h2 className="text-4xl font-bold mb-6 text-gray-900">
              Simple & Intuitive
            </h2>
            <p className="text-xl text-gray-600 mb-6">
              Our API is designed to be easy to use and understand. Get started in minutes with our comprehensive documentation and code examples.
            </p>
            <h3 className="text-2xl font-bold mb-4 text-gray-900">Popular Endpoints</h3>
            <div className="space-y-3">
              {endpoints.map((endpoint, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-white rounded-lg shadow">
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${
                    endpoint.method === 'GET' ? 'bg-blue-100 text-blue-700' :
                    endpoint.method === 'POST' ? 'bg-green-100 text-green-700' :
                    'bg-orange-100 text-orange-700'
                  }`}>
                    {endpoint.method}
                  </span>
                  <div className="flex-1">
                    <code className="text-sm font-mono text-gray-800">{endpoint.path}</code>
                    <p className="text-xs text-gray-600 mt-1">{endpoint.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <Card className="border-0 shadow-2xl bg-gray-900 text-white overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2 mb-4 text-gray-400">
                  <Code className="w-5 h-5" />
                  <span className="text-sm">Example Request</span>
                </div>
                <pre className="text-sm overflow-x-auto">
                  <code className="text-green-400">
{`// Create a new lead
const response = await fetch(
  'https://api.neuragg.com/v1/leads',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+919876543210',
      company: 'Acme Corp',
      source: 'website'
    })
  }
);

const lead = await response.json();
console.log(lead);`}
                  </code>
                </pre>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-purple-600 to-blue-600 py-20 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Build?
          </h2>
          <p className="text-2xl mb-10 text-purple-100">
            Get API access with our Enterprise plan
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link to="/contact">
              <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100 text-xl px-10 py-7 rounded-full shadow-2xl">
                Contact Sales <ArrowRight className="ml-2 w-6 h-6" />
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
