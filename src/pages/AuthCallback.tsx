import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Authenticating with Google...');

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
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        // Check if code exists
        if (!code) {
          console.error('❌ No authorization code in URL');
          setStatus('error');
          setMessage('No authorization code received from Google');
          setTimeout(() => navigate('/login'), 3000);
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

        // Store authentication tokens
        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('userId', data.user.id);
        localStorage.setItem('userRole', data.user.role);
        localStorage.setItem('userName', data.user.name);
        localStorage.setItem('userEmail', data.user.email);

        setStatus('success');
        setMessage('Authentication successful! Welcome to Bharat CRM.');

        console.log('✅ Success! Redirecting to dashboard in 2 seconds...');

        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          console.log('🔄 Redirecting to /dashboard');
          navigate('/dashboard');
        }, 2000);
      } catch (error: any) {
        console.error('❌ Error in callback handler:', error);
        console.error('❌ Error stack:', error.stack);
        setStatus('error');
        setMessage(error.message || 'Failed to authenticate with Google');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

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
      </Card>
    </div>
  );
}
