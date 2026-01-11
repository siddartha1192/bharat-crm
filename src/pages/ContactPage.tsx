import { PromoNav } from '@/components/promo/PromoNav';
import { PromoFooter } from '@/components/promo/PromoFooter';
import {
  Mail, Phone, MapPin, Send, Loader2, CheckCircle, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PhoneInput } from '@/components/shared/PhoneInput';
import { useState } from 'react';
import axios from 'axios';

export default function ContactPage() {
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

  const contactMethods = [
    {
      icon: <Mail className="w-6 h-6" />,
      title: "Email Us",
      value: "hello@neuragg.com",
      description: "Get a response within 24 hours",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: <Phone className="w-6 h-6" />,
      title: "Call Us",
      value: "+91 80-1234-5678",
      description: "Mon-Fri, 9 AM - 6 PM IST",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: "WhatsApp",
      value: "+91 98765-43210",
      description: "Chat with us anytime",
      gradient: "from-green-500 to-emerald-500"
    },
    {
      icon: <MapPin className="w-6 h-6" />,
      title: "Office",
      value: "Bangalore, India",
      description: "Visit us by appointment",
      gradient: "from-orange-500 to-red-500"
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
              Get in Touch
            </span>
            <br />
            <span className="text-gray-900">We're Here to Help</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            Have questions? Want to see a demo? Our team is ready to assist you.
          </p>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {contactMethods.map((method, index) => (
            <Card key={index} className="border-0 shadow-lg hover:shadow-2xl transition-all text-center">
              <CardContent className="p-6">
                <div className={`w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br ${method.gradient} flex items-center justify-center text-white`}>
                  {method.icon}
                </div>
                <h3 className="text-lg font-bold mb-1 text-gray-900">{method.title}</h3>
                <p className="text-purple-600 font-semibold mb-1">{method.value}</p>
                <p className="text-sm text-gray-500">{method.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Contact Form */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <Card className="border-0 shadow-2xl">
          <CardContent className="p-8 md:p-12">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
                Send Us a Message
              </h2>
              <p className="text-xl text-gray-600">
                Fill out the form below and we'll get back to you shortly
              </p>
            </div>

            {submitSuccess ? (
              <div className="bg-green-50 border-2 border-green-500 rounded-2xl p-8 text-center">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-green-900 mb-2">Thank You!</h3>
                <p className="text-green-700 text-lg">
                  We've received your message and will be in touch shortly.
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
                    Your Message <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    id="message"
                    name="message"
                    required
                    value={formData.message}
                    onChange={handleInputChange}
                    placeholder="Tell us how we can help you..."
                    rows={6}
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
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Message <Send className="ml-2 w-5 h-5" />
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </section>

      <PromoFooter />
    </div>
  );
}
