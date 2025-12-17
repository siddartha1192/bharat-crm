import { useState, useEffect } from 'react';
import { Lead, LeadStatus, LeadPriority, LeadSource } from '@/types/lead';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { AssignmentDropdown } from '@/components/common/AssignmentDropdown';

interface LeadDialogProps {
  lead?: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (lead: Lead) => void;
}

export function LeadDialog({ lead, open, onOpenChange, onSave }: LeadDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    whatsapp: '',
    source: 'web-form' as LeadSource,
    status: 'new' as LeadStatus,
    priority: 'medium' as LeadPriority,
    estimatedValue: 0,
    assignedTo: '',
    notes: '',
    website: '',
    linkedIn: '',
    twitter: '',
    facebook: '',
    tags: '',
  });

  useEffect(() => {
    if (lead) {
      setFormData({
        name: lead.name || '',
        company: lead.company || '',
        email: lead.email || '',
        phone: lead.phone || '',
        whatsapp: lead.whatsapp || '',
        source: lead.source || 'web-form',
        status: lead.status || 'new',
        priority: lead.priority || 'medium',
        estimatedValue: lead.estimatedValue || 0,
        assignedTo: lead.assignedTo || '',
        notes: lead.notes || '',
        website: lead.website || '',
        linkedIn: lead.linkedIn || '',
        twitter: lead.twitter || '',
        facebook: lead.facebook || '',
        tags: lead.tags.join(', ') || '',
      });
    } else {
      // Reset form for new lead
      setFormData({
        name: '',
        company: '',
        email: '',
        phone: '',
        whatsapp: '',
        source: 'web-form',
        status: 'new',
        priority: 'medium',
        estimatedValue: 0,
        assignedTo: '',
        notes: '',
        website: '',
        linkedIn: '',
        twitter: '',
        facebook: '',
        tags: '',
      });
    }
  }, [lead, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newLead: Lead = {
      id: lead?.id || `L${Date.now()}`,
      name: formData.name,
      company: formData.company,
      email: formData.email,
      phone: formData.phone,
      whatsapp: formData.whatsapp || undefined,
      source: formData.source,
      status: formData.status,
      priority: formData.priority,
      estimatedValue: Number(formData.estimatedValue),
      assignedTo: formData.assignedTo,
      notes: formData.notes,
      createdAt: lead?.createdAt || new Date(),
      lastContactedAt: lead?.lastContactedAt,
      nextFollowUpAt: lead?.nextFollowUpAt,
      tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
      website: formData.website || undefined,
      linkedIn: formData.linkedIn || undefined,
      twitter: formData.twitter || undefined,
      facebook: formData.facebook || undefined,
    };

    onSave(newLead);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead ? 'Edit Lead' : 'Add New Lead'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="company">Company *</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          {/* Lead Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Lead Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="source">Source</Label>
                <Select value={formData.source} onValueChange={(value: LeadSource) => setFormData({ ...formData, source: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="web-form">Web Form</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="social-media">Social Media</SelectItem>
                    <SelectItem value="missed-call">Missed Call</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value: LeadStatus) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="proposal">Proposal</SelectItem>
                    <SelectItem value="negotiation">Negotiation</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(value: LeadPriority) => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="estimatedValue">Estimated Value (₹)</Label>
                <Input
                  id="estimatedValue"
                  type="number"
                  value={formData.estimatedValue}
                  onChange={(e) => setFormData({ ...formData, estimatedValue: Number(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="assignedTo">Assigned To</Label>
              <AssignmentDropdown
                value={formData.assignedTo}
                onChange={(value) => setFormData({ ...formData, assignedTo: value })}
                placeholder="Select user to assign this lead"
              />
            </div>
          </div>

          {/* Social Media & Web */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Online Presence</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <Label htmlFor="linkedIn">LinkedIn</Label>
                <Input
                  id="linkedIn"
                  value={formData.linkedIn}
                  onChange={(e) => setFormData({ ...formData, linkedIn: e.target.value })}
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="twitter">Twitter</Label>
                <Input
                  id="twitter"
                  value={formData.twitter}
                  onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                  placeholder="https://twitter.com/..."
                />
              </div>
              <div>
                <Label htmlFor="facebook">Facebook</Label>
                <Input
                  id="facebook"
                  value={formData.facebook}
                  onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                  placeholder="https://facebook.com/..."
                />
              </div>
            </div>
          </div>

          {/* Notes & Tags */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="enterprise, hot-lead, follow-up"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {lead ? 'Update Lead' : 'Create Lead'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
