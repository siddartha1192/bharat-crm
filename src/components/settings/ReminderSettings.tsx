import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Bell, BellOff, Mail, MessageSquare, Play, Users, Loader2, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface ReminderConfig {
  enabled: boolean;
  checkIntervalHours: number;
  recipientUserIds: string[];
  sendEmail: boolean;
  sendWhatsApp: boolean;
  excludedStages: string[];
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ReminderStatus {
  scheduler: {
    running: boolean;
    checkInterval: string;
  };
  config: {
    enabled: boolean;
    checkIntervalHours: number;
    recipientsConfigured: number;
  };
}

export default function ReminderSettings() {
  const [config, setConfig] = useState<ReminderConfig | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [status, setStatus] = useState<ReminderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const [configRes, usersRes, statusRes] = await Promise.all([
        fetch(`${API_URL}/reminders/config`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/reminders/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/reminders/status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const configData = await configRes.json();
      const usersData = await usersRes.json();
      const statusData = await statusRes.json();

      setConfig(configData.config);
      setUsers(usersData.users || []);
      setStatus(statusData);
    } catch (error) {
      console.error('Error fetching reminder data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load reminder settings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_URL}/reminders/config`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save configuration');
      }

      const data = await response.json();
      setConfig(data.config);

      toast({
        title: 'Success',
        description: 'Reminder settings saved successfully',
      });

      // Refresh status
      fetchData();
    } catch (error: any) {
      console.error('Error saving config:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save reminder settings',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const testReminders = async () => {
    setTesting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_URL}/reminders/check-now`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to trigger reminder check');
      }

      const data = await response.json();

      toast({
        title: 'Reminder Check Completed',
        description: `Found ${data.results.leadsFound} uncontacted leads. Sent ${data.results.remindersSent} reminder(s).`,
      });
    } catch (error: any) {
      console.error('Error testing reminders:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to trigger reminder check',
        variant: 'destructive'
      });
    } finally {
      setTesting(false);
    }
  };

  const toggleRecipient = (userId: string) => {
    if (!config) return;

    const recipientUserIds = config.recipientUserIds.includes(userId)
      ? config.recipientUserIds.filter(id => id !== userId)
      : [...config.recipientUserIds, userId];

    setConfig({ ...config, recipientUserIds });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!config) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Failed to load reminder settings
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Settings Card */}
      <Card className="border-2">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                Lead Follow-up Reminders
              </CardTitle>
              <CardDescription className="mt-1">
                Automatically notify users about leads that haven't been contacted
              </CardDescription>
            </div>
            {status && (
              <Badge variant={status.scheduler.running ? "default" : "secondary"} className="gap-1">
                {status.scheduler.running ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    Active
                  </>
                ) : (
                  <>
                    <BellOff className="w-3 h-3" />
                    Inactive
                  </>
                )}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-4 border-2 rounded-lg bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-900/50 dark:to-slate-800/50">
            <div className="space-y-0.5">
              <Label htmlFor="enabled" className="text-base font-semibold">
                Enable Reminders
              </Label>
              <p className="text-sm text-muted-foreground">
                Automatically check for uncontacted leads every hour
              </p>
            </div>
            <Switch
              id="enabled"
              checked={config.enabled}
              onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
            />
          </div>

          {/* Check Interval */}
          <div className="space-y-2">
            <Label htmlFor="interval" className="font-semibold">
              Check Interval
            </Label>
            <p className="text-sm text-muted-foreground">
              Send reminders for leads older than this duration without contact
            </p>
            <Select
              value={config.checkIntervalHours.toString()}
              onValueChange={(value) => setConfig({ ...config, checkIntervalHours: parseInt(value) })}
            >
              <SelectTrigger id="interval" className="border-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 hour</SelectItem>
                <SelectItem value="6">6 hours</SelectItem>
                <SelectItem value="12">12 hours</SelectItem>
                <SelectItem value="24">24 hours (recommended)</SelectItem>
                <SelectItem value="48">48 hours</SelectItem>
                <SelectItem value="72">72 hours</SelectItem>
                <SelectItem value="168">1 week</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notification Methods */}
          <div className="space-y-4">
            <Label className="font-semibold">Notification Methods</Label>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border-2 rounded-lg">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <div>
                    <Label htmlFor="sendEmail" className="font-medium">Email Reminders</Label>
                    <p className="text-xs text-muted-foreground">Send via email</p>
                  </div>
                </div>
                <Switch
                  id="sendEmail"
                  checked={config.sendEmail}
                  onCheckedChange={(checked) => setConfig({ ...config, sendEmail: checked })}
                />
              </div>
              <div className="flex items-center justify-between p-3 border-2 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                  <div>
                    <Label htmlFor="sendWhatsApp" className="font-medium">WhatsApp Reminders</Label>
                    <p className="text-xs text-muted-foreground">Requires user.whatsappNumber field (coming soon)</p>
                  </div>
                </div>
                <Switch
                  id="sendWhatsApp"
                  checked={config.sendWhatsApp}
                  onCheckedChange={(checked) => setConfig({ ...config, sendWhatsApp: checked })}
                  disabled
                />
              </div>
            </div>
          </div>

          {/* Recipient Users */}
          <div className="space-y-3">
            <Label className="font-semibold flex items-center gap-2">
              <Users className="w-4 h-4" />
              Reminder Recipients
            </Label>
            <p className="text-sm text-muted-foreground">
              Select users who should receive reminder notifications
            </p>
            <div className="border-2 rounded-lg p-4 space-y-2 max-h-64 overflow-y-auto">
              {users.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No users found</p>
              ) : (
                users.map((user) => (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all ${
                      config.recipientUserIds.includes(user.id)
                        ? 'bg-blue-50 border-blue-300 dark:bg-blue-950/20 dark:border-blue-700'
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => toggleRecipient(user.id)}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={config.recipientUserIds.includes(user.id)}
                        onChange={() => toggleRecipient(user.id)}
                        className="w-4 h-4"
                      />
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <Badge variant="outline">{user.role}</Badge>
                  </div>
                ))
              )}
            </div>
            {config.recipientUserIds.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {config.recipientUserIds.length} recipient(s) selected
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={saveConfig}
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </Button>
            <Button
              onClick={testReminders}
              disabled={testing || !config.enabled}
              variant="outline"
              className="border-2"
            >
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Test Now
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status Card */}
      {status && (
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-base">System Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Scheduler Status</span>
              <Badge variant={status.scheduler.running ? "default" : "secondary"}>
                {status.scheduler.running ? 'Running' : 'Stopped'}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Check Frequency</span>
              <span className="text-sm font-medium">{status.scheduler.checkInterval}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Recipients Configured</span>
              <span className="text-sm font-medium">{status.config.recipientsConfigured}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Lead Age Threshold</span>
              <span className="text-sm font-medium">{status.config.checkIntervalHours} hours</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
