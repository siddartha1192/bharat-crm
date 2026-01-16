import { Navigate } from 'react-router-dom';
import { usePlanFeatures } from '@/hooks/usePlanFeatures';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProtectedAIRouteProps {
  children: React.ReactNode;
}

/**
 * Component to protect AI feature routes
 * Redirects to upgrade page if user's plan doesn't include AI features
 */
export function ProtectedAIRoute({ children }: ProtectedAIRouteProps) {
  const { hasAIFeatures, planName } = usePlanFeatures();

  // If user has AI features, render the children
  if (hasAIFeatures) {
    return <>{children}</>;
  }

  // Otherwise show upgrade message
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card className="border-2 border-orange-200 bg-orange-50/50">
        <CardContent className="p-8">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                <Lock className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-orange-700" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-gray-900">
                AI Features Not Available
              </h2>
              <p className="text-lg text-gray-600">
                Your current plan: <span className="font-semibold text-orange-600">{planName}</span>
              </p>
            </div>

            <Alert className="bg-white border-orange-300">
              <AlertTitle className="text-orange-800 font-semibold">
                Upgrade to Access AI Features
              </AlertTitle>
              <AlertDescription className="text-gray-700 mt-2">
                AI Chatbot and AI Calls are available on the Professional and Enterprise plans.
                Upgrade your plan to unlock these powerful features and boost your productivity.
              </AlertDescription>
            </Alert>

            <div className="space-y-3 w-full max-w-md">
              <h3 className="font-semibold text-gray-900">What you'll get:</h3>
              <ul className="text-left space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>AI-powered chatbot for customer support</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Automated AI call handling and transcription</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Smart insights and recommendations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Natural language processing for better customer interactions</span>
                </li>
              </ul>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                size="lg"
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                onClick={() => window.location.href = '/pricing'}
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Upgrade Now
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => window.history.back()}
              >
                Go Back
              </Button>
            </div>

            <p className="text-sm text-gray-500">
              Have questions? Contact your organization admin or our sales team.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
