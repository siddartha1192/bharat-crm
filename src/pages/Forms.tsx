import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, ExternalLink, Copy, BarChart3 } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface Form {
  id: string;
  name: string;
  slug: string;
  title: string;
  description?: string;
  fields: any[];
  primaryColor: string;
  buttonText: string;
  successMessage: string;
  isActive: boolean;
  viewCount: number;
  submissionCount: number;
  _count?: {
    submissions: number;
  };
}

export default function Forms() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    description: '',
    primaryColor: '#3b82f6',
    buttonText: 'Submit',
    successMessage: "Thank you! We'll be in touch soon.",
    requireEmail: true,
    requirePhone: false,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/forms`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch forms');

      const data = await response.json();
      setForms(data);
    } catch (error) {
      console.error('Error fetching forms:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch forms',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateForm = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/forms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          fields: [
            { name: 'name', label: 'Name', type: 'text', required: true },
            { name: 'email', label: 'Email', type: 'email', required: formData.requireEmail },
            { name: 'phone', label: 'Phone', type: 'tel', required: formData.requirePhone },
            { name: 'company', label: 'Company', type: 'text', required: false },
            { name: 'message', label: 'Message', type: 'textarea', required: false },
          ],
        }),
      });

      if (!response.ok) throw new Error('Failed to create form');

      toast({
        title: 'Success',
        description: 'Form created successfully',
      });

      setIsCreateDialogOpen(false);
      resetFormData();
      fetchForms();
    } catch (error) {
      console.error('Error creating form:', error);
      toast({
        title: 'Error',
        description: 'Failed to create form',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForm) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/forms/${selectedForm.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to update form');

      toast({
        title: 'Success',
        description: 'Form updated successfully',
      });

      setIsEditDialogOpen(false);
      setSelectedForm(null);
      resetFormData();
      fetchForms();
    } catch (error) {
      console.error('Error updating form:', error);
      toast({
        title: 'Error',
        description: 'Failed to update form',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteForm = async (id: string) => {
    if (!confirm('Are you sure you want to delete this form?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/forms/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete form');

      toast({
        title: 'Success',
        description: 'Form deleted successfully',
      });

      fetchForms();
    } catch (error) {
      console.error('Error deleting form:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete form',
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (form: Form) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/forms/${form.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !form.isActive }),
      });

      if (!response.ok) throw new Error('Failed to update form');

      toast({
        title: 'Success',
        description: `Form ${!form.isActive ? 'activated' : 'deactivated'}`,
      });

      fetchForms();
    } catch (error) {
      console.error('Error toggling form:', error);
      toast({
        title: 'Error',
        description: 'Failed to update form',
        variant: 'destructive',
      });
    }
  };

  const copyEmbedCode = (slug: string) => {
    // Use window.location.origin to get full domain URL (e.g., https://climcrm.com)
    const baseUrl = window.location.origin;
    const embedCode = `<script src="${baseUrl}/embed.js"></script>
<div id="bharat-form" data-form-slug="${slug}"></div>`;

    navigator.clipboard.writeText(embedCode);
    toast({
      title: 'Copied!',
      description: 'Embed code copied to clipboard',
    });
  };

  const resetFormData = () => {
    setFormData({
      name: '',
      title: '',
      description: '',
      primaryColor: '#3b82f6',
      buttonText: 'Submit',
      successMessage: "Thank you! We'll be in touch soon.",
      requireEmail: true,
      requirePhone: false,
    });
  };

  const openEditDialog = (form: Form) => {
    setSelectedForm(form);
    setFormData({
      name: form.name,
      title: form.title,
      description: form.description || '',
      primaryColor: form.primaryColor,
      buttonText: form.buttonText,
      successMessage: form.successMessage,
      requireEmail: true,
      requirePhone: false,
    });
    setIsEditDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg">Loading forms...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Lead Capture Forms</h1>
          <p className="text-muted-foreground mt-1">
            Create embeddable forms to capture leads from anywhere
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Form
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {forms.map((form) => (
          <Card key={form.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    {form.name}
                    <Badge variant={form.isActive ? 'default' : 'secondary'}>
                      {form.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="mt-1">{form.title}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Views:</span>
                  <span className="font-medium">{form.viewCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Submissions:</span>
                  <span className="font-medium">
                    {form._count?.submissions || form.submissionCount}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Conversion:</span>
                  <span className="font-medium">
                    {form.viewCount > 0
                      ? (((form._count?.submissions || 0) / form.viewCount) * 100).toFixed(1)
                      : 0}
                    %
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <div className="flex items-center justify-between w-full">
                <span className="text-sm text-muted-foreground">Active</span>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={() => handleToggleActive(form)}
                />
              </div>
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyEmbedCode(form.slug)}
                  className="flex-1"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Embed
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(form)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteForm(form.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>

      {forms.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No forms created yet</p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Your First Form
          </Button>
        </div>
      )}

      {/* Create Form Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Form</DialogTitle>
            <DialogDescription>
              Create a new lead capture form that you can embed anywhere
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateForm} className="space-y-4">
            <div>
              <Label htmlFor="name">Form Name (Internal)</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Contact Form"
                required
              />
            </div>
            <div>
              <Label htmlFor="title">Form Title (Displayed to users)</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Get in Touch"
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the form"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="primaryColor">Primary Color</Label>
                <Input
                  id="primaryColor"
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="buttonText">Button Text</Label>
                <Input
                  id="buttonText"
                  value={formData.buttonText}
                  onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="successMessage">Success Message</Label>
              <Textarea
                id="successMessage"
                value={formData.successMessage}
                onChange={(e) => setFormData({ ...formData, successMessage: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Form</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Form Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Form</DialogTitle>
            <DialogDescription>Update your form settings</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateForm} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Form Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-title">Form Title</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-color">Primary Color</Label>
                <Input
                  id="edit-color"
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-button">Button Text</Label>
                <Input
                  id="edit-button"
                  value={formData.buttonText}
                  onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Form</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
