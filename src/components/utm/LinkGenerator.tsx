import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Copy, ExternalLink, Link, Sparkles, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import QRCode from 'qrcode';

export function LinkGenerator() {
  const { toast } = useToast();
  const [url, setUrl] = useState('');
  const [utmSource, setUtmSource] = useState('');
  const [utmMedium, setUtmMedium] = useState('');
  const [utmCampaign, setUtmCampaign] = useState('');
  const [utmTerm, setUtmTerm] = useState('');
  const [utmContent, setUtmContent] = useState('');
  const [createShortLink, setCreateShortLink] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [shortLink, setShortLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');

  const handleGenerate = async () => {
    if (!url || !utmSource || !utmMedium || !utmCampaign) {
      toast({
        title: 'Missing Required Fields',
        description: 'Please fill in URL, Source, Medium, and Campaign',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // First generate the UTM-tagged URL
      const utmResponse = await api.post('/utm/generate', {
        url,
        utmSource,
        utmMedium,
        utmCampaign,
        utmTerm: utmTerm || undefined,
        utmContent: utmContent || undefined,
      });

      console.log('UTM Response:', utmResponse.data);

      // Backend returns { success: true, data: { originalUrl, taggedUrl, utmParams } }
      const utmData = utmResponse.data.data || utmResponse.data;
      const taggedUrl = utmData.taggedUrl;
      setGeneratedUrl(taggedUrl);

      // If short link is requested, create it
      if (createShortLink) {
        const shortLinkResponse = await api.post('/links/create-short-link', {
          url: url, // Use original URL, backend will add UTM params
          utmSource,
          utmMedium,
          utmCampaign,
          utmTerm: utmTerm || undefined,
          utmContent: utmContent || undefined,
        });

        console.log('Short Link Response:', shortLinkResponse.data);

        // Backend returns { success: true, data: { id, originalUrl, taggedUrl, shortCode, shortUrl, utmParams } }
        const shortLinkData = shortLinkResponse.data.data || shortLinkResponse.data;
        const shortUrl = shortLinkData.shortUrl;
        setShortLink(shortUrl);

        // Generate QR code for short link
        const qrCode = await QRCode.toDataURL(shortUrl);
        setQrCodeDataUrl(qrCode);
      } else {
        setShortLink('');
        setQrCodeDataUrl('');
      }

      toast({
        title: 'Success',
        description: createShortLink ? 'UTM link and short link generated!' : 'UTM link generated!',
      });
    } catch (error: any) {
      console.error('Error generating link:', error);
      console.error('Error response:', error.response?.data);
      toast({
        title: 'Error',
        description: error.response?.data?.error || error.response?.data?.message || 'Failed to generate link',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
    });
  };

  const downloadQRCode = () => {
    const link = document.createElement('a');
    link.href = qrCodeDataUrl;
    link.download = 'qr-code.png';
    link.click();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="w-5 h-5" />
            Generate UTM Link
          </CardTitle>
          <CardDescription>
            Create tracked links with UTM parameters for your marketing campaigns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Base URL */}
          <div className="space-y-2">
            <Label htmlFor="url">Base URL *</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com/landing-page"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          {/* UTM Source */}
          <div className="space-y-2">
            <Label htmlFor="source">UTM Source *</Label>
            <Input
              id="source"
              placeholder="e.g., newsletter, google, facebook"
              value={utmSource}
              onChange={(e) => setUtmSource(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Identifies the source (e.g., google, newsletter, facebook)
            </p>
          </div>

          {/* UTM Medium */}
          <div className="space-y-2">
            <Label htmlFor="medium">UTM Medium *</Label>
            <Input
              id="medium"
              placeholder="e.g., email, cpc, social"
              value={utmMedium}
              onChange={(e) => setUtmMedium(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Identifies the medium (e.g., email, cpc, banner, social)
            </p>
          </div>

          {/* UTM Campaign */}
          <div className="space-y-2">
            <Label htmlFor="campaign">UTM Campaign *</Label>
            <Input
              id="campaign"
              placeholder="e.g., spring_sale_2026"
              value={utmCampaign}
              onChange={(e) => setUtmCampaign(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Identifies the campaign name (e.g., spring_sale, product_launch)
            </p>
          </div>

          {/* UTM Term */}
          <div className="space-y-2">
            <Label htmlFor="term">UTM Term (Optional)</Label>
            <Input
              id="term"
              placeholder="e.g., running+shoes"
              value={utmTerm}
              onChange={(e) => setUtmTerm(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              For paid search keywords
            </p>
          </div>

          {/* UTM Content */}
          <div className="space-y-2">
            <Label htmlFor="content">UTM Content (Optional)</Label>
            <Input
              id="content"
              placeholder="e.g., logolink, textlink"
              value={utmContent}
              onChange={(e) => setUtmContent(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              For A/B testing and content differentiation
            </p>
          </div>

          {/* Create Short Link Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="short-link">Create Short Link</Label>
              <p className="text-xs text-gray-500">
                Generate a trackable short URL
              </p>
            </div>
            <Switch
              id="short-link"
              checked={createShortLink}
              onCheckedChange={setCreateShortLink}
            />
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={loading || !url || !utmSource || !utmMedium || !utmCampaign}
            className="w-full"
            size="lg"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {loading ? 'Generating...' : 'Generate Link'}
          </Button>
        </CardContent>
      </Card>

      {/* Output */}
      <div className="space-y-6">
        {/* Generated URL */}
        {generatedUrl && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Generated URL</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={generatedUrl}
                readOnly
                rows={3}
                className="font-mono text-sm"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(generatedUrl, 'URL')}
                  className="flex-1"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy URL
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(generatedUrl, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Short Link */}
        {shortLink && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Short Link</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="font-mono text-sm text-blue-900 break-all">
                  {shortLink}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(shortLink, 'Short link')}
                  className="flex-1"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Short Link
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(shortLink, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* QR Code */}
        {qrCodeDataUrl && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                QR Code
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-center p-4 bg-white rounded-lg border">
                <img src={qrCodeDataUrl} alt="QR Code" className="w-48 h-48" />
              </div>
              <Button
                variant="outline"
                onClick={downloadQRCode}
                className="w-full"
              >
                Download QR Code
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Help Card */}
        {!generatedUrl && (
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg">Quick Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-700">
              <p>
                <strong>UTM Source:</strong> Where the traffic comes from (e.g., google, newsletter)
              </p>
              <p>
                <strong>UTM Medium:</strong> The marketing medium (e.g., email, cpc, social)
              </p>
              <p>
                <strong>UTM Campaign:</strong> The specific campaign identifier
              </p>
              <p className="text-xs text-gray-600 mt-4">
                💡 Use consistent naming conventions across your campaigns for better analytics
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
