import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, Copy, Sparkles, Code, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface LandingPage {
  id: string;
  name: string;
  slug: string;
  title: string;
  isPublished: boolean;
  viewCount: number;
  createdAt: string;
  form?: {
    id: string;
    name: string;
    slug: string;
  };
}

export default function LandingPages() {
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    metaDescription: '',
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/landing-pages`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch pages');

      const data = await response.json();
      setPages(data);
    } catch (error) {
      console.error('Error fetching pages:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch landing pages',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/landing-pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to create page');

      const newPage = await response.json();

      toast({
        title: 'Success',
        description: 'Landing page created successfully',
      });

      setIsCreateDialogOpen(false);
      setFormData({ name: '', title: '', metaDescription: '' });

      // Navigate to the builder
      navigate(`/landing-pages/builder/${newPage.id}`);
    } catch (error) {
      console.error('Error creating page:', error);
      toast({
        title: 'Error',
        description: 'Failed to create landing page',
        variant: 'destructive',
      });
    }
  };

  const handleDeletePage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this landing page?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/landing-pages/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete page');

      toast({
        title: 'Success',
        description: 'Landing page deleted successfully',
      });

      fetchPages();
    } catch (error) {
      console.error('Error deleting page:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete landing page',
        variant: 'destructive',
      });
    }
  };

  const handleTogglePublish = async (page: LandingPage) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/landing-pages/${page.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isPublished: !page.isPublished }),
      });

      if (!response.ok) throw new Error('Failed to update page');

      toast({
        title: 'Success',
        description: `Page ${!page.isPublished ? 'published' : 'unpublished'}`,
      });

      fetchPages();
    } catch (error) {
      console.error('Error toggling page:', error);
      toast({
        title: 'Error',
        description: 'Failed to update page',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/landing-pages/${id}/duplicate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to duplicate page');

      toast({
        title: 'Success',
        description: 'Landing page duplicated successfully',
      });

      fetchPages();
    } catch (error) {
      console.error('Error duplicating page:', error);
      toast({
        title: 'Error',
        description: 'Failed to duplicate page',
        variant: 'destructive',
      });
    }
  };

  const copyPageUrl = (slug: string) => {
    const baseUrl = API_URL.replace('/api', '');
    const url = `${baseUrl}/page/${slug}`;
    navigator.clipboard.writeText(url);
    toast({
      title: 'Copied!',
      description: 'Page URL copied to clipboard',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg">Loading landing pages...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Landing Pages</h1>
          <p className="text-muted-foreground mt-1">
            Create beautiful landing pages with AI-powered editing
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Page
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pages.map((page) => (
          <Card key={page.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    {page.name}
                    <Badge variant={page.isPublished ? 'default' : 'secondary'}>
                      {page.isPublished ? 'Published' : 'Draft'}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="mt-1">{page.title}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Views:</span>
                  <span className="font-medium">{page.viewCount}</span>
                </div>
                {page.form && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Form:</span>
                    <span className="font-medium text-xs">{page.form.name}</span>
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  Created: {new Date(page.createdAt).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <div className="flex items-center justify-between w-full">
                <span className="text-sm text-muted-foreground">Published</span>
                <Switch
                  checked={page.isPublished}
                  onCheckedChange={() => handleTogglePublish(page)}
                />
              </div>
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/landing-pages/builder/${page.id}`)}
                  className="flex-1"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyPageUrl(page.slug)}
                  title="Copy URL"
                >
                  <Globe className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDuplicate(page.id)}
                  title="Duplicate"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeletePage(page.id)}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>

      {pages.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No landing pages created yet</p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Your First Landing Page
          </Button>
        </div>
      )}

      {/* Create Page Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Landing Page</DialogTitle>
            <DialogDescription>
              Create a new landing page with AI-powered editing capabilities
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreatePage} className="space-y-4">
            <div>
              <Label htmlFor="name">Page Name (Internal)</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Product Launch Page"
                required
              />
            </div>
            <div>
              <Label htmlFor="title">Page Title (SEO)</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Revolutionary Product - Transform Your Business"
                required
              />
            </div>
            <div>
              <Label htmlFor="metaDescription">Meta Description (SEO)</Label>
              <Textarea
                id="metaDescription"
                value={formData.metaDescription}
                onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                placeholder="Brief description for search engines"
                maxLength={160}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.metaDescription.length}/160 characters
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create & Start Building</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
