import { useState, useEffect } from 'react';
import { Deal, PipelineStage, PipelineStageConfig } from '@/types/pipeline';
import { Contact } from '@/lib/types';
import { contactsAPI, pipelineStagesAPI } from '@/lib/api';
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
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      setFormData({
        title: deal.title || '',
        company: deal.company || '',
        contactName: deal.contactName || '',
        contactId: deal.contactId,
        stage: deal.stage || initialStage,
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
  }, [deal, initialStage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
        company: prev.company || contact.company || '',
      }));
      setContactOpen(false);
    }
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
              <Label htmlFor="contactName">Contact *</Label>
              <Popover open={contactOpen} onOpenChange={setContactOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={contactOpen}
                    className="w-full justify-between"
                  >
                    {formData.contactName || "Search or enter contact name..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
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
                onValueChange={(value) => updateField('stage', value)}
              >
                <SelectTrigger>
                  <SelectValue />
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
