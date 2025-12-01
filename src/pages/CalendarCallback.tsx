import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function CalendarCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Connecting to Google Calendar...');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const userId = localStorage.getItem('userId');

      // Check for errors from Google
      if (error) {
        setStatus('error');
        setMessage(`Authentication failed: ${error}`);
        setTimeout(() => navigate('/calendar'), 3000);
        return;
      }

      // Check if code exists
      if (!code) {
        setStatus('error');
        setMessage('No authorization code received');
        setTimeout(() => navigate('/calendar'), 3000);
        return;
      }

      // Check if user is logged in
      if (!userId) {
        setStatus('error');
        setMessage('User not logged in');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      try {
        // Send code to backend
        const response = await fetch(`${API_URL}/calendar/auth/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            userId,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to connect Google Calendar');
        }

        const data = await response.json();

        setStatus('success');
        setMessage('Google Calendar connected successfully!');

        // Redirect to calendar after 2 seconds
        setTimeout(() => navigate('/calendar'), 2000);
      } catch (error: any) {
        console.error('Error connecting Google Calendar:', error);
        setStatus('error');
        setMessage(error.message || 'Failed to connect Google Calendar');
        setTimeout(() => navigate('/calendar'), 3000);
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
            <p className="text-sm text-muted-foreground">Redirecting to calendar...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-red-600 mb-3">Connection Failed</h1>
            <p className="text-muted-foreground mb-4">{message}</p>
            <p className="text-sm text-muted-foreground">Redirecting back to calendar...</p>
          </>
        )}
      </Card>
    </div>
  );
}
