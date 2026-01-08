import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
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
import {
  Mail,
  Plus,
  Edit,
  Trash2,
  Eye,
  Send,
  Copy,
  Clock,
  TrendingUp,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  Loader2,
  Code,
  History,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  subject: string;
  htmlBody: string;
  variables: Variable[];
  isActive: boolean;
  isDefault: boolean;
  version: number;
  usageCount: number;
  testEmailCount: number;
  lastUsedAt: string | null;
  lastTestedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUser?: { name: string; email: string };
  lastEditedByUser?: { name: string; email: string };
  versions?: TemplateVersion[];
}

interface Variable {
  name: string;
  description: string;
  example: string;
  required: boolean;
}

interface TemplateVersion {
  id: string;
  version: number;
  subject: string;
  htmlBody: string;
  changeNotes: string;
  createdAt: string;
  changedByUser: { name: string; email: string };
}

interface TemplateType {
  value: string;
  label: string;
  description: string;
  icon: string;
}

export default function EmailTemplatesSettings() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [templateTypes, setTemplateTypes] = useState<TemplateType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isTestEmailOpen, setIsTestEmailOpen] = useState(false);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewSubject, setPreviewSubject] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: '',
    subject: '',
    htmlBody: '',
    isActive: true,
    changeNotes: '',
  });

  // Fetch templates
  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/email-templates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTemplates(response.data);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      if (error.response?.status !== 403) {
        toast({
          title: 'Error',
          description: 'Failed to load email templates',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch template types
  const fetchTemplateTypes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/email-templates/meta/types`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTemplateTypes(response.data);
    } catch (error) {
      console.error('Error fetching template types:', error);
    }
  };

  useEffect(() => {
    fetchTemplates();
    fetchTemplateTypes();
  }, []);

  const handleCreate = () => {
    setSelectedTemplate(null);
    setFormData({
      name: '',
      description: '',
      type: '',
      subject: '',
      htmlBody: '',
      isActive: true,
      changeNotes: '',
    });
    setIsEditorOpen(true);
  };

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      type: template.type,
      subject: template.subject,
      htmlBody: template.htmlBody,
      isActive: template.isActive,
      changeNotes: '',
    });
    setIsEditorOpen(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');

      if (selectedTemplate) {
        // Update existing template
        await axios.put(
          `${API_URL}/email-templates/${selectedTemplate.id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast({
          title: 'Success',
          description: 'Template updated successfully',
        });
      } else {
        // Create new template
        await axios.post(
          `${API_URL}/email-templates`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast({
          title: 'Success',
          description: 'Template created successfully',
        });
      }

      setIsEditorOpen(false);
      fetchTemplates();
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to save template',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/email-templates/${templateId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast({
        title: 'Success',
        description: 'Template deleted successfully',
      });
      fetchTemplates();
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to delete template',
        variant: 'destructive',
      });
    }
  };

  const handlePreview = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/email-templates/preview`,
        {
          subject: formData.subject,
          htmlBody: formData.htmlBody,
          type: formData.type,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPreviewSubject(response.data.subject);
      setPreviewHtml(response.data.htmlBody);
      setIsPreviewOpen(true);
    } catch (error) {
      console.error('Error previewing template:', error);
      toast({
        title: 'Error',
        description: 'Failed to preview template',
        variant: 'destructive',
      });
    }
  };

  const handleSendTest = async () => {
    try {
      setTesting(true);
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/email-templates/${selectedTemplate?.id}/test`,
        { testEmail },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({
        title: 'Success',
        description: `Test email sent to ${testEmail || 'your email'}`,
      });
      setIsTestEmailOpen(false);
      setTestEmail('');
      fetchTemplates();
    } catch (error) {
      console.error('Error sending test email:', error);
      toast({
        title: 'Error',
        description: 'Failed to send test email',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleDuplicate = async (templateId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/email-templates/${templateId}/duplicate`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({
        title: 'Success',
        description: 'Template duplicated successfully',
      });
      fetchTemplates();
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast({
        title: 'Error',
        description: 'Failed to duplicate template',
        variant: 'destructive',
      });
    }
  };

  const showVersionHistory = async (template: EmailTemplate) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/email-templates/${template.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedTemplate(response.data);
      setIsVersionHistoryOpen(true);
    } catch (error) {
      console.error('Error fetching version history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load version history',
        variant: 'destructive',
      });
    }
  };

  const getVariablesForType = (type: string): Variable[] => {
    const template = templates.find(t => t.type === type);
    return template?.variables || [];
  };

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    const matchesType = filterType === 'all' || template.type === filterType;
    const matchesSearch =
      searchQuery === '' ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Email Templates</h2>
          <p className="text-muted-foreground">
            Manage and customize email templates for your communications
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Analytics Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Templates</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {templates.filter(t => t.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Emails Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {templates.reduce((sum, t) => sum + t.usageCount, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tests Sent</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {templates.reduce((sum, t) => sum + t.testEmailCount, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {templateTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Templates List */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTemplates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No templates found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTemplates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{template.name}</div>
                        {template.description && (
                          <div className="text-sm text-muted-foreground">
                            {template.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {templateTypes.find(t => t.value === template.type)?.label || template.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {template.isActive ? (
                          <Badge className="bg-green-500">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                        {template.isDefault && (
                          <Badge variant="outline">Default</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{template.usageCount} sent</div>
                        <div className="text-muted-foreground">
                          {template.testEmailCount} tests
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">v{template.version}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(template.updatedAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(template)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedTemplate(template);
                            setIsTestEmailOpen(true);
                          }}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => showVersionHistory(template)}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDuplicate(template.id)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {!template.isDefault && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(template.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? 'Edit Template' : 'Create New Template'}
            </DialogTitle>
            <DialogDescription>
              {selectedTemplate
                ? 'Update your email template. Changes will create a new version.'
                : 'Create a new email template for your communications.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Password Reset Email"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of when this template is used"
                />
              </div>

              <div>
                <Label htmlFor="type">Template Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                  disabled={!!selectedTemplate}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select template type" />
                  </SelectTrigger>
                  <SelectContent>
                    {templateTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTemplate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Template type cannot be changed after creation
                  </p>
                )}
              </div>

              {formData.type && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="text-sm">
                      <strong>Available Variables:</strong>
                      <div className="mt-2 space-y-1">
                        {getVariablesForType(formData.type).slice(0, 5).map(v => (
                          <div key={v.name} className="font-mono text-xs">
                            {'{{'}
                            {v.name}
                            {'}}'}
                            {v.required && <span className="text-red-500">*</span>} - {v.description}
                          </div>
                        ))}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <Label htmlFor="subject">Email Subject</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="e.g., Reset Your Password"
                />
              </div>

              <div>
                <Label htmlFor="htmlBody">HTML Body</Label>
                <Textarea
                  id="htmlBody"
                  value={formData.htmlBody}
                  onChange={(e) => setFormData({ ...formData, htmlBody: e.target.value })}
                  placeholder="Enter HTML template..."
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>

              {selectedTemplate && (
                <div>
                  <Label htmlFor="changeNotes">Change Notes (Optional)</Label>
                  <Input
                    id="changeNotes"
                    value={formData.changeNotes}
                    onChange={(e) => setFormData({ ...formData, changeNotes: e.target.value })}
                    placeholder="Describe what changed in this version"
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  Template is active (can be used in production)
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditorOpen(false)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={handlePreview} disabled={!formData.subject || !formData.htmlBody}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.name || !formData.type || !formData.subject || !formData.htmlBody}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Template'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
            <DialogDescription>
              Preview with sample data. Variables are replaced with example values.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Subject</Label>
              <div className="p-3 bg-muted rounded-md">{previewSubject}</div>
            </div>
            <div>
              <Label>Email Body</Label>
              <div
                className="border rounded-md p-4 bg-white"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsPreviewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Email Dialog */}
      <Dialog open={isTestEmailOpen} onOpenChange={setIsTestEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Send a test email to verify the template looks correct.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="testEmail">Recipient Email (Optional)</Label>
              <Input
                id="testEmail"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="Leave empty to use your email"
              />
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                The test email will use sample data for all variables.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTestEmailOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendTest} disabled={testing}>
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Test
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={isVersionHistoryOpen} onOpenChange={setIsVersionHistoryOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
            <DialogDescription>
              View all changes made to this template over time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedTemplate?.versions && selectedTemplate.versions.length > 0 ? (
              selectedTemplate.versions.map((version) => (
                <Card key={version.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm">
                          Version {version.version}
                        </CardTitle>
                        <CardDescription>
                          {new Date(version.createdAt).toLocaleString()} by{' '}
                          {version.changedByUser.name}
                        </CardDescription>
                      </div>
                      <Badge variant="outline">v{version.version}</Badge>
                    </div>
                  </CardHeader>
                  {version.changeNotes && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {version.changeNotes}
                      </p>
                    </CardContent>
                  )}
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No version history available
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsVersionHistoryOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
