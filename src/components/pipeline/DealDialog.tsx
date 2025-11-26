import { useState, useEffect } from 'react';
import { Deal, PipelineStage } from '@/types/pipeline';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (deal: Partial<Deal>) => void;
  initialStage?: PipelineStage;
  deal?: Deal | null;
}

export function DealDialog({ open, onOpenChange, onSave, initialStage = 'lead', deal }: DealDialogProps) {
  const [formData, setFormData] = useState<Partial<Deal>>({
    title: '',
    company: '',
    contactName: '',
    stage: initialStage,
    value: 0,
    probability: 50,
    expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    assignedTo: 'Priya Sharma',
    notes: '',
    nextAction: '',
    source: 'website',
    tags: [],
  });

  // Update form data whenever the deal prop changes
  useEffect(() => {
    if (deal) {
      // Editing an existing deal
      setFormData({
        title: deal.title || '',
        company: deal.company || '',
        contactName: deal.contactName || '',
        stage: deal.stage || initialStage,
        value: deal.value || 0,
        probability: deal.probability || 50,
        expectedCloseDate: deal.expectedCloseDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        assignedTo: deal.assignedTo || 'Priya Sharma',
        notes: deal.notes || '',
        nextAction: deal.nextAction || '',
        source: deal.source || 'website',
        tags: deal.tags || [],
      });
    } else {
      // Creating a new deal
      setFormData({
        title: '',
        company: '',
        contactName: '',
        stage: initialStage,
        value: 0,
        probability: 50,
        expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        assignedTo: 'Priya Sharma',
        notes: '',
        nextAction: '',
        source: 'website',
        tags: [],
      });
    }
  }, [deal, initialStage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onOpenChange(false);
  };

  const updateField = (field: keyof Deal, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{deal ? 'Edit Deal' : 'Add New Deal'}</DialogTitle>
          <DialogDescription>
            {deal ? 'Update deal information' : 'Create a new deal in your pipeline'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="title">Deal Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="e.g., Enterprise CRM Implementation"
                required
              />
            </div>

            <div>
              <Label htmlFor="company">Company *</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => updateField('company', e.target.value)}
                placeholder="e.g., Tech Innovations Pvt Ltd"
                required
              />
            </div>

            <div>
              <Label htmlFor="contactName">Contact Name *</Label>
              <Input
                id="contactName"
                value={formData.contactName}
                onChange={(e) => updateField('contactName', e.target.value)}
                placeholder="e.g., Rajesh Kumar"
                required
              />
            </div>

            <div>
              <Label htmlFor="value">Deal Value (₹) *</Label>
              <Input
                id="value"
                type="number"
                value={formData.value}
                onChange={(e) => updateField('value', parseInt(e.target.value) || 0)}
                placeholder="e.g., 500000"
                required
              />
            </div>

            <div>
              <Label htmlFor="probability">Probability (%) *</Label>
              <Input
                id="probability"
                type="number"
                min="0"
                max="100"
                value={formData.probability}
                onChange={(e) => updateField('probability', parseInt(e.target.value) || 0)}
                placeholder="e.g., 75"
                required
              />
            </div>

            <div>
              <Label htmlFor="stage">Stage *</Label>
              <Select
                value={formData.stage}
                onValueChange={(value) => updateField('stage', value as PipelineStage)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="proposal">Proposal</SelectItem>
                  <SelectItem value="negotiation">Negotiation</SelectItem>
                  <SelectItem value="closed-won">Closed Won</SelectItem>
                  <SelectItem value="closed-lost">Closed Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="assignedTo">Assigned To *</Label>
              <Select
                value={formData.assignedTo}
                onValueChange={(value) => updateField('assignedTo', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Priya Sharma">Priya Sharma</SelectItem>
                  <SelectItem value="Rahul Verma">Rahul Verma</SelectItem>
                  <SelectItem value="Anjali Desai">Anjali Desai</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="expectedCloseDate">Expected Close Date *</Label>
              <Input
                id="expectedCloseDate"
                type="date"
                value={formData.expectedCloseDate instanceof Date
                  ? formData.expectedCloseDate.toISOString().split('T')[0]
                  : new Date().toISOString().split('T')[0]
                }
                onChange={(e) => updateField('expectedCloseDate', new Date(e.target.value))}
                required
              />
            </div>

            <div>
              <Label htmlFor="source">Source</Label>
              <Select
                value={formData.source}
                onValueChange={(value) => updateField('source', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="inbound">Inbound</SelectItem>
                  <SelectItem value="outbound">Outbound</SelectItem>
                  <SelectItem value="missed-call">Missed Call</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label htmlFor="nextAction">Next Action</Label>
              <Input
                id="nextAction"
                value={formData.nextAction}
                onChange={(e) => updateField('nextAction', e.target.value)}
                placeholder="e.g., Schedule demo call"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="Add any additional notes about this deal..."
                rows={3}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={formData.tags?.join(', ')}
                onChange={(e) => updateField('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                placeholder="e.g., enterprise, hot-deal, urgent"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {deal ? 'Update Deal' : 'Create Deal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
