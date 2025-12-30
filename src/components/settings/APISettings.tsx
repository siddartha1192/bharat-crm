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
  Cloud,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
  Mail,
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

interface CloudinarySettings {
  configured: boolean;
  cloudName: string | null;
  hasApiKey: boolean;
  hasApiSecret: boolean;
}

interface MailSettings {
  configured: boolean;
  provider: string;
  enabled: boolean;
  domain: string | null;
  hasClientId: boolean;
  hasClientSecret: boolean;
  clientId: string | null;
  smtp: {
    fromName: string;
    fromEmail: string;
    replyTo: string;
  } | null;
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

  const [cloudinarySettings, setCloudinarySettings] = useState<CloudinarySettings>({
    configured: false,
    cloudName: null,
    hasApiKey: false,
    hasApiSecret: false,
  });

  const [mailSettings, setMailSettings] = useState<MailSettings>({
    configured: false,
    provider: 'google_workspace',
    enabled: true,
    domain: null,
    hasClientId: false,
    hasClientSecret: false,
    clientId: null,
    smtp: null,
  });

  // Form states
  const [whatsappToken, setWhatsappToken] = useState('');
  const [whatsappPhoneId, setWhatsappPhoneId] = useState('');
  const [whatsappWebhook, setWhatsappWebhook] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [openaiModel, setOpenaiModel] = useState('gpt-4o-mini');
  const [openaiTemperature, setOpenaiTemperature] = useState(0.7);
  const [openaiEnabled, setOpenaiEnabled] = useState(true);
  const [cloudinaryCloudName, setCloudinaryCloudName] = useState('');
  const [cloudinaryApiKey, setCloudinaryApiKey] = useState('');
  const [cloudinaryApiSecret, setCloudinaryApiSecret] = useState('');
  const [mailClientId, setMailClientId] = useState('');
  const [mailClientSecret, setMailClientSecret] = useState('');
  const [mailDomain, setMailDomain] = useState('');
  const [mailFromName, setMailFromName] = useState('');
  const [mailFromEmail, setMailFromEmail] = useState('');
  const [mailReplyTo, setMailReplyTo] = useState('');

  // UI states
  const [loading, setLoading] = useState(true);
  const [savingWhatsApp, setSavingWhatsApp] = useState(false);
  const [savingOpenAI, setSavingOpenAI] = useState(false);
  const [savingCloudinary, setSavingCloudinary] = useState(false);
  const [savingMail, setSavingMail] = useState(false);
  const [testingWhatsApp, setTestingWhatsApp] = useState(false);
  const [testingOpenAI, setTestingOpenAI] = useState(false);
  const [testingCloudinary, setTestingCloudinary] = useState(false);
  const [showWhatsAppToken, setShowWhatsAppToken] = useState(false);
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [showCloudinaryApiKey, setShowCloudinaryApiKey] = useState(false);
  const [showCloudinaryApiSecret, setShowCloudinaryApiSecret] = useState(false);
  const [showMailClientSecret, setShowMailClientSecret] = useState(false);

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
      setCloudinarySettings(data.settings.cloudinary);

      // Set form defaults
      setWhatsappPhoneId(data.settings.whatsapp.phoneId || '');
      setWhatsappWebhook(data.settings.whatsapp.webhookVerifyToken || '');
      setOpenaiModel(data.settings.openai.model);
      setOpenaiTemperature(data.settings.openai.temperature);
      setOpenaiEnabled(data.settings.openai.enabled);
      setCloudinaryCloudName(data.settings.cloudinary.cloudName || '');

