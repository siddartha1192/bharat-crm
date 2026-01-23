/**
 * UTM Configuration Section for Campaigns
 * Allows configuration of UTM parameters for link tracking
 */

import { useState } from 'react';
import { Info, LinkIcon, ExternalLink, Copy, Check } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CreateCampaignData, UtmParams } from '@/types/campaign';
import { useToast } from '@/hooks/use-toast';

interface Props {
  campaign: CreateCampaignData;
  onChange: (updates: Partial<CreateCampaignData>) => void;
}

export function UtmConfigSection({ campaign, onChange }: Props) {
  const { toast } = useToast();
  const [copiedExample, setCopiedExample] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('default');

  // Generate default UTM values based on campaign
  const defaultUtmSource = campaign.utmSource || 'bharat_crm';
  const defaultUtmMedium = campaign.utmMedium || campaign.channel || 'email';
  const defaultUtmCampaign = campaign.utmCampaign || campaign.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');

  // Handle platform-specific UTM config
  const platformUtmConfig = campaign.platformUtmConfig || {};
  const currentPlatformConfig = selectedPlatform === 'default'
    ? null
    : platformUtmConfig[selectedPlatform] || {};

  const handlePlatformUtmChange = (field: keyof UtmParams, value: string) => {
    if (selectedPlatform === 'default') {
      onChange({ [field]: value });
    } else {
      const newPlatformConfig = {
        ...platformUtmConfig,
        [selectedPlatform]: {
          ...currentPlatformConfig,
          [field]: value || undefined
        }
      };
      onChange({ platformUtmConfig: newPlatformConfig });
    }
  };

  const getCurrentUtmValue = (field: keyof UtmParams): string => {
    if (selectedPlatform !== 'default' && currentPlatformConfig && currentPlatformConfig[field]) {
      return currentPlatformConfig[field] || '';
    }
    return (campaign[field] as string) || '';
  };

  // Generate preview URL
  const generatePreviewUrl = (): string => {
    const baseUrl = 'https://example.com/product';
    const params = new URLSearchParams();

    const source = getCurrentUtmValue('utm_source') || defaultUtmSource;
    const medium = getCurrentUtmValue('utm_medium') || defaultUtmMedium;
    const campaignName = getCurrentUtmValue('utm_campaign') || defaultUtmCampaign;

    if (source) params.append('utm_source', source);
    if (medium) params.append('utm_medium', medium);
    if (campaignName) params.append('utm_campaign', campaignName);

    const term = getCurrentUtmValue('utm_term');
    const content = getCurrentUtmValue('utm_content');

    if (term) params.append('utm_term', term);
    if (content) params.append('utm_content', content);

    return `${baseUrl}?${params.toString()}`;
  };

  const copyPreviewUrl = () => {
    const url = generatePreviewUrl();
    navigator.clipboard.writeText(url);
    setCopiedExample(true);
    toast({
      title: "Copied!",
      description: "Preview URL copied to clipboard"
    });
    setTimeout(() => setCopiedExample(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
        <div className="flex-1 text-sm">
          <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
            UTM Tracking Enabled
          </p>
          <p className="text-blue-700 dark:text-blue-300">
            All links in your campaign will be automatically tagged with UTM parameters
            for detailed analytics. You can track clicks, conversions, and user behavior
            across different platforms.
          </p>
        </div>
      </div>

      {/* Auto-tagging toggle */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="space-y-1">
          <Label className="text-base font-medium">Automatically tag links</Label>
          <p className="text-sm text-muted-foreground">
            Add UTM parameters to all links in your campaign content
          </p>
        </div>
        <Switch
          checked={campaign.autoTagLinks !== false}
          onCheckedChange={(checked) => onChange({ autoTagLinks: checked })}
        />
      </div>

      {campaign.autoTagLinks !== false && (
        <>
          {/* Click tracking toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <Label className="text-base font-medium">Enable click tracking</Label>
              <p className="text-sm text-muted-foreground">
                Track individual clicks with device, browser, and location data
              </p>
            </div>
            <Switch
              checked={campaign.trackClicks !== false}
              onCheckedChange={(checked) => onChange({ trackClicks: checked })}
            />
          </div>

          {/* Short links toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <Label className="text-base font-medium">Use shortened tracking links</Label>
              <p className="text-sm text-muted-foreground">
                Replace long URLs with short, branded links (e.g., crm.com/l/abc123)
              </p>
            </div>
            <Switch
              checked={campaign.useShortLinks === true}
              onCheckedChange={(checked) => onChange({ useShortLinks: checked })}
            />
          </div>

          {/* Platform-specific configuration */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">UTM Parameters</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Configure UTM parameters for tracking. You can set defaults or customize per platform.
              </p>
            </div>

            <Tabs value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="default">Default</TabsTrigger>
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
                <TabsTrigger value="youtube">YouTube/Social</TabsTrigger>
              </TabsList>

              <div className="mt-4 space-y-4">
                <Alert>
                  <Info className="w-4 h-4" />
                  <AlertDescription>
                    {selectedPlatform === 'default'
                      ? 'These values will be used for all platforms unless overridden.'
                      : `Platform-specific values for ${selectedPlatform}. Leave empty to use default values.`
                    }
                  </AlertDescription>
                </Alert>

                {/* UTM Source */}
                <div className="space-y-2">
                  <Label htmlFor="utm-source">
                    UTM Source <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="utm-source"
                    placeholder="e.g., bharat_crm, newsletter, website"
                    value={getCurrentUtmValue('utm_source')}
                    onChange={(e) => handlePlatformUtmChange('utm_source', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Identifies where the traffic is coming from (referrer)
                  </p>
                </div>

                {/* UTM Medium */}
                <div className="space-y-2">
                  <Label htmlFor="utm-medium">
                    UTM Medium <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="utm-medium"
                    placeholder="e.g., email, whatsapp, social, cpc"
                    value={getCurrentUtmValue('utm_medium')}
                    onChange={(e) => handlePlatformUtmChange('utm_medium', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    The marketing medium (email, social media, paid ads, etc.)
                  </p>
                </div>

                {/* UTM Campaign */}
                <div className="space-y-2">
                  <Label htmlFor="utm-campaign">
                    UTM Campaign <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="utm-campaign"
                    placeholder="e.g., spring_sale_2026, product_launch"
                    value={getCurrentUtmValue('utm_campaign')}
                    onChange={(e) => handlePlatformUtmChange('utm_campaign', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    The specific campaign name or promotion code
                  </p>
                </div>

                {/* UTM Term (optional) */}
                <div className="space-y-2">
                  <Label htmlFor="utm-term">UTM Term (Optional)</Label>
                  <Input
                    id="utm-term"
                    placeholder="e.g., running+shoes, winter+jacket"
                    value={getCurrentUtmValue('utm_term')}
                    onChange={(e) => handlePlatformUtmChange('utm_term', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Identify paid search keywords (for PPC campaigns)
                  </p>
                </div>

                {/* UTM Content (optional) */}
                <div className="space-y-2">
                  <Label htmlFor="utm-content">UTM Content (Optional)</Label>
                  <Input
                    id="utm-content"
                    placeholder="e.g., cta_button, header_link, footer_link"
                    value={getCurrentUtmValue('utm_content')}
                    onChange={(e) => handlePlatformUtmChange('utm_content', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Differentiate similar content or links (useful for A/B testing)
                  </p>
                </div>
              </div>
            </Tabs>
          </div>

          {/* Preview URL */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Link Preview</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Example of how your links will be tagged:
            </p>
            <div className="relative">
              <div className="p-3 bg-muted rounded-lg border font-mono text-xs break-all pr-20">
                {generatePreviewUrl()}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2"
                onClick={copyPreviewUrl}
              >
                {copiedExample ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Help section */}
          <Alert>
            <LinkIcon className="w-4 h-4" />
            <AlertDescription>
              <p className="font-medium mb-2">How UTM tracking works:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>All links in your email/WhatsApp content will be automatically tagged</li>
                <li>Each click will be tracked with device, browser, and location data</li>
                <li>View detailed analytics in the Campaign Analytics dashboard</li>
                <li>Track which platforms and links perform best</li>
              </ul>
              <a
                href="https://support.google.com/analytics/answer/1033863"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline mt-2 text-sm"
              >
                Learn more about UTM parameters
                <ExternalLink className="w-3 h-3" />
              </a>
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
