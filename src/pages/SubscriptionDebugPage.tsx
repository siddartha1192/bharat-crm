import { useAuth } from '@/contexts/AuthContext';
import { usePlanFeatures } from '@/hooks/usePlanFeatures';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

/**
 * Diagnostic page for debugging subscription and plan features
 * Access at: /debug/subscription
 */
export default function SubscriptionDebugPage() {
  const { user, token, isAuthenticated } = useAuth();
  const planFeatures = usePlanFeatures();

  const InfoRow = ({ label, value, status }: { label: string; value: any; status?: 'success' | 'error' | 'warning' }) => {
    const getIcon = () => {
      if (!status) return null;
      switch (status) {
        case 'success':
          return <CheckCircle2 className="w-4 h-4 text-green-500" />;
        case 'error':
          return <XCircle className="w-4 h-4 text-red-500" />;
        case 'warning':
          return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      }
    };

    return (
      <div className="flex items-center justify-between py-2 border-b last:border-b-0">
        <div className="flex items-center gap-2">
          {getIcon()}
          <span className="font-medium text-gray-700">{label}:</span>
        </div>
        <span className="text-gray-900 font-mono text-sm">
          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
        </span>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Subscription Debug Panel</h1>
        <p className="text-gray-600 mt-2">
          Diagnostic information for subscription and feature access issues
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Authentication Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Authentication Status
              {isAuthenticated ? (
                <Badge className="bg-green-500">Authenticated</Badge>
              ) : (
                <Badge variant="destructive">Not Authenticated</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <InfoRow
              label="User ID"
              value={user?.id || 'Not loaded'}
              status={user?.id ? 'success' : 'error'}
            />
            <InfoRow
              label="User Email"
              value={user?.email || 'Not loaded'}
              status={user?.email ? 'success' : 'error'}
            />
            <InfoRow
              label="User Name"
              value={user?.name || 'Not loaded'}
              status={user?.name ? 'success' : 'error'}
            />
            <InfoRow
              label="User Role"
              value={user?.role || 'Not loaded'}
              status={user?.role ? 'success' : 'error'}
            />
            <InfoRow
              label="Token Present"
              value={token ? 'Yes' : 'No'}
              status={token ? 'success' : 'error'}
            />
          </CardContent>
        </Card>

        {/* Tenant Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Tenant Information
              {user?.tenant ? (
                <Badge className="bg-blue-500">Loaded</Badge>
              ) : (
                <Badge variant="destructive">Not Loaded</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <InfoRow
              label="Tenant ID"
              value={user?.tenant?.id || 'Not loaded'}
              status={user?.tenant?.id ? 'success' : 'error'}
            />
            <InfoRow
              label="Tenant Name"
              value={user?.tenant?.name || 'Not loaded'}
              status={user?.tenant?.name ? 'success' : 'error'}
            />
            <InfoRow
              label="Tenant Slug"
              value={user?.tenant?.slug || 'Not loaded'}
              status={user?.tenant?.slug ? 'success' : 'error'}
            />
            <InfoRow
              label="Tenant Status"
              value={user?.tenant?.status || 'Not loaded'}
              status={user?.tenant?.status ? 'success' : 'error'}
            />
          </CardContent>
        </Card>

        {/* Subscription Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Subscription Plan
              {user?.tenant?.plan ? (
                <Badge
                  className={
                    user.tenant.plan === 'FREE'
                      ? 'bg-gray-500'
                      : user.tenant.plan === 'STANDARD'
                      ? 'bg-blue-500'
                      : user.tenant.plan === 'PROFESSIONAL'
                      ? 'bg-purple-500'
                      : 'bg-orange-500'
                  }
                >
                  {user.tenant.plan}
                </Badge>
              ) : (
                <Badge variant="destructive">Unknown</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <InfoRow
              label="Plan"
              value={user?.tenant?.plan || 'Not loaded'}
              status={user?.tenant?.plan ? 'success' : 'error'}
            />
            <InfoRow
              label="Subscription Start"
              value={
                user?.tenant?.subscriptionStart
                  ? new Date(user.tenant.subscriptionStart).toLocaleDateString()
                  : 'Not set'
              }
              status={user?.tenant?.subscriptionStart ? 'success' : 'warning'}
            />
            <InfoRow
              label="Subscription End"
              value={
                user?.tenant?.subscriptionEnd
                  ? new Date(user.tenant.subscriptionEnd).toLocaleDateString()
                  : 'Not set'
              }
              status={user?.tenant?.subscriptionEnd ? 'success' : 'warning'}
            />
            <InfoRow
              label="Days Remaining"
              value={
                user?.tenant?.subscriptionEnd
                  ? Math.ceil(
                      (new Date(user.tenant.subscriptionEnd).getTime() - Date.now()) /
                        (1000 * 60 * 60 * 24)
                    )
                  : 'N/A'
              }
              status={
                user?.tenant?.subscriptionEnd
                  ? Math.ceil(
                      (new Date(user.tenant.subscriptionEnd).getTime() - Date.now()) /
                        (1000 * 60 * 60 * 24)
                    ) > 7
                    ? 'success'
                    : Math.ceil(
                        (new Date(user.tenant.subscriptionEnd).getTime() - Date.now()) /
                          (1000 * 60 * 60 * 24)
                      ) > 0
                    ? 'warning'
                    : 'error'
                  : undefined
              }
            />
          </CardContent>
        </Card>

        {/* Plan Features */}
        <Card>
          <CardHeader>
            <CardTitle>Plan Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <InfoRow
              label="Plan Name"
              value={planFeatures.planName}
              status="success"
            />
            <InfoRow
              label="Has AI Features"
              value={planFeatures.hasAIFeatures ? 'YES' : 'NO'}
              status={planFeatures.hasAIFeatures ? 'success' : 'error'}
            />
            <InfoRow
              label="Has API Access"
              value={planFeatures.hasAPIAccess ? 'YES' : 'NO'}
              status={planFeatures.hasAPIAccess ? 'success' : 'warning'}
            />
            <InfoRow
              label="Has Premium Features"
              value={planFeatures.hasPremiumFeatures ? 'YES' : 'NO'}
              status={planFeatures.hasPremiumFeatures ? 'success' : 'warning'}
            />
            <InfoRow
              label="Max Users"
              value={planFeatures.maxUsers}
              status="success"
            />
          </CardContent>
        </Card>

        {/* Plan Type Flags */}
        <Card>
          <CardHeader>
            <CardTitle>Plan Type Flags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <InfoRow
              label="Is Free Plan"
              value={planFeatures.isFreePlan ? 'YES' : 'NO'}
              status={planFeatures.isFreePlan ? 'success' : undefined}
            />
            <InfoRow
              label="Is Standard Plan"
              value={planFeatures.isStandardPlan ? 'YES' : 'NO'}
              status={planFeatures.isStandardPlan ? 'success' : undefined}
            />
            <InfoRow
              label="Is Professional Plan"
              value={planFeatures.isProfessionalPlan ? 'YES' : 'NO'}
              status={planFeatures.isProfessionalPlan ? 'success' : undefined}
            />
            <InfoRow
              label="Is Enterprise Plan"
              value={planFeatures.isEnterprisePlan ? 'YES' : 'NO'}
              status={planFeatures.isEnterprisePlan ? 'success' : undefined}
            />
          </CardContent>
        </Card>

        {/* Expected Behavior */}
        <Card>
          <CardHeader>
            <CardTitle>Expected Sidebar Behavior</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <InfoRow
              label="AI Calls Visible"
              value={planFeatures.hasAIFeatures ? 'YES (should show)' : 'NO (should hide)'}
              status={planFeatures.hasAIFeatures ? 'success' : 'warning'}
            />
            <InfoRow
              label="AI Assistant Visible"
              value={planFeatures.hasAIFeatures ? 'YES (should show)' : 'NO (should hide)'}
              status={planFeatures.hasAIFeatures ? 'success' : 'warning'}
            />
            <InfoRow
              label="Can Access AI Routes"
              value={
                planFeatures.hasAIFeatures
                  ? 'YES (allowed)'
                  : 'NO (should show upgrade prompt)'
              }
              status={planFeatures.hasAIFeatures ? 'success' : 'warning'}
            />
          </CardContent>
        </Card>
      </div>

      {/* Raw Data Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Raw Data (for debugging)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm text-gray-700 mb-2">User Object:</h3>
              <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto">
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-gray-700 mb-2">Plan Features Object:</h3>
              <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto">
                {JSON.stringify(planFeatures, null, 2)}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="mt-6 border-yellow-300 bg-yellow-50">
        <CardHeader>
          <CardTitle className="text-yellow-800">
            How to Use This Debug Panel
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-yellow-900 space-y-2">
          <p>
            <strong>1. Check Authentication Status:</strong> Ensure user is logged in and all
            fields are loaded.
          </p>
          <p>
            <strong>2. Check Tenant Information:</strong> Verify tenant is loaded with correct ID
            and name.
          </p>
          <p>
            <strong>3. Check Subscription Plan:</strong> Verify the plan matches what you expect
            (FREE, STANDARD, PROFESSIONAL, or ENTERPRISE).
          </p>
          <p>
            <strong>4. Check Plan Features:</strong> For STANDARD plan, "Has AI Features" should be
            NO. For FREE, PROFESSIONAL, and ENTERPRISE, it should be YES.
          </p>
          <p>
            <strong>5. Check Expected Behavior:</strong> This shows what should happen in the
            sidebar based on the current plan.
          </p>
          <p>
            <strong>6. Check Browser Console:</strong> Look for [usePlanFeatures] and [Sidebar
            Debug] logs for additional details.
          </p>
          <p className="mt-4 font-semibold">
            If the plan shows FREE but you expect STANDARD, update the tenant in the database.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
