import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, Mail, Lock, Loader2, User, Briefcase, Building } from 'lucide-react';

interface Tenant {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  role: string;
}

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showTenantSelection, setShowTenantSelection] = useState(false);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, loginWithGoogle } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Use AuthContext login function
      const result = await login(formData.email, formData.password);

      // Check if tenant selection is required
      if (result.requiresTenantSelection && result.tenants) {
        setAvailableTenants(result.tenants);
        setShowTenantSelection(true);
        setLoading(false);
        return;
      }

      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.',
      });

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Auth error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Authentication failed. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTenantSelect = async (tenantId: string) => {
    setLoading(true);
    try {
      // Login with selected tenant
      await login(formData.email, formData.password, tenantId);

      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.',
      });

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Auth error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Authentication failed. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Show tenant selection screen if needed
  if (showTenantSelection) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Building className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Select Organization</h1>
            <p className="text-muted-foreground">
              You have accounts in multiple organizations. Please select which one to sign in to.
            </p>
          </div>

          <div className="space-y-3">
            {availableTenants.map((tenant) => (
              <Button
                key={tenant.tenantId}
                variant="outline"
                className="w-full h-auto p-4 flex items-start gap-3 hover:border-primary"
                onClick={() => handleTenantSelect(tenant.tenantId)}
                disabled={loading}
              >
                <Building className="w-5 h-5 mt-0.5 text-primary" />
                <div className="flex-1 text-left">
                  <div className="font-semibold">{tenant.tenantName}</div>
                  <div className="text-xs text-muted-foreground">Role: {tenant.role}</div>
                </div>
              </Button>
            ))}
          </div>

          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              setShowTenantSelection(false);
              setAvailableTenants([]);
            }}
            disabled={loading}
          >
            Back to Login
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        {/* Logo and Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Building2 className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground">CLiM</h1>
          <p className="text-muted-foreground">
            Welcome back! Please login to continue.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                className="pl-10"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Logging in...
              </>
            ) : (
              'Login'
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        {/* Google Sign In */}
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={async () => {
            try {
              setLoading(true);
              await loginWithGoogle();
            } catch (error: any) {
              toast({
                title: 'Error',
                description: error.message || 'Failed to sign in with Google',
                variant: 'destructive'
              });
              setLoading(false);
            }
          }}
          disabled={loading}
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Sign in with Google
        </Button>

        {/* Account access notice */}
        <div className="text-center text-sm">
          <p className="text-muted-foreground">
            Need access? <Link to="/contact" className="text-primary hover:underline">Contact your administrator</Link>
          </p>
        </div>

        {/* Indian CRM Notice */}
        <div className="text-center pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Built for Indian businesses with GST compliance
          </p>
        </div>
      </Card>
    </div>
  );
}
