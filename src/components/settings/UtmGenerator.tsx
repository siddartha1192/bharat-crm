/**
 * UTM URL Generator Tool
 * Standalone tool for generating UTM-tagged URLs for YouTube, social media, and other platforms
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Copy,
  Check,
  ExternalLink,
  LinkIcon,
  Youtube,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Globe,
  QrCode,
  Download,
  Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import QRCode from 'qrcode';

const PLATFORM_PRESETS = {
  youtube: {
    name: 'YouTube',
    icon: Youtube,
    utmSource: 'youtube',
    utmMedium: 'video',
    color: 'text-red-600'
  },
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    utmSource: 'instagram',
    utmMedium: 'social',
    color: 'text-pink-600'
  },
  facebook: {
    name: 'Facebook',
    icon: Facebook,
    utmSource: 'facebook',
    utmMedium: 'social',
    color: 'text-blue-600'
  },
  twitter: {
    name: 'Twitter / X',
    icon: Twitter,
    utmSource: 'twitter',
    utmMedium: 'social',
    color: 'text-sky-600'
  },
  linkedin: {
    name: 'LinkedIn',
    icon: Linkedin,
    utmSource: 'linkedin',
    utmMedium: 'social',
    color: 'text-blue-700'
  },
  tiktok: {
    name: 'TikTok',
    icon: Globe,
    utmSource: 'tiktok',
    utmMedium: 'social',
    color: 'text-black'
  },
  custom: {
    name: 'Custom',
    icon: Globe,
    utmSource: '',
    utmMedium: '',
    color: 'text-gray-600'
  }
};

export function UtmGenerator() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  const [baseUrl, setBaseUrl] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<keyof typeof PLATFORM_PRESETS>('youtube');
  const [utmParams, setUtmParams] = useState({
    utm_source: PLATFORM_PRESETS.youtube.utmSource,
    utm_medium: PLATFORM_PRESETS.youtube.utmMedium,
    utm_campaign: '',
    utm_term: '',
    utm_content: ''
  });

  const [savedUrls, setSavedUrls] = useState<Array<{
    id: string;
    name: string;
    url: string;
    createdAt: string;
  }>>([]);

  // Handle platform change
  const handlePlatformChange = (platform: keyof typeof PLATFORM_PRESETS) => {
    setSelectedPlatform(platform);
    const preset = PLATFORM_PRESETS[platform];
    setUtmParams(prev => ({
      ...prev,
      utm_source: preset.utmSource,
      utm_medium: preset.utmMedium
    }));
  };

  // Generate tagged URL
  const generatedUrl = useMemo(() => {
    if (!baseUrl) return '';

    try {
      const url = new URL(baseUrl);
      const params = new URLSearchParams();

      Object.entries(utmParams).forEach(([key, value]) => {
        if (value && value.trim()) {
          params.append(key, value.trim());
        }
      });

      url.search = params.toString();
      return url.toString();
    } catch (error) {
      return '';
    }
  }, [baseUrl, utmParams]);

  // Validate URL
  const isValidUrl = useMemo(() => {
    if (!baseUrl) return null;
    try {
      new URL(baseUrl);
      return true;
    } catch {
      return false;
    }
  }, [baseUrl]);

  // Copy to clipboard
  const copyToClipboard = async () => {
    if (!generatedUrl) return;

    await navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    toast({
      title: 'Copied!',
      description: 'UTM-tagged URL copied to clipboard'
    });
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate QR Code
  const generateQRCode = async () => {
    if (!generatedUrl) return;

    try {
      const qrDataUrl = await QRCode.toDataURL(generatedUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      setQrCodeUrl(qrDataUrl);
      toast({
        title: 'QR Code Generated!',
        description: 'You can now download the QR code'
      });
    } catch (error) {
      console.error('QR Code generation error:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate QR code',
        variant: 'destructive'
      });
    }
  };

  // Download QR Code
  const downloadQRCode = () => {
    if (!qrCodeUrl) return;

    const a = document.createElement('a');
    a.href = qrCodeUrl;
    a.download = `qr-code-${Date.now()}.png`;
    a.click();

    toast({
      title: 'Downloaded!',
      description: 'QR code image downloaded'
    });
  };

  // Save URL
  const saveUrl = () => {
    if (!generatedUrl) return;

    const name = prompt('Enter a name for this URL:');
    if (!name) return;

    const newSaved = {
      id: Date.now().toString(),
      name,
      url: generatedUrl,
      createdAt: new Date().toISOString()
    };

    setSavedUrls(prev => [newSaved, ...prev]);
    toast({
      title: 'Saved!',
      description: `URL saved as "${name}"`
    });
  };

  // Delete saved URL
  const deleteSavedUrl = (id: string) => {
    setSavedUrls(prev => prev.filter(u => u.id !== id));
    toast({
      title: 'Deleted',
      description: 'Saved URL removed'
    });
  };

  const PlatformIcon = PLATFORM_PRESETS[selectedPlatform].icon;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-primary" />
          UTM URL Generator
        </h1>
        <p className="text-muted-foreground">
          Create tracked links for YouTube, social media, and other external platforms
        </p>
      </div>

      {/* Main Generator Card */}
      <Card>
        <CardHeader>
          <CardTitle>Generate UTM-Tagged URL</CardTitle>
          <CardDescription>
            Add tracking parameters to your links for detailed analytics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Platform Selection */}
          <div className="space-y-2">
            <Label>Select Platform</Label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(PLATFORM_PRESETS).map(([key, preset]) => {
                const Icon = preset.icon;
                return (
                  <Button
                    key={key}
                    variant={selectedPlatform === key ? 'default' : 'outline'}
                    className="justify-start"
                    onClick={() => handlePlatformChange(key as keyof typeof PLATFORM_PRESETS)}
                  >
                    <Icon className={`w-4 h-4 mr-2 ${selectedPlatform === key ? '' : preset.color}`} />
                    {preset.name}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Base URL Input */}
          <div className="space-y-2">
            <Label htmlFor="base-url">
              Your Website URL <span className="text-red-500">*</span>
            </Label>
            <Input
              id="base-url"
              placeholder="https://example.com/landing-page"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className={isValidUrl === false ? 'border-red-500' : ''}
            />
            {isValidUrl === false && (
              <p className="text-sm text-red-500">Please enter a valid URL starting with http:// or https://</p>
            )}
          </div>

          {/* UTM Parameters */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <PlatformIcon className="w-5 h-5 text-primary" />
              <Label className="text-base font-semibold">UTM Parameters</Label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="utm-source">
                  UTM Source <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="utm-source"
                  placeholder="e.g., youtube, instagram"
                  value={utmParams.utm_source}
                  onChange={(e) => setUtmParams(prev => ({ ...prev, utm_source: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Where the traffic is coming from</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="utm-medium">
                  UTM Medium <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="utm-medium"
                  placeholder="e.g., social, video, bio_link"
                  value={utmParams.utm_medium}
                  onChange={(e) => setUtmParams(prev => ({ ...prev, utm_medium: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Marketing medium or channel</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="utm-campaign">
                  UTM Campaign <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="utm-campaign"
                  placeholder="e.g., product_launch_2026"
                  value={utmParams.utm_campaign}
                  onChange={(e) => setUtmParams(prev => ({ ...prev, utm_campaign: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Campaign name or identifier</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="utm-term">UTM Term (Optional)</Label>
                <Input
                  id="utm-term"
                  placeholder="e.g., summer_collection"
                  value={utmParams.utm_term}
                  onChange={(e) => setUtmParams(prev => ({ ...prev, utm_term: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Paid keywords or specific terms</p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="utm-content">UTM Content (Optional)</Label>
                <Input
                  id="utm-content"
                  placeholder="e.g., bio_link, story_swipe_up, video_description"
                  value={utmParams.utm_content}
                  onChange={(e) => setUtmParams(prev => ({ ...prev, utm_content: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Differentiate similar content</p>
              </div>
            </div>
          </div>

          {/* Generated URL */}
          {generatedUrl && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Generated URL</Label>
              <div className="relative">
                <div className="p-4 bg-muted rounded-lg border font-mono text-sm break-all pr-32">
                  {generatedUrl}
                </div>
                <div className="absolute right-2 top-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={copyToClipboard}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={saveUrl}
                  >
                    Save
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={generateQRCode}>
                  <QrCode className="w-4 h-4 mr-2" />
                  Generate QR Code
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(generatedUrl, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Test Link
                </Button>
              </div>
            </div>
          )}

          {/* QR Code Display */}
          {qrCodeUrl && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">QR Code</Label>
              <div className="flex flex-col items-center gap-4 p-6 bg-muted rounded-lg">
                <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64 border-4 border-white rounded" />
                <Button onClick={downloadQRCode}>
                  <Download className="w-4 h-4 mr-2" />
                  Download QR Code
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Saved URLs */}
      {savedUrls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Saved URLs</CardTitle>
            <CardDescription>Your previously generated UTM-tagged URLs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {savedUrls.map((saved) => (
                <div key={saved.id} className="flex items-start justify-between p-3 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{saved.name}</p>
                    <p className="text-sm text-muted-foreground font-mono truncate">{saved.url}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Created: {new Date(saved.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard.writeText(saved.url);
                        toast({ title: 'Copied!', description: `"${saved.name}" copied to clipboard` });
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteSavedUrl(saved.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help & Tips */}
      <Card>
        <CardHeader>
          <CardTitle>UTM Best Practices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Use Cases</h4>
              <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                <li>YouTube video descriptions</li>
                <li>Instagram/TikTok bio links</li>
                <li>Social media posts and stories</li>
                <li>Influencer collaborations</li>
                <li>Print materials with QR codes</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Naming Conventions</h4>
              <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                <li>Use lowercase letters</li>
                <li>Replace spaces with underscores</li>
                <li>Be consistent across campaigns</li>
                <li>Include dates for time-based campaigns</li>
                <li>Keep names descriptive but short</li>
              </ul>
            </div>
          </div>

          <Alert>
            <LinkIcon className="w-4 h-4" />
            <AlertDescription>
              <strong>Pro Tip:</strong> Track these URLs in Google Analytics to measure performance
              across different platforms and campaigns. All clicks will be automatically attributed
              to the correct source, medium, and campaign.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
