/**
 * Call Settings Page
 * Configure Twilio, OpenAI, and call automation settings
 */

import { useState, useEffect } from 'react';
import { useCallSettings, useUpdateCallSettings, useCallScripts } from '@/hooks/useCalls';
import { pipelineStagesAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function CallSettingsPage() {
  const { data: settings, isLoading } = useCallSettings();
  const updateSettings = useUpdateCallSettings();
  const { data: scripts } = useCallScripts({ scriptType: 'ai', isActive: true });
  const [stages, setStages] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioPhoneNumber: '',
    openaiApiKey: '',
    openaiModel: 'gpt-4o-realtime-preview-2024-12-17',
    maxConcurrentCalls: 5,
    callTimeout: 300,
    enableRecording: true,
    enableTranscription: true,
    autoCallOnLeadCreate: false,
    autoCallOnStageChange: false,
    autoCallDelaySeconds: 60,
    autoCallLeadCreateScriptId: '',
    autoCallStageChangeScriptId: '',
    autoCallStageChangeFromStage: '',
    autoCallStageChangeToStage: '',
    enableBusinessHours: true,
    businessHoursStart: '09:00',
    businessHoursEnd: '17:00',
    businessDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
    timezone: 'Asia/Kolkata',
  });

  // Fetch pipeline stages
  useEffect(() => {
    pipelineStagesAPI.getAll().then(data => {
      setStages(data.filter((s: any) => s.stageType === 'LEAD' || s.stageType === 'BOTH'));
    }).catch(err => {
      console.error('Failed to fetch pipeline stages:', err);
    });
  }, []);

  // Update form when settings load
  useEffect(() => {
    if (settings) {
      setFormData({
        twilioAccountSid: settings.twilioAccountSid || '',
        twilioAuthToken: settings.twilioAuthToken || '',
        twilioPhoneNumber: settings.twilioPhoneNumber || '',
        openaiApiKey: settings.openaiApiKey || '',
        openaiModel: settings.openaiModel,
        maxConcurrentCalls: settings.maxConcurrentCalls,
        callTimeout: settings.callTimeout,
        enableRecording: settings.enableRecording,
        enableTranscription: settings.enableTranscription,
        autoCallOnLeadCreate: settings.autoCallOnLeadCreate,
        autoCallOnStageChange: settings.autoCallOnStageChange,
        autoCallDelaySeconds: settings.autoCallDelaySeconds,
        autoCallLeadCreateScriptId: settings.autoCallLeadCreateScriptId || '',
        autoCallStageChangeScriptId: settings.autoCallStageChangeScriptId || '',
        autoCallStageChangeFromStage: settings.autoCallStageChangeFromStage || '',
        autoCallStageChangeToStage: settings.autoCallStageChangeToStage || '',
        enableBusinessHours: settings.enableBusinessHours,
        businessHoursStart: settings.businessHoursStart || '09:00',
        businessHoursEnd: settings.businessHoursEnd || '17:00',
        businessDays: settings.businessDays || ['mon', 'tue', 'wed', 'thu', 'fri'],
        timezone: settings.timezone,
      });
    }
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings.mutate(formData);
  };

  const handleDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      businessDays: prev.businessDays.includes(day)
        ? prev.businessDays.filter(d => d !== day)
        : [...prev.businessDays, day],
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      {/* Twilio Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Twilio Configuration</CardTitle>
          <CardDescription>
            Configure your Twilio account for making voice calls
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Get your Twilio credentials from{' '}
              <a
                href="https://console.twilio.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline"
              >
                Twilio Console
              </a>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="twilioAccountSid">Account SID</Label>
            <Input
              id="twilioAccountSid"
              value={formData.twilioAccountSid}
              onChange={(e) => setFormData({ ...formData, twilioAccountSid: e.target.value })}
              placeholder="AC..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="twilioAuthToken">Auth Token</Label>
            <Input
              id="twilioAuthToken"
              type="password"
              value={formData.twilioAuthToken}
              onChange={(e) => setFormData({ ...formData, twilioAuthToken: e.target.value })}
              placeholder="Enter your auth token"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="twilioPhoneNumber">Twilio Phone Number</Label>
            <Input
              id="twilioPhoneNumber"
              value={formData.twilioPhoneNumber}
              onChange={(e) => setFormData({ ...formData, twilioPhoneNumber: e.target.value })}
              placeholder="+1234567890"
            />
          </div>
        </CardContent>
      </Card>

      {/* OpenAI Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>OpenAI Configuration</CardTitle>
          <CardDescription>
            Configure OpenAI for AI-powered voice calls
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="openaiApiKey">OpenAI API Key</Label>
            <Input
              id="openaiApiKey"
              type="password"
              value={formData.openaiApiKey}
              onChange={(e) => setFormData({ ...formData, openaiApiKey: e.target.value })}
              placeholder="sk-..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="openaiModel">Model</Label>
            <Select
              value={formData.openaiModel}
              onValueChange={(value) => setFormData({ ...formData, openaiModel: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o-realtime-preview-2024-12-17">
                  GPT-4 Realtime (Recommended)
                </SelectItem>
                <SelectItem value="gpt-4o-mini">GPT-4 Mini</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Call Behavior */}
      <Card>
        <CardHeader>
          <CardTitle>Call Behavior</CardTitle>
          <CardDescription>
            Configure how calls are made and handled
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxConcurrentCalls">Max Concurrent Calls</Label>
              <Input
                id="maxConcurrentCalls"
                type="number"
                min="1"
                max="50"
                value={formData.maxConcurrentCalls}
                onChange={(e) =>
                  setFormData({ ...formData, maxConcurrentCalls: parseInt(e.target.value) })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="callTimeout">Call Timeout (seconds)</Label>
              <Input
                id="callTimeout"
                type="number"
                min="30"
                max="600"
                value={formData.callTimeout}
                onChange={(e) =>
                  setFormData({ ...formData, callTimeout: parseInt(e.target.value) })
                }
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Recording</Label>
              <p className="text-sm text-gray-500">Record all calls for quality assurance</p>
            </div>
            <Switch
              checked={formData.enableRecording}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, enableRecording: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Transcription</Label>
              <p className="text-sm text-gray-500">Transcribe calls automatically</p>
            </div>
            <Switch
              checked={formData.enableTranscription}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, enableTranscription: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Automation Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Automation Settings</CardTitle>
          <CardDescription>
            Configure automatic calling rules
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-call on Lead Create</Label>
                <p className="text-sm text-gray-500">Automatically call new leads</p>
              </div>
              <Switch
                checked={formData.autoCallOnLeadCreate}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, autoCallOnLeadCreate: checked })
                }
              />
            </div>

            {formData.autoCallOnLeadCreate && (
              <div className="space-y-2 pl-4 border-l-2 border-blue-200">
                <Label htmlFor="autoCallLeadCreateScriptId">Call Script</Label>
                <Select
                  value={formData.autoCallLeadCreateScriptId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, autoCallLeadCreateScriptId: value })
                  }
                >
                  <SelectTrigger id="autoCallLeadCreateScriptId">
                    <SelectValue placeholder="Select a script (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None (use default)</SelectItem>
                    {scripts?.map((script: any) => (
                      <SelectItem key={script.id} value={script.id}>
                        {script.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">
                  Which script to use for calling new leads
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-call on Stage Change</Label>
                <p className="text-sm text-gray-500">Call leads when stage changes</p>
              </div>
              <Switch
                checked={formData.autoCallOnStageChange}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, autoCallOnStageChange: checked })
                }
              />
            </div>

            {formData.autoCallOnStageChange && (
              <div className="space-y-4 pl-4 border-l-2 border-blue-200">
                <div className="space-y-2">
                  <Label htmlFor="autoCallStageChangeScriptId">Call Script</Label>
                  <Select
                    value={formData.autoCallStageChangeScriptId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, autoCallStageChangeScriptId: value })
                    }
                  >
                    <SelectTrigger id="autoCallStageChangeScriptId">
                      <SelectValue placeholder="Select a script (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None (use default)</SelectItem>
                      {scripts?.map((script: any) => (
                        <SelectItem key={script.id} value={script.id}>
                          {script.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500">
                    Which script to use for calling on stage change
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="autoCallStageChangeFromStage">From Stage (optional)</Label>
                    <Select
                      value={formData.autoCallStageChangeFromStage}
                      onValueChange={(value) =>
                        setFormData({ ...formData, autoCallStageChangeFromStage: value })
                      }
                    >
                      <SelectTrigger id="autoCallStageChangeFromStage">
                        <SelectValue placeholder="Any stage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Any stage</SelectItem>
                        {stages?.map((stage: any) => (
                          <SelectItem key={stage.id} value={stage.slug}>
                            {stage.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-500">Only trigger from this stage</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="autoCallStageChangeToStage">To Stage (optional)</Label>
                    <Select
                      value={formData.autoCallStageChangeToStage}
                      onValueChange={(value) =>
                        setFormData({ ...formData, autoCallStageChangeToStage: value })
                      }
                    >
                      <SelectTrigger id="autoCallStageChangeToStage">
                        <SelectValue placeholder="Any stage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Any stage</SelectItem>
                        {stages?.map((stage: any) => (
                          <SelectItem key={stage.id} value={stage.slug}>
                            {stage.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-500">Only trigger to this stage</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="autoCallDelaySeconds">Call Delay (seconds)</Label>
            <Input
              id="autoCallDelaySeconds"
              type="number"
              min="0"
              max="3600"
              value={formData.autoCallDelaySeconds}
              onChange={(e) =>
                setFormData({ ...formData, autoCallDelaySeconds: parseInt(e.target.value) })
              }
            />
            <p className="text-sm text-gray-500">
              Delay before making automatic calls
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Business Hours */}
      <Card>
        <CardHeader>
          <CardTitle>Business Hours</CardTitle>
          <CardDescription>
            Set when calls can be made
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Enable Business Hours</Label>
            <Switch
              checked={formData.enableBusinessHours}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, enableBusinessHours: checked })
              }
            />
          </div>

          {formData.enableBusinessHours && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessHoursStart">Start Time</Label>
                  <Input
                    id="businessHoursStart"
                    type="time"
                    value={formData.businessHoursStart}
                    onChange={(e) =>
                      setFormData({ ...formData, businessHoursStart: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessHoursEnd">End Time</Label>
                  <Input
                    id="businessHoursEnd"
                    type="time"
                    value={formData.businessHoursEnd}
                    onChange={(e) =>
                      setFormData({ ...formData, businessHoursEnd: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Business Days</Label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: 'mon', label: 'Mon' },
                    { value: 'tue', label: 'Tue' },
                    { value: 'wed', label: 'Wed' },
                    { value: 'thu', label: 'Thu' },
                    { value: 'fri', label: 'Fri' },
                    { value: 'sat', label: 'Sat' },
                    { value: 'sun', label: 'Sun' },
                  ].map((day) => (
                    <Button
                      key={day.value}
                      type="button"
                      variant={formData.businessDays.includes(day.value) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleDayToggle(day.value)}
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={formData.timezone}
                  onValueChange={(value) => setFormData({ ...formData, timezone: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                    <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                    <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST)</SelectItem>
                    <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={updateSettings.isPending} className="w-full sm:w-auto">
          {updateSettings.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
