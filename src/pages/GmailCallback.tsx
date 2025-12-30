import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function GmailCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Connecting to Gmail...');

  useEffect(() => {
    console.log('🔍 GmailCallback mounted');
    console.log('📍 Current URL:', window.location.href);
    console.log('🔑 Code from URL:', searchParams.get('code'));
    console.log('👤 User ID from storage:', localStorage.getItem('userId'));

    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const userId = localStorage.getItem('userId');

        console.log('🚀 Starting Gmail OAuth callback handling...');

        // Check for errors from Google
        if (error) {
          console.error('❌ OAuth error from Google:', error);
          setStatus('error');
          setMessage(`Authentication failed: ${error}`);
          setTimeout(() => navigate('/settings?tab=integrations'), 3000);
          return;
        }

        // Check if code exists
        if (!code) {
          console.error('❌ No authorization code in URL');
          setStatus('error');
          setMessage('No authorization code received from Google');
          setTimeout(() => navigate('/settings?tab=integrations'), 3000);
          return;
        }

        // Check if user is logged in
        if (!userId) {
          console.error('❌ User not logged in');
          setStatus('error');
          setMessage('User not logged in. Please log in first.');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        console.log('✅ All checks passed, sending to backend...');
        console.log('📡 API URL:', `${API_URL}/integrations/gmail/callback`);

        // Get auth token
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('❌ No authentication token found');
          setStatus('error');
          setMessage('Authentication token not found. Please log in again.');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        // Send code to backend
        const response = await fetch(`${API_URL}/integrations/gmail/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            code,
            state,
          }),
        });

        console.log('📥 Backend response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ Backend error:', errorData);
          throw new Error(errorData.error || 'Failed to connect Gmail');
        }

        const data = await response.json();
        console.log('✅ Backend response:', data);

        setStatus('success');
        setMessage('Gmail connected successfully!');

        console.log('✅ Success! Redirecting to settings in 2 seconds...');

        // Redirect to settings/integrations after 2 seconds
        setTimeout(() => {
          console.log('🔄 Redirecting to /settings?tab=integrations');
          navigate('/settings?tab=integrations');
        }, 2000);
      } catch (error: any) {
        console.error('❌ Error in callback handler:', error);
        console.error('❌ Error stack:', error.stack);
        setStatus('error');
        setMessage(error.message || 'Failed to connect Gmail');
        setTimeout(() => navigate('/settings?tab=integrations'), 3000);
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
            <h1 className="text-2xl font-bold mb-3">Connecting...</h1>
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
            <p className="text-sm text-muted-foreground">Redirecting to integrations...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-red-600 mb-3">Connection Failed</h1>
            <p className="text-muted-foreground mb-4">{message}</p>
            <p className="text-sm text-muted-foreground">Redirecting back to integrations...</p>
          </>
        )}
      </Card>
    </div>
  );
}
