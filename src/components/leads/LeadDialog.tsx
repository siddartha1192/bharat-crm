import { useState, useEffect } from 'react';
import { Lead, LeadStatus, LeadPriority, LeadSource } from '@/types/lead';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserPlus, X, AlertCircle } from 'lucide-react';
import { AssignmentDropdown } from '@/components/common/AssignmentDropdown';
import { pipelineStagesAPI, pipelineConfigAPI } from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PhoneInput } from '@/components/shared/PhoneInput';

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
    phoneCountryCode: '+91',
    whatsapp: '',
    whatsappCountryCode: '+91',
    source: 'web-form' as LeadSource,
    status: 'new' as LeadStatus,
    stageId: undefined as string | undefined,
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

  const [pipelineStages, setPipelineStages] = useState<any[]>([]);
  const [loadingStages, setLoadingStages] = useState(true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [canCreateLeads, setCanCreateLeads] = useState(true);

  useEffect(() => {
    if (lead) {
      // Find status slug from stageId or use the status field
      let statusSlug = lead.status || 'new';
      let stageId = lead.stageId;

      if (lead.stageId && pipelineStages.length > 0) {
        const foundStage = pipelineStages.find((s: any) => s.id === lead.stageId);
        if (foundStage) {
          statusSlug = foundStage.slug;
        }
      }

      setFormData({
        name: lead.name || '',
        company: lead.company || '',
        email: lead.email || '',
        phone: lead.phone || '',
        phoneCountryCode: lead.phoneCountryCode || '+91',
        whatsapp: lead.whatsapp || '',
        whatsappCountryCode: lead.whatsappCountryCode || '+91',
        source: lead.source || 'web-form',
        status: statusSlug,
        stageId: stageId,
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
      // Reset form for new lead - set default stageId from first pipeline stage
      const defaultStageId = pipelineStages.length > 0 ? pipelineStages[0].id : undefined;
      setFormData({
        name: '',
        company: '',
        email: '',
        phone: '',
        phoneCountryCode: '+91',
        whatsapp: '',
        whatsappCountryCode: '+91',
        source: 'web-form',
        status: 'new',
        stageId: defaultStageId,
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
  }, [lead, open, pipelineStages]);

  // Fetch pipeline stages and validate on mount
  useEffect(() => {
    const fetchStagesAndValidate = async () => {
      try {
        setLoadingStages(true);
        const [stages, validation] = await Promise.all([
          pipelineStagesAPI.getAll(),
          pipelineConfigAPI.validate()
        ]);

        // Filter only LEAD or BOTH stages
        const leadStages = stages.filter(
          (s: any) => s.stageType === 'LEAD' || s.stageType === 'BOTH'
        );

        setPipelineStages(leadStages);
        setCanCreateLeads(validation.canCreateLeads);
        setValidationErrors(validation.errors);

        // Set default stage AND stageId if no lead is being edited
        if (!lead && leadStages.length > 0) {
          setFormData(prev => ({
            ...prev,
            status: leadStages[0].slug,
            stageId: leadStages[0].id // ✅ Set stageId for new leads
          }));
        }
      } catch (error) {
        console.error('Error fetching pipeline stages:', error);
        setValidationErrors(['Failed to load pipeline stages. Please refresh and try again.']);
        setCanCreateLeads(false);
      } finally {
        setLoadingStages(false);
      }
    };

    if (open) {
      fetchStagesAndValidate();
    }
  }, [open, lead]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newLead: Lead = {
      id: lead?.id || `L${Date.now()}`,
      name: formData.name,
      company: formData.company,
      email: formData.email,
      phone: formData.phone,
      phoneCountryCode: formData.phoneCountryCode,
      whatsapp: formData.whatsapp || undefined,
      whatsappCountryCode: formData.whatsapp ? formData.whatsappCountryCode : undefined,
      source: formData.source,
      status: formData.status,
      stageId: formData.stageId, // ✅ Now sending stageId!
      dealId: lead?.dealId, // Preserve dealId if editing
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 w-full sm:max-w-2xl overflow-hidden flex flex-col">
        {/* Modern Blue Ribbon Header */}
        <div className="relative bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 text-white px-6 py-5 shadow-lg">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <UserPlus className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold">{lead ? 'Edit Lead' : 'Add New Lead'}</h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="text-white hover:bg-white/20 rounded-lg"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Scrollable Form Area */}
        <ScrollArea className="flex-1 px-6 py-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <Alert variant="destructive" className="border-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    {validationErrors.map((error, index) => (
                      <div key={index}>{error}</div>
                    ))}
                    <div className="mt-2">
                      <a href="/settings/pipeline" className="underline font-medium">
                        Go to Pipeline Settings to create stages
                      </a>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-foreground border-l-4 border-l-blue-500 pl-3">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-semibold">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="border-2 focus:border-blue-500 rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company" className="text-sm font-semibold">Company *</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    required
                    className="border-2 focus:border-blue-500 rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="border-2 focus:border-blue-500 rounded-lg"
                />
              </div>

              <PhoneInput
                label="Phone"
                id="phone"
                phoneValue={formData.phone}
                countryCodeValue={formData.phoneCountryCode}
                onPhoneChange={(value) => setFormData({ ...formData, phone: value })}
                onCountryCodeChange={(value) => setFormData({ ...formData, phoneCountryCode: value })}
                required
              />

              <PhoneInput
                label="WhatsApp"
                id="whatsapp"
                phoneValue={formData.whatsapp}
                countryCodeValue={formData.whatsappCountryCode}
                onPhoneChange={(value) => setFormData({ ...formData, whatsapp: value })}
                onCountryCodeChange={(value) => setFormData({ ...formData, whatsappCountryCode: value })}
                placeholder="9876543210"
              />
            </div>

            {/* Lead Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-foreground border-l-4 border-l-purple-500 pl-3">Lead Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Source</Label>
                  <Select value={formData.source} onValueChange={(value: LeadSource) => setFormData({ ...formData, source: value })}>
                    <SelectTrigger className="border-2 rounded-lg">
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
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Status</Label>
                  {loadingStages ? (
                    <Select disabled>
                      <SelectTrigger className="border-2 rounded-lg">
                        <SelectValue placeholder="Loading stages..." />
                      </SelectTrigger>
                    </Select>
                  ) : pipelineStages.length === 0 ? (
                    <Select disabled>
                      <SelectTrigger className="border-2 rounded-lg">
                        <SelectValue placeholder="No pipeline stages available" />
                      </SelectTrigger>
                    </Select>
                  ) : (
                    <Select
                      value={formData.status}
                      onValueChange={(value: LeadStatus) => {
                        // Find the stage to get the stageId
                        const selectedStage = pipelineStages.find((s: any) => s.slug === value);
                        setFormData({
                          ...formData,
                          status: value,
                          ...(selectedStage && { stageId: selectedStage.id })
                        });
                      }}
                    >
                      <SelectTrigger className="border-2 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {pipelineStages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.slug}>
                            {stage.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value: LeadPriority) => setFormData({ ...formData, priority: value })}>
                    <SelectTrigger className="border-2 rounded-lg">
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
                <div className="space-y-2">
                  <Label htmlFor="estimatedValue" className="text-sm font-semibold">Estimated Value (₹)</Label>
                  <Input
                    id="estimatedValue"
                    type="number"
                    value={formData.estimatedValue}
                    onChange={(e) => setFormData({ ...formData, estimatedValue: Number(e.target.value) })}
                    className="border-2 focus:border-blue-500 rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignedTo" className="text-sm font-semibold">Assigned To</Label>
                <AssignmentDropdown
                  value={formData.assignedTo}
                  onChange={(value) => setFormData({ ...formData, assignedTo: value })}
                  placeholder="Select user to assign this lead"
                />
              </div>
            </div>

            {/* Online Presence */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-foreground border-l-4 border-l-green-500 pl-3">Online Presence</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="website" className="text-sm font-semibold">Website</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://example.com"
                    className="border-2 focus:border-blue-500 rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedIn" className="text-sm font-semibold">LinkedIn</Label>
                  <Input
                    id="linkedIn"
                    value={formData.linkedIn}
                    onChange={(e) => setFormData({ ...formData, linkedIn: e.target.value })}
                    placeholder="https://linkedin.com/in/..."
                    className="border-2 focus:border-blue-500 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="twitter" className="text-sm font-semibold">Twitter</Label>
                  <Input
                    id="twitter"
                    value={formData.twitter}
                    onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                    placeholder="https://twitter.com/..."
                    className="border-2 focus:border-blue-500 rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facebook" className="text-sm font-semibold">Facebook</Label>
                  <Input
                    id="facebook"
                    value={formData.facebook}
                    onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                    placeholder="https://facebook.com/..."
                    className="border-2 focus:border-blue-500 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Notes & Tags */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-foreground border-l-4 border-l-amber-500 pl-3">Additional Information</h3>
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-semibold">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="border-2 focus:border-blue-500 rounded-lg resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags" className="text-sm font-semibold">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="enterprise, hot-lead, follow-up"
                  className="border-2 focus:border-blue-500 rounded-lg"
                />
              </div>
            </div>
          </form>
        </ScrollArea>

        {/* Modern Action Footer */}
        <div className="border-t bg-gradient-to-r from-slate-50 to-slate-100/50 px-6 py-4 flex gap-3 shadow-lg">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={(e) => {
              e.preventDefault();
              const formElement = e.currentTarget.closest('.flex.flex-col')?.querySelector('form');
              if (formElement instanceof HTMLFormElement) {
                formElement.requestSubmit();
              }
            }}
            disabled={!canCreateLeads || loadingStages}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {lead ? 'Update Lead' : 'Create Lead'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
