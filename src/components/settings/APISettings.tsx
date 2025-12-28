import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  Settings,
  MessageSquare,
  Brain,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface WhatsAppSettings {
  configured: boolean;
  phoneId: string | null;
  hasToken: boolean;
  webhookVerifyToken: string | null;
}

interface OpenAISettings {
  configured: boolean;
  hasApiKey: boolean;
  model: string;
  temperature: number;
  enabled: boolean;
}

export default function APISettings() {
  const [whatsappSettings, setWhatsappSettings] = useState<WhatsAppSettings>({
    configured: false,
    phoneId: null,
    hasToken: false,
    webhookVerifyToken: null,
  });

  const [openaiSettings, setOpenaiSettings] = useState<OpenAISettings>({
    configured: false,
    hasApiKey: false,
    model: 'gpt-4o-mini',
    temperature: 0.7,
    enabled: true,
  });

  // Form states
  const [whatsappToken, setWhatsappToken] = useState('');
  const [whatsappPhoneId, setWhatsappPhoneId] = useState('');
  const [whatsappWebhook, setWhatsappWebhook] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [openaiModel, setOpenaiModel] = useState('gpt-4o-mini');
  const [openaiTemperature, setOpenaiTemperature] = useState(0.7);
  const [openaiEnabled, setOpenaiEnabled] = useState(true);

  // UI states
  const [loading, setLoading] = useState(true);
  const [savingWhatsApp, setSavingWhatsApp] = useState(false);
  const [savingOpenAI, setSavingOpenAI] = useState(false);
  const [testingWhatsApp, setTestingWhatsApp] = useState(false);
  const [testingOpenAI, setTestingOpenAI] = useState(false);
  const [showWhatsAppToken, setShowWhatsAppToken] = useState(false);
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);

  const { toast } = useToast();
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/settings/api-config`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch settings');

      const data = await response.json();
      setWhatsappSettings(data.settings.whatsapp);
      setOpenaiSettings(data.settings.openai);

      // Set form defaults
      setWhatsappPhoneId(data.settings.whatsapp.phoneId || '');
      setWhatsappWebhook(data.settings.whatsapp.webhookVerifyToken || '');
      setOpenaiModel(data.settings.openai.model);
      setOpenaiTemperature(data.settings.openai.temperature);
      setOpenaiEnabled(data.settings.openai.enabled);
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load API settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveWhatsAppSettings = async () => {
    if (!whatsappToken || !whatsappPhoneId) {
      toast({
        title: 'Validation Error',
        description: 'WhatsApp Token and Phone ID are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSavingWhatsApp(true);
      const response = await fetch(`${API_URL}/settings/whatsapp`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          token: whatsappToken,
          phoneId: whatsappPhoneId,
          webhookVerifyToken: whatsappWebhook,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save WhatsApp settings');
      }

      toast({
        title: 'Settings Saved',
        description: 'WhatsApp settings updated successfully',
      });

      // Refresh settings
      await fetchSettings();

      // Clear sensitive fields
      setWhatsappToken('');
    } catch (error: any) {
      console.error('Error saving WhatsApp settings:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSavingWhatsApp(false);
    }
  };

  const saveOpenAISettings = async () => {
    if (!openaiApiKey) {
      toast({
        title: 'Validation Error',
        description: 'OpenAI API Key is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSavingOpenAI(true);
      const response = await fetch(`${API_URL}/settings/openai`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          apiKey: openaiApiKey,
          model: openaiModel,
          temperature: openaiTemperature,
          enabled: openaiEnabled,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save OpenAI settings');
      }

      toast({
        title: 'Settings Saved',
        description: 'OpenAI settings updated successfully',
      });

      // Refresh settings
      await fetchSettings();

      // Clear sensitive fields
      setOpenaiApiKey('');
    } catch (error: any) {
      console.error('Error saving OpenAI settings:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSavingOpenAI(false);
    }
  };

  const testWhatsAppConnection = async () => {
    if (!whatsappToken || !whatsappPhoneId) {
      toast({
        title: 'Validation Error',
        description: 'Please enter WhatsApp Token and Phone ID',
        variant: 'destructive',
      });
      return;
    }

    try {
      setTestingWhatsApp(true);
      const response = await fetch(`${API_URL}/settings/test-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          token: whatsappToken,
          phoneId: whatsappPhoneId,
        }),
      });

      const data = await response.json();

      if (data.configured) {
        toast({
          title: 'Connection Successful',
          description: 'WhatsApp API credentials are valid',
        });
      } else {
        toast({
          title: 'Connection Failed',
          description: 'Invalid WhatsApp API credentials',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error testing WhatsApp:', error);
      toast({
        title: 'Test Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setTestingWhatsApp(false);
    }
  };

  const testOpenAIConnection = async () => {
    if (!openaiApiKey) {
      toast({
        title: 'Validation Error',
        description: 'Please enter OpenAI API Key',
        variant: 'destructive',
      });
      return;
    }

    try {
      setTestingOpenAI(true);
      const response = await fetch(`${API_URL}/settings/test-openai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          apiKey: openaiApiKey,
          model: openaiModel,
        }),
      });

      const data = await response.json();

      if (data.configured) {
        toast({
          title: 'Connection Successful',
          description: 'OpenAI API key is valid',
        });
      } else {
        toast({
          title: 'Connection Failed',
          description: data.error || 'Invalid OpenAI API key',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error testing OpenAI:', error);
      toast({
        title: 'Test Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setTestingOpenAI(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">API Configuration</h2>
        <p className="text-muted-foreground">
          Configure API credentials for WhatsApp and OpenAI services
        </p>
      </div>

      <Tabs defaultValue="whatsapp" className="space-y-4">
        <TabsList>
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="openai" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            OpenAI
          </TabsTrigger>
        </TabsList>

        {/* WhatsApp Settings */}
        <TabsContent value="whatsapp">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    WhatsApp Business API
                  </CardTitle>
                  <CardDescription>
                    Configure WhatsApp Business API credentials for messaging
                  </CardDescription>
                </div>
                <Badge variant={whatsappSettings.configured ? 'default' : 'secondary'}>
                  {whatsappSettings.configured ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Configured
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3 mr-1" />
                      Not Configured
                    </>
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {whatsappSettings.configured && (
                <Alert>
                  <CheckCircle className="w-4 h-4" />
                  <AlertDescription>
                    WhatsApp is currently configured and active
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="whatsapp-token">API Token *</Label>
                <div className="relative">
                  <Input
                    id="whatsapp-token"
                    type={showWhatsAppToken ? 'text' : 'password'}
                    placeholder={whatsappSettings.hasToken ? '••••••••••••••••' : 'Enter WhatsApp API token'}
                    value={whatsappToken}
                    onChange={(e) => setWhatsappToken(e.target.value)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0"
                    onClick={() => setShowWhatsAppToken(!showWhatsAppToken)}
                  >
                    {showWhatsAppToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your WhatsApp Business API token from Meta Business Manager
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp-phone-id">Phone Number ID *</Label>
                <Input
                  id="whatsapp-phone-id"
                  placeholder={whatsappSettings.phoneId || 'Enter phone number ID'}
                  value={whatsappPhoneId}
                  onChange={(e) => setWhatsappPhoneId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Your WhatsApp Business phone number ID
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp-webhook">Webhook Verify Token (Optional)</Label>
                <Input
                  id="whatsapp-webhook"
                  placeholder={whatsappSettings.webhookVerifyToken || 'Enter webhook verify token'}
                  value={whatsappWebhook}
                  onChange={(e) => setWhatsappWebhook(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Token for webhook verification (optional)
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={testWhatsAppConnection}
                  variant="outline"
                  disabled={testingWhatsApp || !whatsappToken || !whatsappPhoneId}
                >
                  {testingWhatsApp ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Test Connection
                </Button>
                <Button
                  onClick={saveWhatsAppSettings}
                  disabled={savingWhatsApp || !whatsappToken || !whatsappPhoneId}
                >
                  {savingWhatsApp ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Settings className="w-4 h-4 mr-2" />
                  )}
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* OpenAI Settings */}
        <TabsContent value="openai">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    OpenAI API
                  </CardTitle>
                  <CardDescription>
                    Configure OpenAI API for AI-powered features
                  </CardDescription>
                </div>
                <Badge variant={openaiSettings.configured ? 'default' : 'secondary'}>
                  {openaiSettings.configured ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Configured
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3 mr-1" />
                      Not Configured
                    </>
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {openaiSettings.configured && (
                <Alert>
                  <CheckCircle className="w-4 h-4" />
                  <AlertDescription>
                    OpenAI is currently configured. Model: {openaiSettings.model}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="openai-key">API Key *</Label>
                <div className="relative">
                  <Input
                    id="openai-key"
                    type={showOpenAIKey ? 'text' : 'password'}
                    placeholder={openaiSettings.hasApiKey ? '••••••••••••••••' : 'sk-...'}
                    value={openaiApiKey}
                    onChange={(e) => setOpenaiApiKey(e.target.value)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0"
                    onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                  >
                    {showOpenAIKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your OpenAI API key (starts with sk-)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="openai-model">Model</Label>
                <Select value={openaiModel} onValueChange={setOpenaiModel}>
                  <SelectTrigger id="openai-model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini (Recommended)</SelectItem>
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Choose the OpenAI model for AI responses
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="openai-temperature">
                  Temperature: {openaiTemperature.toFixed(1)}
                </Label>
                <input
                  id="openai-temperature"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={openaiTemperature}
                  onChange={(e) => setOpenaiTemperature(parseFloat(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Lower = more focused, Higher = more creative
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable AI Features</Label>
                  <p className="text-xs text-muted-foreground">
                    Turn on/off AI-powered responses
                  </p>
                </div>
                <Switch
                  checked={openaiEnabled}
                  onCheckedChange={setOpenaiEnabled}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={testOpenAIConnection}
                  variant="outline"
                  disabled={testingOpenAI || !openaiApiKey}
                >
                  {testingOpenAI ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Test Connection
                </Button>
                <Button
                  onClick={saveOpenAISettings}
                  disabled={savingOpenAI || !openaiApiKey}
                >
                  {savingOpenAI ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Settings className="w-4 h-4 mr-2" />
                  )}
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Alert>
        <AlertDescription>
          <strong>Note:</strong> Only administrators can update API settings. These settings apply to all users in your organization.
        </AlertDescription>
      </Alert>
    </div>
  );
}
