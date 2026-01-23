import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, ExternalLink, Link2, Trash2, Calendar, MousePointerClick } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';

interface ManualLink {
  id: string;
  originalUrl: string;
  taggedUrl: string;
  shortCode: string;
  shortUrl: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  totalClicks: number;
  uniqueClicks: number;
  lastClickedAt?: string;
  createdAt: string;
}

export function ManualLinks() {
  const { toast } = useToast();
  const [links, setLinks] = useState<ManualLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchManualLinks();
  }, []);

  const fetchManualLinks = async () => {
    try {
      const response = await api.get('/links/manual');
      setLinks(response.data);
    } catch (error) {
      console.error('Error fetching manual links:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch manual links',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this link?')) return;

    try {
      await api.delete(`/links/${id}`);
      toast({
        title: 'Success',
        description: 'Link deleted successfully',
      });
      fetchManualLinks();
    } catch (error: any) {
      console.error('Error deleting link:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete link',
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
    });
  };

  const filteredLinks = links.filter(
    (link) =>
      link.shortUrl.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.originalUrl.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.utmCampaign?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading links...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              Manual Short Links
            </CardTitle>
            <CardDescription>
              View and manage manually created tracking links
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="mb-6">
          <Input
            placeholder="Search links..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Links */}
        {filteredLinks.length === 0 ? (
          <div className="text-center py-12">
            <Link2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {searchQuery ? 'No links found matching your search' : 'No manual links created yet'}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Use the Link Generator tab to create tracked short links
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLinks.map((link) => (
              <div
                key={link.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  {/* Link Info */}
                  <div className="flex-1 min-w-0 space-y-3">
                    {/* Short URL */}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Link2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-500">
                          Short Link:
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={link.shortUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline font-mono text-sm"
                        >
                          {link.shortUrl}
                        </a>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(link.shortUrl, 'Short link')}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Original URL */}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-500">
                          Original URL:
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-700 truncate font-mono">
                          {link.originalUrl}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(link.originalUrl, 'Original URL')}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {/* UTM Parameters */}
                    {(link.utmSource || link.utmMedium || link.utmCampaign) && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {link.utmSource && (
                          <Badge variant="secondary">
                            Source: {link.utmSource}
                          </Badge>
                        )}
                        {link.utmMedium && (
                          <Badge variant="secondary">
                            Medium: {link.utmMedium}
                          </Badge>
                        )}
                        {link.utmCampaign && (
                          <Badge variant="secondary">
                            Campaign: {link.utmCampaign}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Stats & Actions */}
                  <div className="flex flex-row lg:flex-col items-center lg:items-end gap-4">
                    {/* Stats */}
                    <div className="flex gap-4 lg:gap-6">
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-gray-500 mb-1">
                          <MousePointerClick className="w-4 h-4" />
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                          {link.totalClicks}
                        </div>
                        <div className="text-xs text-gray-500">
                          {link.uniqueClicks} unique
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(link.shortUrl, '_blank')}
                        title="Open link"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(link.id)}
                        title="Delete link"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Created {formatDistanceToNow(new Date(link.createdAt), { addSuffix: true })}
                  </div>
                  {link.lastClickedAt && (
                    <div className="flex items-center gap-1">
                      <MousePointerClick className="w-3 h-3" />
                      Last click {formatDistanceToNow(new Date(link.lastClickedAt), { addSuffix: true })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