      // Fetch mail settings separately
      try {
        const mailResponse = await fetch(`${API_URL}/settings/mail`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (mailResponse.ok) {
          const mailData = await mailResponse.json();
          setMailSettings(mailData.settings);
          setMailClientId(mailData.settings.clientId || '');
          setMailDomain(mailData.settings.domain || '');
          setMailFromName(mailData.settings.smtp?.fromName || '');
          setMailFromEmail(mailData.settings.smtp?.fromEmail || '');
          setMailReplyTo(mailData.settings.smtp?.replyTo || '');
        }
      } catch (mailError) {
        console.log('Mail settings not configured yet');
      }
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

  const saveCloudinarySettings = async () => {
    if (!cloudinaryCloudName || !cloudinaryApiKey || !cloudinaryApiSecret) {
      toast({
        title: 'Validation Error',
        description: 'All Cloudinary fields are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSavingCloudinary(true);
      const response = await fetch(`${API_URL}/settings/cloudinary`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          cloudName: cloudinaryCloudName,
          apiKey: cloudinaryApiKey,
          apiSecret: cloudinaryApiSecret,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save Cloudinary settings');
      }

      toast({
        title: 'Settings Saved',
        description: 'Cloudinary settings updated successfully',
      });

      // Refresh settings
      await fetchSettings();

      // Clear sensitive fields
      setCloudinaryApiKey('');
      setCloudinaryApiSecret('');
    } catch (error: any) {
      console.error('Error saving Cloudinary settings:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSavingCloudinary(false);
    }
  };

  const testCloudinaryConnection = async () => {
    if (!cloudinaryCloudName || !cloudinaryApiKey || !cloudinaryApiSecret) {
      toast({
        title: 'Validation Error',
        description: 'All Cloudinary fields are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setTestingCloudinary(true);
      const response = await fetch(`${API_URL}/settings/test-cloudinary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          cloudName: cloudinaryCloudName,
          apiKey: cloudinaryApiKey,
          apiSecret: cloudinaryApiSecret,
        }),
      });

      const data = await response.json();

      if (data.configured) {
        toast({
          title: 'Connection Successful',
          description: 'Cloudinary configuration is valid',
        });
      } else {
        toast({
          title: 'Connection Failed',
          description: data.error || 'Invalid Cloudinary configuration',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error testing Cloudinary:', error);
      toast({
        title: 'Test Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setTestingCloudinary(false);
    }
  };

  const saveMailSettings = async () => {
    if (!mailClientId || !mailClientSecret) {
      toast({
        title: 'Validation Error',
        description: 'Google Workspace OAuth Client ID and Client Secret are required',
        variant: 'destructive',
      });
      return;
    }

    if (!mailFromEmail || !mailFromName) {
      toast({
        title: 'Validation Error',
        description: 'SMTP From Email and From Name are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSavingMail(true);
      const response = await fetch(`${API_URL}/settings/mail`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          provider: 'google_workspace',
          enabled: true,
          domain: mailDomain || null,
          oauth: {
            clientId: mailClientId,
            clientSecret: mailClientSecret,
          },
          smtp: {
            fromName: mailFromName,
            fromEmail: mailFromEmail,
            replyTo: mailReplyTo || mailFromEmail,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save mail settings');
      }

      toast({
        title: 'Settings Saved',
        description: 'Mail integration settings updated successfully',
      });

      // Refresh settings
      await fetchSettings();

      // Clear sensitive fields
      setMailClientSecret('');
    } catch (error: any) {
      console.error('Error saving mail settings:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSavingMail(false);
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
          Configure API credentials for WhatsApp, OpenAI, and Cloudinary services
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
          <TabsTrigger value="cloudinary" className="flex items-center gap-2">
            <Cloud className="w-4 h-4" />
            Cloudinary
          </TabsTrigger>
          <TabsTrigger value="mail" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Mail Integration
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

        {/* Cloudinary Settings */}
        <TabsContent value="cloudinary">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Cloud className="w-5 h-5" />
                    Cloudinary
                  </CardTitle>
                  <CardDescription>
                    Configure Cloudinary for WhatsApp media uploads
                  </CardDescription>
                </div>
                <Badge variant={cloudinarySettings.configured ? 'default' : 'secondary'}>
                  {cloudinarySettings.configured ? (
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
              {cloudinarySettings.configured && (
                <Alert>
                  <CheckCircle className="w-4 h-4" />
                  <AlertDescription>
                    Cloudinary is currently configured. Cloud: {cloudinarySettings.cloudName}
                  </AlertDescription>
                </Alert>
              )}

              <Alert>
                <AlertDescription>
                  Cloudinary is used for uploading WhatsApp media files (images, documents, videos, audio).
                  Sign up at <a href="https://cloudinary.com" target="_blank" rel="noopener noreferrer" className="underline">cloudinary.com</a> to get your credentials.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="cloudinary-cloud-name">Cloud Name *</Label>
                <Input
                  id="cloudinary-cloud-name"
                  placeholder={cloudinarySettings.cloudName || 'Enter cloud name'}
                  value={cloudinaryCloudName}
                  onChange={(e) => setCloudinaryCloudName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Your Cloudinary cloud name (found in dashboard)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cloudinary-api-key">API Key *</Label>
                <div className="relative">
                  <Input
                    id="cloudinary-api-key"
                    type={showCloudinaryApiKey ? 'text' : 'password'}
                    placeholder={cloudinarySettings.hasApiKey ? '••••••••••••••••' : 'Enter API key'}
                    value={cloudinaryApiKey}
                    onChange={(e) => setCloudinaryApiKey(e.target.value)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0"
                    onClick={() => setShowCloudinaryApiKey(!showCloudinaryApiKey)}
                  >
                    {showCloudinaryApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your Cloudinary API key
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cloudinary-api-secret">API Secret *</Label>
                <div className="relative">
                  <Input
                    id="cloudinary-api-secret"
                    type={showCloudinaryApiSecret ? 'text' : 'password'}
                    placeholder={cloudinarySettings.hasApiSecret ? '••••••••••••••••' : 'Enter API secret'}
                    value={cloudinaryApiSecret}
                    onChange={(e) => setCloudinaryApiSecret(e.target.value)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0"
                    onClick={() => setShowCloudinaryApiSecret(!showCloudinaryApiSecret)}
                  >
                    {showCloudinaryApiSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your Cloudinary API secret
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={testCloudinaryConnection}
                  variant="outline"
                  disabled={testingCloudinary || !cloudinaryCloudName || !cloudinaryApiKey || !cloudinaryApiSecret}
                >
                  {testingCloudinary ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Test Connection
                </Button>
                <Button
                  onClick={saveCloudinarySettings}
                  disabled={savingCloudinary || !cloudinaryCloudName || !cloudinaryApiKey || !cloudinaryApiSecret}
                >
                  {savingCloudinary ? (
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

        {/* Mail Integration Settings */}
        <TabsContent value="mail">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Mail Integration (Google Workspace OAuth)
                  </CardTitle>
                  <CardDescription>
                    Configure Google Workspace OAuth for tenant-specific Gmail and Calendar integrations
                  </CardDescription>
                </div>
                <Badge variant={mailSettings.configured ? 'default' : 'secondary'}>
                  {mailSettings.configured ? (
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
              {mailSettings.configured && (
                <Alert>
                  <CheckCircle className="w-4 h-4" />
                  <AlertDescription>
                    Mail integration is currently configured. Users can connect their Gmail and Calendar accounts.
                  </AlertDescription>
                </Alert>
              )}

              <Alert>
                <AlertDescription>
                  Configure Google Workspace OAuth credentials to enable tenant-specific Gmail and Calendar integrations.
                  Create OAuth credentials in <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a>.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="mail-client-id">OAuth Client ID *</Label>
                <Input
                  id="mail-client-id"
                  placeholder={mailSettings.clientId || 'Enter Google OAuth Client ID'}
                  value={mailClientId}
                  onChange={(e) => setMailClientId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Your Google Cloud OAuth 2.0 Client ID
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mail-client-secret">OAuth Client Secret *</Label>
                <div className="relative">
                  <Input
                    id="mail-client-secret"
                    type={showMailClientSecret ? 'text' : 'password'}
                    placeholder={mailSettings.hasClientSecret ? '••••••••••••••••' : 'Enter OAuth Client Secret'}
                    value={mailClientSecret}
                    onChange={(e) => setMailClientSecret(e.target.value)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0"
                    onClick={() => setShowMailClientSecret(!showMailClientSecret)}
                  >
                    {showMailClientSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your Google Cloud OAuth 2.0 Client Secret (stored encrypted)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mail-domain">Workspace Domain (Optional)</Label>
                <Input
                  id="mail-domain"
                  placeholder={mailSettings.domain || 'example.com'}
                  value={mailDomain}
                  onChange={(e) => setMailDomain(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Your Google Workspace domain (optional, for domain-restricted access)
                </p>
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-semibold mb-3">SMTP Configuration</h4>

                <div className="space-y-2">
                  <Label htmlFor="mail-from-name">From Name *</Label>
                  <Input
                    id="mail-from-name"
                    placeholder="Your Company Name"
                    value={mailFromName}
                    onChange={(e) => setMailFromName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Name displayed as sender in outgoing emails
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mail-from-email">From Email *</Label>
                  <Input
                    id="mail-from-email"
                    type="email"
                    placeholder="noreply@yourcompany.com"
                    value={mailFromEmail}
                    onChange={(e) => setMailFromEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Email address used as sender (must be authorized in Google Workspace)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mail-reply-to">Reply-To Email (Optional)</Label>
                  <Input
                    id="mail-reply-to"
                    type="email"
                    placeholder="support@yourcompany.com"
                    value={mailReplyTo}
                    onChange={(e) => setMailReplyTo(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Email address for replies (defaults to From Email if not specified)
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={saveMailSettings}
                  disabled={savingMail || !mailClientId || !mailClientSecret || !mailFromEmail || !mailFromName}
                >
                  {savingMail ? (
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
