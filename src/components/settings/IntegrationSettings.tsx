import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface GmailStatus {
  connected: boolean;
  email: string | null;
  scopes: string[] | null;
  connectedAt: string | null;
  tokenExpiry: string | null;
  tokenExpired: boolean | null;
}

interface CalendarStatus {
  connected: boolean;
  scopes: string[] | null;
  connectedAt: string | null;
  tokenExpiry: string | null;
  tokenExpired: boolean | null;
}

export default function IntegrationSettings() {
  const [gmailStatus, setGmailStatus] = useState<GmailStatus>({
    connected: false,
    email: null,
    scopes: null,
    connectedAt: null,
    tokenExpiry: null,
    tokenExpired: null,
  });

  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus>({
    connected: false,
    scopes: null,
    connectedAt: null,
    tokenExpiry: null,
    tokenExpired: null,
  });

  const [loadingGmail, setLoadingGmail] = useState(true);
  const [loadingCalendar, setLoadingCalendar] = useState(true);
  const [connectingGmail, setConnectingGmail] = useState(false);
  const [connectingCalendar, setConnectingCalendar] = useState(false);
  const [disconnectingGmail, setDisconnectingGmail] = useState(false);
  const [disconnectingCalendar, setDisconnectingCalendar] = useState(false);
  const [testingGmail, setTestingGmail] = useState(false);

  const { toast } = useToast();
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchGmailStatus();
    fetchCalendarStatus();

    // Listen for messages from OAuth popup/callback
    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'gmail-connected' || event.data === 'calendar-connected') {
        // Refresh status after successful OAuth
        setTimeout(() => {
          fetchGmailStatus();
          fetchCalendarStatus();
        }, 1000);
      }
    };

    window.addEventListener('message', handleMessage);

    // Also refresh when component becomes visible (user returns from callback)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchGmailStatus();
        fetchCalendarStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('message', handleMessage);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const fetchGmailStatus = async () => {
    try {
      setLoadingGmail(true);
      const response = await fetch(`${API_URL}/integrations/gmail/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setGmailStatus(data.status);
      }
    } catch (error: any) {
      console.error('Error fetching Gmail status:', error);
    } finally {
      setLoadingGmail(false);
    }
  };

  const fetchCalendarStatus = async () => {
    try {
      setLoadingCalendar(true);
      const response = await fetch(`${API_URL}/calendar/auth/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCalendarStatus(data.status);
      } else {
        // Handle error response
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Error response from Calendar status:', errorData);
        toast({
          title: 'Calendar Status Error',
          description: errorData.error || 'Failed to check Calendar connection status',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error fetching Calendar status:', error);
      toast({
        title: 'Network Error',
        description: 'Failed to connect to server. Please check your connection.',
        variant: 'destructive',
      });
    } finally {
      setLoadingCalendar(false);
    }
  };

  const connectGmail = async () => {
    try {
      setConnectingGmail(true);
      const response = await fetch(`${API_URL}/integrations/gmail/auth/url`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.action === 'contact_admin') {
          toast({
            title: 'Configuration Required',
            description: data.message || 'Please ask your administrator to configure mail settings first',
            variant: 'destructive',
          });
          return;
        }
        throw new Error(data.error || 'Failed to get authorization URL');
      }

      // Open OAuth URL in new window
      window.open(data.authUrl, '_blank', 'width=600,height=700');

      toast({
        title: 'Authorization Started',
        description: 'Please complete the authorization in the new window',
      });
    } catch (error: any) {
      console.error('Error connecting Gmail:', error);
      toast({
        title: 'Connection Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setConnectingGmail(false);
    }
  };

  const disconnectGmail = async () => {
    try {
      setDisconnectingGmail(true);
      const response = await fetch(`${API_URL}/integrations/gmail/disconnect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to disconnect Gmail');
      }

      toast({
        title: 'Gmail Disconnected',
        description: 'Your Gmail account has been disconnected successfully',
      });

      await fetchGmailStatus();
    } catch (error: any) {
      console.error('Error disconnecting Gmail:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDisconnectingGmail(false);
    }
  };

  const testGmail = async () => {
    try {
      setTestingGmail(true);
      const response = await fetch(`${API_URL}/integrations/gmail/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Test Successful',
          description: data.message,
        });
      } else {
        throw new Error(data.error || 'Test failed');
      }
    } catch (error: any) {
      console.error('Error testing Gmail:', error);
      toast({
        title: 'Test Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setTestingGmail(false);
    }
  };

  const connectCalendar = async () => {
    try {
      setConnectingCalendar(true);
      const response = await fetch(`${API_URL}/calendar/auth/url`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.action === 'contact_admin') {
          toast({
            title: 'Configuration Required',
            description: data.message || 'Please ask your administrator to configure mail settings first',
            variant: 'destructive',
          });
          return;
        }
        throw new Error(data.error || 'Failed to get authorization URL');
      }

      // Open OAuth URL in new window
      window.open(data.authUrl, '_blank', 'width=600,height=700');

      toast({
        title: 'Authorization Started',
        description: 'Please complete the authorization in the new window',
      });
    } catch (error: any) {
      console.error('Error connecting Calendar:', error);
      toast({
        title: 'Connection Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setConnectingCalendar(false);
    }
  };

  const disconnectCalendar = async () => {
    try {
      setDisconnectingCalendar(true);
      const response = await fetch(`${API_URL}/calendar/auth/disconnect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to disconnect Calendar');
      }

      toast({
        title: 'Calendar Disconnected',
        description: 'Your Google Calendar has been disconnected successfully',
      });

      await fetchCalendarStatus();
    } catch (error: any) {
      console.error('Error disconnecting Calendar:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDisconnectingCalendar(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Service Integrations</h2>
        <p className="text-muted-foreground">
          Connect your Gmail and Google Calendar accounts for enhanced functionality
        </p>
      </div>

      {/* Gmail Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Gmail Integration
              </CardTitle>
              <CardDescription>
                Connect your Gmail account to send emails directly from the CRM
              </CardDescription>
            </div>
            <Badge variant={gmailStatus.connected ? 'default' : 'secondary'}>
              {gmailStatus.connected ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Connected
                </>
              ) : (
                <>
                  <XCircle className="w-3 h-3 mr-1" />
                  Not Connected
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingGmail ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {gmailStatus.connected ? (
                <>
                  <Alert>
                    <CheckCircle className="w-4 h-4" />
                    <AlertDescription>
                      Connected as: <strong>{gmailStatus.email}</strong>
                      <br />
                      Connected on: {gmailStatus.connectedAt ? new Date(gmailStatus.connectedAt).toLocaleDateString() : 'N/A'}
                    </AlertDescription>
                  </Alert>

                  {gmailStatus.tokenExpired && (
                    <Alert variant="destructive">
                      <AlertCircle className="w-4 h-4" />
                      <AlertDescription>
                        Your Gmail token has expired. Please reconnect your account.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={testGmail}
                      variant="outline"
                      disabled={testingGmail || gmailStatus.tokenExpired}
                    >
                      {testingGmail ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Send Test Email
                    </Button>
                    <Button
                      onClick={disconnectGmail}
                      variant="destructive"
                      disabled={disconnectingGmail}
                    >
                      {disconnectingGmail ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4 mr-2" />
                      )}
                      Disconnect
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Alert>
                    <AlertDescription>
                      Connect your Gmail account to enable email sending functionality through the CRM.
                      This will allow you to send emails directly to leads and contacts.
                    </AlertDescription>
                  </Alert>

                  <Button
                    onClick={connectGmail}
                    disabled={connectingGmail}
                  >
                    {connectingGmail ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <ExternalLink className="w-4 h-4 mr-2" />
                    )}
                    Connect Gmail
                  </Button>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Calendar Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Google Calendar Integration
              </CardTitle>
              <CardDescription>
                Connect your Google Calendar to sync meetings and events
              </CardDescription>
            </div>
            <Badge variant={calendarStatus.connected ? 'default' : 'secondary'}>
              {calendarStatus.connected ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Connected
                </>
              ) : (
                <>
                  <XCircle className="w-3 h-3 mr-1" />
                  Not Connected
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingCalendar ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {calendarStatus.connected ? (
                <>
                  <Alert>
                    <CheckCircle className="w-4 h-4" />
                    <AlertDescription>
                      Your Google Calendar is connected
                      <br />
                      Connected on: {calendarStatus.connectedAt ? new Date(calendarStatus.connectedAt).toLocaleDateString() : 'N/A'}
                    </AlertDescription>
                  </Alert>

                  {calendarStatus.tokenExpired && (
                    <Alert variant="destructive">
                      <AlertCircle className="w-4 h-4" />
                      <AlertDescription>
                        Your Calendar token has expired. Please reconnect your account.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={disconnectCalendar}
                      variant="destructive"
                      disabled={disconnectingCalendar}
                    >
                      {disconnectingCalendar ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4 mr-2" />
                      )}
                      Disconnect
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Alert>
                    <AlertDescription>
                      Connect your Google Calendar to sync meetings, tasks, and events with the CRM.
                      This enables automatic calendar integration for appointments and reminders.
                    </AlertDescription>
                  </Alert>

                  <Button
                    onClick={connectCalendar}
                    disabled={connectingCalendar}
                  >
                    {connectingCalendar ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <ExternalLink className="w-4 h-4 mr-2" />
                    )}
                    Connect Calendar
                  </Button>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Alert>
        <AlertDescription>
          <strong>Note:</strong> These integrations are personal to your account.
          Each user needs to connect their own Gmail and Calendar accounts.
        </AlertDescription>
      </Alert>
    </div>
  );
}
