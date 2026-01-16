import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Check, Clock, CreditCard, Users, Zap, Crown, Building2 } from 'lucide-react';
import { format } from 'date-fns';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface TenantInfo {
  id: string;
  name: string;
  plan: 'FREE' | 'STANDARD' | 'PROFESSIONAL' | 'ENTERPRISE';
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'CANCELLED';
  subscriptionStart: string | null;
  subscriptionEnd: string | null;
  maxUsers: number;
}

const planDetails = {
  FREE: {
    name: 'Free Trial',
    price: 'Free',
    duration: '25 days',
    icon: Clock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    features: [
      'All features included',
      'AI Chatbot & AI Calls',
      'WhatsApp Integration',
      'Up to 5 users',
      '25-day trial period',
    ],
  },
  STANDARD: {
    name: 'Standard',
    price: '₹999',
    duration: 'per month',
    icon: CreditCard,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    features: [
      'All core features',
      'WhatsApp Integration',
      'Email Campaigns',
      'Up to 25 users',
      'No AI features',
    ],
  },
  PROFESSIONAL: {
    name: 'Professional',
    price: '₹1,300',
    duration: 'per month',
    icon: Zap,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    features: [
      'All features included',
      'AI Chatbot & AI Calls',
      'Advanced Analytics',
      'Up to 100 users',
      'Priority Support',
    ],
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 'Custom',
    duration: 'contact sales',
    icon: Building2,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    features: [
      'All features included',
      'API Access',
      'Unlimited users',
      'Custom integrations',
      'Dedicated support',
    ],
  },
};

export function SubscriptionManagement() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('');

  useEffect(() => {
    fetchTenantInfo();
  }, []);

  const fetchTenantInfo = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch tenant info');

      const data = await response.json();
      if (data.tenant) {
        setTenant(data.tenant);
        setSelectedPlan(data.tenant.plan);
      }
    } catch (error) {
      console.error('Error fetching tenant info:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load subscription information',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePlan = async () => {
    if (!tenant || !selectedPlan || selectedPlan === tenant.plan) return;

    setUpdating(true);
    try {
      const response = await fetch(`${API_URL}/tenants/${tenant.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan: selectedPlan,
          status: selectedPlan === 'FREE' ? 'TRIAL' : 'ACTIVE',
          subscriptionStart: new Date().toISOString(),
          subscriptionEnd:
            selectedPlan === 'FREE'
              ? new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString()
              : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year for paid plans
          maxUsers:
            selectedPlan === 'FREE'
              ? 5
              : selectedPlan === 'STANDARD'
              ? 25
              : selectedPlan === 'PROFESSIONAL'
              ? 100
              : 500,
        }),
      });

      if (!response.ok) throw new Error('Failed to update plan');

      toast({
        title: 'Success',
        description: 'Subscription plan updated successfully',
      });

      // Refresh tenant info
      await fetchTenantInfo();

      // Refresh user data to update UI
      window.location.reload();
    } catch (error) {
      console.error('Error updating plan:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update subscription plan',
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading subscription...</p>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">Failed to load tenant information</p>
        </CardContent>
      </Card>
    );
  }

  const currentPlanDetails = planDetails[tenant.plan];
  const Icon = currentPlanDetails.icon;

  return (
    <div className="space-y-6">
      {/* Current Subscription Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-600" />
            Current Subscription
          </CardTitle>
          <CardDescription>Manage your organization's subscription plan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Plan Info */}
            <div className={`p-6 rounded-lg border-2 ${currentPlanDetails.bgColor}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-5 h-5 ${currentPlanDetails.color}`} />
                    <h3 className="text-lg font-semibold">{currentPlanDetails.name}</h3>
                  </div>
                  <p className="text-2xl font-bold">
                    {currentPlanDetails.price}
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      {currentPlanDetails.duration}
                    </span>
                  </p>
                </div>
                <Badge
                  variant={tenant.status === 'ACTIVE' ? 'default' : 'secondary'}
                  className="capitalize"
                >
                  {tenant.status.toLowerCase()}
                </Badge>
              </div>

              <div className="space-y-2 mb-4">
                {currentPlanDetails.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Max Users:</span>
                  <span className="font-medium">{tenant.maxUsers}</span>
                </div>
                {tenant.subscriptionStart && (
                  <div className="flex justify-between">
                    <span>Started:</span>
                    <span className="font-medium">
                      {format(new Date(tenant.subscriptionStart), 'MMM dd, yyyy')}
                    </span>
                  </div>
                )}
                {tenant.subscriptionEnd && (
                  <div className="flex justify-between">
                    <span>
                      {tenant.plan === 'FREE' ? 'Trial Ends:' : 'Renews:'}
                    </span>
                    <span className="font-medium">
                      {format(new Date(tenant.subscriptionEnd), 'MMM dd, yyyy')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Change Plan Section */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Change Plan</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Select a new plan for your organization
                </p>
              </div>

              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FREE">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>Free Trial (25 days)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="STANDARD">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      <span>Standard (₹999/month)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="PROFESSIONAL">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      <span>Professional (₹1,300/month)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="ENTERPRISE">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      <span>Enterprise (Custom)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {selectedPlan && selectedPlan !== tenant.plan && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-sm mb-2">
                    Switching to {planDetails[selectedPlan as keyof typeof planDetails].name}
                  </h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    {planDetails[selectedPlan as keyof typeof planDetails].features.map(
                      (feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <Check className="w-3 h-3 text-green-600" />
                          {feature}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}

              <Button
                onClick={handleUpdatePlan}
                disabled={updating || selectedPlan === tenant.plan}
                className="w-full"
                size="lg"
              >
                {updating ? 'Updating...' : 'Update Subscription Plan'}
              </Button>

              {selectedPlan === tenant.plan && (
                <p className="text-sm text-muted-foreground text-center">
                  This is your current plan
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* All Plans Overview */}
      <Card>
        <CardHeader>
          <CardTitle>All Available Plans</CardTitle>
          <CardDescription>Compare features across all subscription plans</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(planDetails).map(([key, details]) => {
              const Icon = details.icon;
              const isCurrentPlan = key === tenant.plan;

              return (
                <div
                  key={key}
                  className={`p-4 rounded-lg border-2 ${
                    isCurrentPlan
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  } transition-colors`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-5 h-5 ${details.color}`} />
                    <h4 className="font-semibold">{details.name}</h4>
                    {isCurrentPlan && (
                      <Badge variant="default" className="ml-auto text-xs">
                        Current
                      </Badge>
                    )}
                  </div>
                  <p className="text-xl font-bold mb-1">
                    {details.price}
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      {details.duration}
                    </span>
                  </p>
                  <ul className="space-y-1 text-sm">
                    {details.features.slice(0, 3).map((feature, index) => (
                      <li key={index} className="flex items-start gap-1">
                        <Check className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Organization Info */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Information</CardTitle>
          <CardDescription>Basic details about your organization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Organization</span>
              </div>
              <p className="font-semibold">{tenant.name}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">User Limit</span>
              </div>
              <p className="font-semibold">{tenant.maxUsers} users</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Plan ID</span>
              </div>
              <p className="font-semibold">{tenant.id.slice(0, 8)}...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
