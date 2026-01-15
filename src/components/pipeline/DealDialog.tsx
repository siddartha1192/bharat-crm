import { useState, useEffect } from 'react';
import { Deal, PipelineStage, PipelineStageConfig } from '@/types/pipeline';
import { Contact } from '@/lib/types';
import { contactsAPI, pipelineStagesAPI } from '@/lib/api';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, ChevronsUpDown, Plus, Briefcase, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AssignmentDropdown } from '@/components/common/AssignmentDropdown';

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
    email: '',
    phone: '',
    contactId: undefined,
    stage: initialStage,
    value: 0,
    probability: 50,
    expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    assignedTo: 'Priya Sharma',
    notes: '',
    tags: [],
  });

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [contactOpen, setContactOpen] = useState(false);
  const [stages, setStages] = useState<PipelineStageConfig[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Fetch pipeline stages on mount
  useEffect(() => {
    const fetchStages = async () => {
      try {
        const stagesData = await pipelineStagesAPI.getAll();
        const stagesWithDates = stagesData.map(s => ({
          ...s,
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt)
        }));
        setStages(stagesWithDates.sort((a, b) => a.order - b.order));
      } catch (error) {
        console.error('Error fetching stages:', error);
        // Use default stages if fetch fails
        setStages([
          { id: '1', name: 'Lead', slug: 'lead', color: 'blue', order: 1, isDefault: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
          { id: '2', name: 'Qualified', slug: 'qualified', color: 'cyan', order: 2, isDefault: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
          { id: '3', name: 'Proposal', slug: 'proposal', color: 'amber', order: 3, isDefault: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
          { id: '4', name: 'Negotiation', slug: 'negotiation', color: 'orange', order: 4, isDefault: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
          { id: '5', name: 'Closed Won', slug: 'closed-won', color: 'green', order: 5, isDefault: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
          { id: '6', name: 'Closed Lost', slug: 'closed-lost', color: 'red', order: 6, isDefault: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
        ]);
      }
    };
    if (open) {
      fetchStages();
    }
  }, [open]);

  // Search contacts when search term changes
  useEffect(() => {
    const searchContacts = async () => {
      if (contactSearch.length < 2) {
        setContacts([]);
        return;
      }

      setLoadingContacts(true);
      try {
        const results = await contactsAPI.search(contactSearch);
        setContacts(results);
      } catch (error) {
        console.error('Error searching contacts:', error);
        setContacts([]);
      } finally {
        setLoadingContacts(false);
      }
    };

    const debounceTimer = setTimeout(searchContacts, 300);
    return () => clearTimeout(debounceTimer);
  }, [contactSearch]);

  // Update form data whenever the deal prop changes
  useEffect(() => {
    if (deal) {
      // Editing an existing deal
      // Find stage slug from stageId or use the stage field
      let stageSlug = deal.stage || initialStage;
      if (deal.stageId && stages.length > 0) {
        const foundStage = stages.find(s => s.id === deal.stageId);
        if (foundStage) {
          stageSlug = foundStage.slug;
        }
      }

      setFormData({
        title: deal.title || '',
        company: deal.company || '',
        contactName: deal.contactName || '',
        email: deal.email || '',
        phone: deal.phone || '',
        contactId: deal.contactId,
        stage: stageSlug,
        stageId: deal.stageId,
        value: deal.value || 0,
        probability: deal.probability || 50,
        expectedCloseDate: deal.expectedCloseDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        assignedTo: deal.assignedTo || 'Priya Sharma',
        notes: deal.notes || '',
        tags: deal.tags || [],
      });
    } else {
      // Creating a new deal
      setFormData({
        title: '',
        company: '',
        contactName: '',
        email: '',
        phone: '',
        contactId: undefined,
        stage: initialStage,
        value: 0,
        probability: 50,
        expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        assignedTo: 'Priya Sharma',
        notes: '',
        tags: [],
      });
    }
  }, [deal, initialStage, stages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📝 DealDialog submitting formData:', formData);
    console.log('📝 Stage value in formData:', formData.stage);
    console.log('📝 Is editing existing deal?', !!deal);
    onSave(formData);
    onOpenChange(false);
  };

  const updateField = (field: keyof Deal, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleContactSelect = (contact: Contact | null) => {
    if (contact) {
      setFormData(prev => ({
        ...prev,
        contactId: contact.id,
        contactName: contact.name,
        email: contact.email || prev.email || '',
        phone: contact.phone || prev.phone || '',
        company: prev.company || contact.company || '',
      }));
      setContactOpen(false);
    }
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
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{deal ? 'Edit Deal' : 'Add New Deal'}</h2>
                <p className="text-sm text-white/80">{deal ? 'Update deal information' : 'Create a new deal in your pipeline'}</p>
              </div>
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
            {/* Deal Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-foreground border-l-4 border-l-blue-500 pl-3">Deal Information</h3>
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-semibold">Deal Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="e.g., Enterprise CRM Implementation"
                  required
                  className="border-2 focus:border-blue-500 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company" className="text-sm font-semibold">Company *</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => updateField('company', e.target.value)}
                    placeholder="e.g., Tech Innovations Pvt Ltd"
                    required
                    className="border-2 focus:border-blue-500 rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Contact *</Label>
                  <Popover open={contactOpen} onOpenChange={setContactOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={contactOpen}
                        className="w-full justify-between border-2 rounded-lg"
                      >
                        {formData.contactName || "Search or enter contact name..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0 rounded-xl shadow-xl">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Search contacts..."
                          value={contactSearch}
                          onValueChange={setContactSearch}
                        />
                        <CommandList className="max-h-[300px] overflow-y-auto">
                          {loadingContacts ? (
                            <CommandEmpty>Searching...</CommandEmpty>
                          ) : contacts.length === 0 && contactSearch.length >= 2 ? (
                            <CommandEmpty>
                              <div className="text-center py-2">
                                <p className="text-sm text-muted-foreground mb-2">No contacts found</p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setFormData(prev => ({ ...prev, contactName: contactSearch, contactId: undefined }));
                                    setContactOpen(false);
                                    setContactSearch('');
                                  }}
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  Use "{contactSearch}" as new contact
                                </Button>
                              </div>
                            </CommandEmpty>
                          ) : (
                            <>
                              {contactSearch.length >= 2 && (
                                <CommandItem
                                  onSelect={() => {
                                    setFormData(prev => ({ ...prev, contactName: contactSearch, contactId: undefined }));
                                    setContactOpen(false);
                                    setContactSearch('');
                                  }}
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  <span>Create new: <strong>{contactSearch}</strong></span>
                                </CommandItem>
                              )}
                              <CommandGroup heading="Existing Contacts">
                                {contacts.map((contact) => (
                                  <CommandItem
                                    key={contact.id}
                                    onSelect={() => {
                                      handleContactSelect(contact);
                                      setContactSearch('');
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        formData.contactId === contact.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div>
                                      <div className="font-medium">{contact.name}</div>
                                      {contact.company && (
                                        <div className="text-sm text-muted-foreground">{contact.company}</div>
                                      )}
                                      {contact.email && (
                                        <div className="text-xs text-muted-foreground">{contact.email}</div>
                                      )}
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {!formData.contactId && formData.contactName && (
                    <p className="text-xs text-muted-foreground mt-1">
                      New contact will be created with this name
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="contact@example.com"
                  required
                  className="border-2 focus:border-blue-500 rounded-lg"
                />
                <p className="text-xs text-muted-foreground">
                  Synced with lead email
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-semibold">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="+91 98765 43210"
                  className="border-2 focus:border-blue-500 rounded-lg"
                />
                <p className="text-xs text-muted-foreground">
                  Synced with lead phone (normalized for deduplication)
                </p>
              </div>
            </div>

            {/* Deal Financials */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-foreground border-l-4 border-l-green-500 pl-3">Deal Financials</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="value" className="text-sm font-semibold">Deal Value (₹) *</Label>
                  <Input
                    id="value"
                    type="number"
                    value={formData.value}
                    onChange={(e) => updateField('value', parseInt(e.target.value) || 0)}
                    placeholder="e.g., 500000"
                    required
                    className="border-2 focus:border-blue-500 rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="probability" className="text-sm font-semibold">Probability (%) *</Label>
                  <Input
                    id="probability"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.probability}
                    onChange={(e) => updateField('probability', parseInt(e.target.value) || 0)}
                    placeholder="e.g., 75"
                    required
                    className="border-2 focus:border-blue-500 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Pipeline & Assignment */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-foreground border-l-4 border-l-purple-500 pl-3">Pipeline & Assignment</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Stage *</Label>
                  <Select
                    value={formData.stage}
                    onValueChange={(value) => {
                      console.log('🔄 Stage dropdown changed from', formData.stage, 'to', value);
                      // Find the stage config to get the stageId
                      const selectedStage = stages.find(s => s.slug === value);
                      if (selectedStage) {
                        setFormData(prev => ({
                          ...prev,
                          stage: value,
                          stageId: selectedStage.id
                        }));
                      } else {
                        updateField('stage', value);
                      }
                    }}
                  >
                    <SelectTrigger className="border-2 rounded-lg">
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map(stage => (
                        <SelectItem key={stage.id} value={stage.slug}>
                          {stage.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Assigned To *</Label>
                  <AssignmentDropdown
                    value={formData.assignedTo || ''}
                    onChange={(value) => updateField('assignedTo', value)}
                    placeholder="Select user to assign this deal"
                  />
                  <p className="text-xs text-muted-foreground">
                    Synced with lead assignment
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expectedCloseDate" className="text-sm font-semibold">Expected Close Date *</Label>
                <Input
                  id="expectedCloseDate"
                  type="date"
                  value={formData.expectedCloseDate instanceof Date
                    ? formData.expectedCloseDate.toISOString().split('T')[0]
                    : new Date().toISOString().split('T')[0]
                  }
                  onChange={(e) => updateField('expectedCloseDate', new Date(e.target.value))}
                  required
                  className="border-2 focus:border-blue-500 rounded-lg"
                />
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-foreground border-l-4 border-l-amber-500 pl-3">Additional Information</h3>
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-semibold">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  placeholder="Add any additional notes about this deal..."
                  rows={3}
                  className="border-2 focus:border-blue-500 rounded-lg resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags" className="text-sm font-semibold">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={formData.tags?.join(', ')}
                  onChange={(e) => updateField('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                  placeholder="e.g., enterprise, hot-deal, urgent"
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
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all rounded-lg"
          >
            {deal ? 'Update Deal' : 'Create Deal'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
