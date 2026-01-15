import { useState, useEffect } from 'react';
import { invoiceTemplatesAPI } from '@/lib/api';
import { InvoiceTemplateEditor } from './InvoiceTemplateEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FileText, Plus, Edit, Trash2, Copy, Star, Loader2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_INVOICE_TEMPLATE } from '@/constants/defaultInvoiceTemplate';

interface InvoiceTemplate {
  id: string;
  name: string;
  description?: string;
  htmlTemplate: string;
  isActive: boolean;
  isDefault: boolean;
  version: number;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  createdByUser?: { name: string; email: string };
  lastEditedByUser?: { name: string; email: string };
}

export function InvoiceTemplatesSettings() {
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<InvoiceTemplate | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    htmlTemplate: '',
    isDefault: false,
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const data = await invoiceTemplatesAPI.getAll();
      setTemplates(data);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load invoice templates');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setFormData({
      name: 'New Invoice Template',
      description: '',
      htmlTemplate: DEFAULT_INVOICE_TEMPLATE,
      isDefault: templates.length === 0, // First template is default
    });
    setDialogOpen(true);
  };

  const handleEdit = (template: InvoiceTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      htmlTemplate: template.htmlTemplate,
      isDefault: template.isDefault,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.htmlTemplate) {
        toast.error('Name and HTML template are required');
        return;
      }

      if (editingTemplate) {
        await invoiceTemplatesAPI.update(editingTemplate.id, formData);
        toast.success('Template updated successfully');
      } else {
        await invoiceTemplatesAPI.create(formData);
        toast.success('Template created successfully');
      }

      setDialogOpen(false);
      fetchTemplates();
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error(error.message || 'Failed to save template');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await invoiceTemplatesAPI.delete(id);
      toast.success('Template deleted successfully');
      fetchTemplates();
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast.error(error.message || 'Failed to delete template');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await invoiceTemplatesAPI.duplicate(id);
      toast.success('Template duplicated successfully');
      fetchTemplates();
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast.error('Failed to duplicate template');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await invoiceTemplatesAPI.update(id, { isDefault: true });
      toast.success('Default template updated');
      fetchTemplates();
    } catch (error) {
      console.error('Error setting default:', error);
      toast.error('Failed to set default template');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Invoice Templates</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Customize your invoice HTML templates with your branding
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Templates List */}
      {templates.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No invoice templates</h3>
          <p className="text-muted-foreground mb-4">
            Create your first custom invoice template to get started
          </p>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Create Template
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{template.name}</h3>
                    {template.isDefault && (
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    )}
                  </div>
                  {template.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {template.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground mb-4">
                <div className="flex justify-between">
                  <span>Version:</span>
                  <span>{template.version}</span>
                </div>
                <div className="flex justify-between">
                  <span>Used:</span>
                  <span>{template.usageCount} times</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className={template.isActive ? 'text-green-600' : 'text-gray-400'}>
                    {template.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleEdit(template)}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDuplicate(template.id)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                {!template.isDefault && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetDefault(template.id)}
                  >
                    <Star className="w-4 h-4" />
                  </Button>
                )}
                {!template.isDefault && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTemplateToDelete(template.id);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'Create Template'}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? 'Update your invoice template HTML and settings'
                : 'Create a new custom invoice template'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Professional Invoice"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="isDefault">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="mr-2"
                  />
                  Set as Default Template
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this template..."
                rows={2}
              />
            </div>

            <InvoiceTemplateEditor
              htmlTemplate={formData.htmlTemplate}
              onChange={(html) => setFormData({ ...formData, htmlTemplate: html })}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                Save Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the invoice template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => templateToDelete && handleDelete(templateToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
