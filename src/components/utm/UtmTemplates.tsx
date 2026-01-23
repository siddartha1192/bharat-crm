import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Edit, Trash2, FileCode, Star, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';

interface UtmTemplate {
  id: string;
  name: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  platform?: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function UtmTemplates() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<UtmTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<UtmTemplate | null>(null);
  const [filterPlatform, setFilterPlatform] = useState<string>('all');

  // Form state
  const [name, setName] = useState('');
  const [utmSource, setUtmSource] = useState('');
  const [utmMedium, setUtmMedium] = useState('');
  const [utmCampaign, setUtmCampaign] = useState('');
  const [utmTerm, setUtmTerm] = useState('');
  const [utmContent, setUtmContent] = useState('');
  const [platform, setPlatform] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, [filterPlatform]);

  const fetchTemplates = async () => {
    try {
      const params = filterPlatform !== 'all' ? { platform: filterPlatform } : {};
      const response = await api.get('/utm-templates', { params });
      console.log('Templates Response:', response.data);
      // Backend returns { success: true, data: [...] }
      const templatesData = response.data.data || response.data;
      console.log('Extracted Templates Data:', templatesData);

      // Ensure we have an array
      if (Array.isArray(templatesData)) {
        setTemplates(templatesData);
      } else {
        console.error('Templates data is not an array:', templatesData);
        setTemplates([]);
      }
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      console.error('Error response:', error.response?.data);
      toast({
        title: 'Error',
        description: error.response?.data?.error || error.response?.data?.message || 'Failed to fetch templates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingTemplate(null);
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (template: UtmTemplate) => {
    setEditingTemplate(template);
    setName(template.name);
    setUtmSource(template.utmSource || '');
    setUtmMedium(template.utmMedium || '');
    setUtmCampaign(template.utmCampaign || '');
    setUtmTerm(template.utmTerm || '');
    setUtmContent(template.utmContent || '');
    setPlatform(template.platform || '');
    setIsDefault(template.isDefault);
    setIsActive(template.isActive);
    setDialogOpen(true);
  };

  const resetForm = () => {
    setName('');
    setUtmSource('');
    setUtmMedium('');
    setUtmCampaign('');
    setUtmTerm('');
    setUtmContent('');
    setPlatform('');
    setIsDefault(false);
    setIsActive(true);
  };

  const handleSave = async () => {
    if (!name) {
      toast({
        title: 'Missing Required Fields',
        description: 'Please provide a template name',
        variant: 'destructive',
      });
      return;
    }

    try {
      const data = {
        name,
        utmSource: utmSource || undefined,
        utmMedium: utmMedium || undefined,
        utmCampaign: utmCampaign || undefined,
        utmTerm: utmTerm || undefined,
        utmContent: utmContent || undefined,
        platform: platform || undefined,
        isDefault,
        isActive,
      };

      if (editingTemplate) {
        await api.put(`/utm-templates/${editingTemplate.id}`, data);
        toast({
          title: 'Success',
          description: 'Template updated successfully',
        });
      } else {
        await api.post('/utm-templates', data);
        toast({
          title: 'Success',
          description: 'Template created successfully',
        });
      }

      setDialogOpen(false);
      fetchTemplates();
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save template',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await api.delete(`/utm-templates/${id}`);
      toast({
        title: 'Success',
        description: 'Template deleted successfully',
      });
      fetchTemplates();
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete template',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading templates...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileCode className="w-5 h-5" />
                UTM Templates
              </CardTitle>
              <CardDescription>
                Create and manage reusable UTM parameter templates for your campaigns
              </CardDescription>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter */}
          <div className="mb-6">
            <Label>Filter by Platform</Label>
            <Select value={filterPlatform} onValueChange={setFilterPlatform}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Templates Grid */}
          {templates.length === 0 ? (
            <div className="text-center py-12">
              <FileCode className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No templates found</p>
              <Button variant="outline" onClick={openCreateDialog} className="mt-4">
                Create Your First Template
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        {template.isDefault && (
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(template)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(template.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {template.platform && (
                        <Badge variant="secondary">{template.platform}</Badge>
                      )}
                      {template.isActive ? (
                        <Badge className="bg-green-100 text-green-700">
                          <Check className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {template.utmSource && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Source:</span>
                        <span className="font-mono">{template.utmSource}</span>
                      </div>
                    )}
                    {template.utmMedium && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Medium:</span>
                        <span className="font-mono">{template.utmMedium}</span>
                      </div>
                    )}
                    {template.utmCampaign && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Campaign:</span>
                        <span className="font-mono">{template.utmCampaign}</span>
                      </div>
                    )}
                    {template.utmTerm && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Term:</span>
                        <span className="font-mono">{template.utmTerm}</span>
                      </div>
                    )}
                    {template.utmContent && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Content:</span>
                        <span className="font-mono">{template.utmContent}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'Create New Template'}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? 'Update the UTM template configuration'
                : 'Create a reusable UTM parameter template'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name *</Label>
              <Input
                id="template-name"
                placeholder="e.g., Facebook Spring Campaign"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Platform */}
            <div className="space-y-2">
              <Label htmlFor="platform">Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="twitter">Twitter/X</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* UTM Source */}
              <div className="space-y-2">
                <Label htmlFor="utm-source">UTM Source</Label>
                <Input
                  id="utm-source"
                  placeholder="e.g., facebook"
                  value={utmSource}
                  onChange={(e) => setUtmSource(e.target.value)}
                />
              </div>

              {/* UTM Medium */}
              <div className="space-y-2">
                <Label htmlFor="utm-medium">UTM Medium</Label>
                <Input
                  id="utm-medium"
                  placeholder="e.g., social"
                  value={utmMedium}
                  onChange={(e) => setUtmMedium(e.target.value)}
                />
              </div>

              {/* UTM Campaign */}
              <div className="space-y-2">
                <Label htmlFor="utm-campaign">UTM Campaign</Label>
                <Input
                  id="utm-campaign"
                  placeholder="e.g., spring_sale_2026"
                  value={utmCampaign}
                  onChange={(e) => setUtmCampaign(e.target.value)}
                />
              </div>

              {/* UTM Term */}
              <div className="space-y-2">
                <Label htmlFor="utm-term">UTM Term</Label>
                <Input
                  id="utm-term"
                  placeholder="e.g., running+shoes"
                  value={utmTerm}
                  onChange={(e) => setUtmTerm(e.target.value)}
                />
              </div>
            </div>

            {/* UTM Content */}
            <div className="space-y-2">
              <Label htmlFor="utm-content">UTM Content</Label>
              <Input
                id="utm-content"
                placeholder="e.g., logolink"
                value={utmContent}
                onChange={(e) => setUtmContent(e.target.value)}
              />
            </div>

            {/* Toggles */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="is-default">Default Template</Label>
                  <p className="text-xs text-gray-500">
                    Use as default for new campaigns
                  </p>
                </div>
                <Switch
                  id="is-default"
                  checked={isDefault}
                  onCheckedChange={setIsDefault}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="is-active">Active</Label>
                  <p className="text-xs text-gray-500">
                    Show in template selection
                  </p>
                </div>
                <Switch
                  id="is-active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingTemplate ? 'Update Template' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
