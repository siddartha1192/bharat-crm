import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export function PromoNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-14 h-14 flex items-center justify-center">
              <img
                src="/logo_with_white_background.png"
                alt="NeuraGG Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              NeuraGG CRM
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <div className="flex items-center space-x-6">
              <Link to="/product" className="text-gray-700 hover:text-purple-600 font-medium transition-colors">
                Product
              </Link>
              <Link to="/features" className="text-gray-700 hover:text-purple-600 font-medium transition-colors">
                Features
              </Link>
              <Link to="/pricing" className="text-gray-700 hover:text-purple-600 font-medium transition-colors">
                Pricing
              </Link>
              <Link to="/api" className="text-gray-700 hover:text-purple-600 font-medium transition-colors">
                API
              </Link>
              <Link to="/about" className="text-gray-700 hover:text-purple-600 font-medium transition-colors">
                About
              </Link>
              <Link to="/blog" className="text-gray-700 hover:text-purple-600 font-medium transition-colors">
                Blog
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link to="/signup">
                <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                  Start Free Trial
                </Button>
              </Link>
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-gray-700" />
            ) : (
              <Menu className="w-6 h-6 text-gray-700" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col space-y-4">
              <Link
                to="/product"
                className="text-gray-700 hover:text-purple-600 font-medium transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Product
              </Link>
              <Link
                to="/features"
                className="text-gray-700 hover:text-purple-600 font-medium transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </Link>
              <Link
                to="/pricing"
                className="text-gray-700 hover:text-purple-600 font-medium transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link
                to="/api"
                className="text-gray-700 hover:text-purple-600 font-medium transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                API
              </Link>
              <Link
                to="/about"
                className="text-gray-700 hover:text-purple-600 font-medium transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                About
              </Link>
              <Link
                to="/blog"
                className="text-gray-700 hover:text-purple-600 font-medium transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Blog
              </Link>
              <div className="pt-4 border-t border-gray-200 flex flex-col space-y-2">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full">Login</Button>
                </Link>
                <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                    Start Free Trial
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
