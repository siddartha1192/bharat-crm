import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function Signup() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 space-y-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Public Signup Disabled
            </h1>
            <p className="mt-2 text-gray-600">
              For security reasons, public account creation is not available.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
            <h2 className="font-semibold text-blue-900 mb-2">How to get access:</h2>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Contact your organization administrator to request an invitation</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>If you received an invitation email, use the link provided</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Already have an account? Login below</span>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <Link to="/login" className="block">
              <Button className="w-full" size="lg">
                Go to Login
              </Button>
            </Link>

            <p className="text-xs text-gray-500">
              Need help? Contact your system administrator
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
