import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle, Building } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface Tenant {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  role: string;
}

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error' | 'tenant-selection'>('processing');
  const [message, setMessage] = useState('Authenticating with Google...');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [authCode, setAuthCode] = useState<string>('');

  useEffect(() => {
    console.log('🔍 AuthCallback mounted');
    console.log('📍 Current URL:', window.location.href);
    console.log('🔑 Code from URL:', searchParams.get('code'));

    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        console.log('🚀 Starting Google OAuth callback handling...');

        // Check for errors from Google
        if (error) {
          console.error('❌ OAuth error from Google:', error);
          setStatus('error');
          setMessage(`Authentication failed: ${error}`);
          setTimeout(() => {
            window.location.href = '/login';
          }, 3000);
          return;
        }

        // Check if code exists
        if (!code) {
          console.error('❌ No authorization code in URL');
          setStatus('error');
          setMessage('No authorization code received from Google');
          setTimeout(() => {
            window.location.href = '/login';
          }, 3000);
          return;
        }

        console.log('✅ All checks passed, sending to backend...');
        console.log('📡 API URL:', `${API_URL}/auth/google/callback`);

        // Send code to backend
        const response = await fetch(`${API_URL}/auth/google/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });

        console.log('📥 Backend response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ Backend error:', errorData);
          throw new Error(errorData.error || 'Failed to authenticate with Google');
        }

        const data = await response.json();
        console.log('✅ Backend response:', data);

        // Check if tenant selection is required
        if (data.requiresTenantSelection) {
          console.log('🏢 Multiple tenants found, showing selection...');
          setAuthCode(code);
          setTenants(data.tenants);
          setStatus('tenant-selection');
          setMessage('Select your organization');
          return;
        }

        // Store authentication tokens
        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('userId', data.user.id);
        localStorage.setItem('userRole', data.user.role);
        localStorage.setItem('userName', data.user.name);
        localStorage.setItem('userEmail', data.user.email);

        setStatus('success');
        setMessage('Authentication successful! Welcome to Bharat CRM.');

        console.log('✅ Success! Redirecting to dashboard in 1 second...');

        // Redirect to dashboard with page reload to initialize AuthContext
        setTimeout(() => {
          console.log('🔄 Redirecting to /dashboard');
          window.location.href = '/dashboard';
        }, 1000);
      } catch (error: any) {
        console.error('❌ Error in callback handler:', error);
        console.error('❌ Error stack:', error.stack);
        setStatus('error');
        setMessage(error.message || 'Failed to authenticate with Google');
        setTimeout(() => {
          window.location.href = '/login';
        }, 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  const handleTenantSelect = async (tenantId: string) => {
    try {
      setStatus('processing');
      setMessage('Logging into selected organization...');

      const response = await fetch(`${API_URL}/auth/google/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: authCode, tenantId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to authenticate');
      }

      const data = await response.json();

      // Store authentication tokens
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('userRole', data.user.role);
      localStorage.setItem('userName', data.user.name);
      localStorage.setItem('userEmail', data.user.email);

      setStatus('success');
      setMessage('Authentication successful! Welcome to Bharat CRM.');

      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    } catch (error: any) {
      console.error('❌ Error selecting tenant:', error);
      setStatus('error');
      setMessage(error.message || 'Failed to authenticate');
      setTimeout(() => {
        window.location.href = '/login';
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="max-w-md w-full p-8 text-center">
        {status === 'processing' && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <h1 className="text-2xl font-bold mb-3">Authenticating...</h1>
            <p className="text-muted-foreground">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-green-600 mb-3">Success!</h1>
            <p className="text-muted-foreground mb-4">{message}</p>
            <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-red-600 mb-3">Authentication Failed</h1>
            <p className="text-muted-foreground mb-4">{message}</p>
            <p className="text-sm text-muted-foreground">Redirecting back to login...</p>
          </>
        )}

        {status === 'tenant-selection' && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Building className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-3">Select Organization</h1>
            <p className="text-muted-foreground mb-6">
              You have accounts in multiple organizations. Please select which one to sign in to.
            </p>
            <div className="space-y-3 text-left">
              {tenants.map((tenant) => (
                <Button
                  key={tenant.tenantId}
                  variant="outline"
                  className="w-full h-auto p-4 flex items-start gap-3 hover:border-primary"
                  onClick={() => handleTenantSelect(tenant.tenantId)}
                >
                  <Building className="w-5 h-5 mt-0.5 text-primary" />
                  <div className="flex-1 text-left">
                    <div className="font-semibold">{tenant.tenantName}</div>
                    <div className="text-xs text-muted-foreground">Role: {tenant.role}</div>
                  </div>
                </Button>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
