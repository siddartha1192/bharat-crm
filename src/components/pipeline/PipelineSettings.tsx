import { useState, useEffect } from 'react';
import { PipelineStageConfig } from '@/types/pipeline';
import { pipelineStagesAPI } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, GripVertical, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface PipelineSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

interface StageFormData {
  name: string;
  slug: string;
  color: string;
  order: number;
}

const AVAILABLE_COLORS = [
  { name: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { name: 'cyan', label: 'Cyan', class: 'bg-cyan-500' },
  { name: 'green', label: 'Green', class: 'bg-green-500' },
  { name: 'amber', label: 'Amber', class: 'bg-amber-500' },
  { name: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { name: 'red', label: 'Red', class: 'bg-red-500' },
  { name: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { name: 'pink', label: 'Pink', class: 'bg-pink-500' },
  { name: 'indigo', label: 'Indigo', class: 'bg-indigo-500' },
  { name: 'teal', label: 'Teal', class: 'bg-teal-500' },
];

export function PipelineSettings({ open, onOpenChange, onUpdate }: PipelineSettingsProps) {
  const [stages, setStages] = useState<PipelineStageConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingStage, setEditingStage] = useState<PipelineStageConfig | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<StageFormData>({
    name: '',
    slug: '',
    color: 'blue',
    order: 0,
  });

  useEffect(() => {
    if (open) {
      fetchStages();
    }
  }, [open]);

  const fetchStages = async () => {
    setLoading(true);
    try {
      const data = await pipelineStagesAPI.getAll();
      const stagesWithDates = data.map(s => ({
        ...s,
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt),
      }));
      setStages(stagesWithDates.sort((a, b) => a.order - b.order));
    } catch (error) {
      toast.error('Failed to fetch stages');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    const maxOrder = stages.length > 0 ? Math.max(...stages.map(s => s.order)) : 0;
    setFormData({
      name: '',
      slug: '',
      color: 'blue',
      order: maxOrder + 1,
    });
    setEditingStage(null);
    setShowForm(true);
  };

  const handleEdit = (stage: PipelineStageConfig) => {
    setFormData({
      name: stage.name,
      slug: stage.slug,
      color: stage.color,
      order: stage.order,
    });
    setEditingStage(stage);
    setShowForm(true);
  };

  const handleDelete = async (stage: PipelineStageConfig) => {
    if (stage.isDefault) {
      toast.error('Cannot delete default stages');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${stage.name}"?`)) {
      return;
    }

    try {
      await pipelineStagesAPI.delete(stage.id);
      toast.success('Stage deleted successfully');
      fetchStages();
      onUpdate?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete stage');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Stage name is required');
      return;
    }

    // Auto-generate slug from name if not provided
    let slug = formData.slug.trim();
    if (!slug) {
      slug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }

    try {
      if (editingStage) {
        // Update existing stage
        await pipelineStagesAPI.update(editingStage.id, {
          name: formData.name,
          slug,
          color: formData.color,
          order: formData.order,
        });
        toast.success('Stage updated successfully');
      } else {
        // Create new stage
        await pipelineStagesAPI.create({
          name: formData.name,
          slug,
          color: formData.color,
          order: formData.order,
        });
        toast.success('Stage created successfully');
      }
      setShowForm(false);
      fetchStages();
      onUpdate?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save stage');
    }
  };

  const updateField = (field: keyof StageFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Pipeline Stage Settings
          </DialogTitle>
          <DialogDescription>
            Customize your sales pipeline stages. Default stages cannot be deleted.
          </DialogDescription>
        </DialogHeader>

        {!showForm ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {stages.filter(s => !s.isDefault).length} custom stage(s), {stages.filter(s => s.isDefault).length} default stage(s)
              </p>
              <Button onClick={handleAddNew} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Custom Stage
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading stages...</div>
            ) : (
              <div className="space-y-2">
                {stages.map((stage) => (
                  <Card key={stage.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                        <div
                          className={`w-4 h-4 rounded-full ${
                            AVAILABLE_COLORS.find(c => c.name === stage.color)?.class || 'bg-gray-500'
                          }`}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{stage.name}</span>
                            {stage.isDefault && (
                              <Badge variant="secondary" className="text-xs">
                                Default
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Slug: {stage.slug} • Order: {stage.order}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(stage)}
                          disabled={stage.isDefault}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(stage)}
                          disabled={stage.isDefault}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Stage Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g., Demo Scheduled"
                required
              />
            </div>

            <div>
              <Label htmlFor="slug">Slug (URL-friendly identifier) *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => updateField('slug', e.target.value)}
                placeholder="e.g., demo-scheduled (auto-generated if left empty)"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to auto-generate from name
              </p>
            </div>

            <div>
              <Label htmlFor="color">Color</Label>
              <Select value={formData.color} onValueChange={(value) => updateField('color', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_COLORS.map((color) => (
                    <SelectItem key={color.name} value={color.name}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${color.class}`} />
                        <span>{color.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="order">Display Order</Label>
              <Input
                id="order"
                type="number"
                value={formData.order}
                onChange={(e) => updateField('order', parseInt(e.target.value) || 0)}
                min="1"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingStage(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingStage ? 'Update Stage' : 'Create Stage'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
