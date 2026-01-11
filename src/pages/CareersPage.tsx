import { PromoNav } from '@/components/promo/PromoNav';
import { PromoFooter } from '@/components/promo/PromoFooter';
import { Link } from 'react-router-dom';
import { Briefcase, MapPin, Clock, ArrowRight, Heart, Zap, Users, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function CareersPage() {
  const positions = [
    {
      title: "Senior Full Stack Engineer",
      department: "Engineering",
      location: "Bangalore / Remote",
      type: "Full-time",
      description: "Build scalable features for our AI-powered CRM platform"
    },
    {
      title: "Product Designer",
      department: "Design",
      location: "Mumbai / Remote",
      type: "Full-time",
      description: "Design intuitive experiences for sales teams"
    },
    {
      title: "Customer Success Manager",
      department: "Customer Success",
      location: "Delhi / Remote",
      type: "Full-time",
      description: "Help customers succeed with NeuraGG CRM"
    },
    {
      title: "AI/ML Engineer",
      department: "Engineering",
      location: "Bangalore / Remote",
      type: "Full-time",
      description: "Develop AI features for our CRM platform"
    },
    {
      title: "Sales Development Representative",
      department: "Sales",
      location: "Remote",
      type: "Full-time",
      description: "Generate and qualify leads for our sales team"
    }
  ];

  const benefits = [
    {
      icon: <Heart className="w-8 h-8" />,
      title: "Health & Wellness",
      description: "Comprehensive health insurance for you and your family"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Flexible Work",
      description: "Remote-first culture with flexible hours"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Great Team",
      description: "Work with passionate, talented people"
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: "Learning Budget",
      description: "Annual budget for courses and conferences"
    }
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
              Join Our Team
            </span>
            <br />
            <span className="text-gray-900">Build the Future of CRM</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            We're building world-class CRM technology for Indian businesses.
            Join us in our mission to democratize sales automation.
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Why Join
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"> NeuraGG?</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => (
            <Card key={index} className="border-0 shadow-lg hover:shadow-2xl transition-all text-center">
              <CardContent className="p-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white">
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Open Positions */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Open
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"> Positions</span>
          </h2>
          <p className="text-xl text-gray-600">
            Find your next opportunity
          </p>
        </div>

        <div className="space-y-4">
          {positions.map((position, index) => (
            <Card key={index} className="border-0 shadow-lg hover:shadow-2xl transition-all cursor-pointer group">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2 text-gray-900 group-hover:text-purple-600 transition-colors">
                      {position.title}
                    </h3>
                    <p className="text-gray-600 mb-3">{position.description}</p>
                    <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Briefcase className="w-4 h-4 mr-1" />
                        {position.department}
                      </div>
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {position.location}
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {position.type}
                      </div>
                    </div>
                  </div>
                  <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 whitespace-nowrap">
                    Apply Now <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-purple-600 to-blue-600 py-20 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Don't See a Perfect Fit?
          </h2>
          <p className="text-2xl mb-10 text-purple-100">
            We're always looking for talented people. Send us your resume!
          </p>
          <Link to="/contact">
            <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100 text-xl px-10 py-7 rounded-full shadow-2xl">
              Get in Touch <ArrowRight className="ml-2 w-6 h-6" />
            </Button>
          </Link>
        </div>
      </section>

      <PromoFooter />
    </div>
  );
}
