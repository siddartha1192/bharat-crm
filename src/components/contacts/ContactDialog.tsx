import { useState, useEffect } from 'react';
import { Contact, ContactType, IndustryType } from '@/types/contact';
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
import { UserCircle, X } from 'lucide-react';
import { AssignmentDropdown } from '@/components/common/AssignmentDropdown';

interface ContactDialogProps {
  contact?: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (contact: Contact) => void;
}

export function ContactDialog({ contact, open, onOpenChange, onSave }: ContactDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    designation: '',
    email: '',
    phone: '',
    alternatePhone: '',
    whatsapp: '',
    type: 'prospect' as ContactType,
    industry: 'other' as IndustryType,
    companySize: '',
    gstNumber: '',
    panNumber: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    website: '',
    linkedIn: '',
    notes: '',
    assignedTo: '',
    lifetimeValue: 0,
    tags: '',
  });

  useEffect(() => {
    if (contact) {
      setFormData({
        name: contact.name || '',
        company: contact.company || '',
        designation: contact.designation || '',
        email: contact.email || '',
        phone: contact.phone || '',
        alternatePhone: contact.alternatePhone || '',
        whatsapp: contact.whatsapp || '',
        type: contact.type || 'prospect',
        industry: contact.industry || 'other',
        companySize: contact.companySize || '',
        gstNumber: contact.gstNumber || '',
        panNumber: contact.panNumber || '',
        street: contact.address?.street || '',
        city: contact.address?.city || '',
        state: contact.address?.state || '',
        pincode: contact.address?.pincode || '',
        country: contact.address?.country || 'India',
        website: contact.website || '',
        linkedIn: contact.linkedIn || '',
        notes: contact.notes || '',
        assignedTo: contact.assignedTo || '',
        lifetimeValue: contact.lifetimeValue || 0,
        tags: contact.tags.join(', ') || '',
      });
    } else {
      // Reset form for new contact
      setFormData({
        name: '',
        company: '',
        designation: '',
        email: '',
        phone: '',
        alternatePhone: '',
        whatsapp: '',
        type: 'prospect',
        industry: 'other',
        companySize: '',
        gstNumber: '',
        panNumber: '',
        street: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
        website: '',
        linkedIn: '',
        notes: '',
        assignedTo: '',
        lifetimeValue: 0,
        tags: '',
      });
    }
  }, [contact, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newContact: Contact = {
      id: contact?.id || `C${Date.now()}`,
      name: formData.name,
      company: formData.company,
      designation: formData.designation,
      email: formData.email,
      phone: formData.phone,
      alternatePhone: formData.alternatePhone || undefined,
      whatsapp: formData.whatsapp || undefined,
      type: formData.type,
      industry: formData.industry,
      companySize: formData.companySize,
      gstNumber: formData.gstNumber || undefined,
      panNumber: formData.panNumber || undefined,
      address: {
        street: formData.street,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        country: formData.country,
      },
      website: formData.website || undefined,
      linkedIn: formData.linkedIn || undefined,
      notes: formData.notes,
      createdAt: contact?.createdAt || new Date(),
      updatedAt: new Date(),
      tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
      assignedTo: formData.assignedTo,
      lifetimeValue: Number(formData.lifetimeValue),
    };

    onSave(newContact);
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
                <UserCircle className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold">{contact ? 'Edit Contact' : 'Add New Contact'}</h2>
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
                  <Label htmlFor="designation" className="text-sm font-semibold">Designation *</Label>
                  <Input
                    id="designation"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    required
                    className="border-2 focus:border-blue-500 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-semibold">Phone *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    className="border-2 focus:border-blue-500 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="alternatePhone" className="text-sm font-semibold">Alternate Phone</Label>
                  <Input
                    id="alternatePhone"
                    value={formData.alternatePhone}
                    onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                    className="border-2 focus:border-blue-500 rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp" className="text-sm font-semibold">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="border-2 focus:border-blue-500 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Company Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-foreground border-l-4 border-l-purple-500 pl-3">Company Information</h3>
              <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Type</Label>
                  <Select value={formData.type} onValueChange={(value: ContactType) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger className="border-2 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="prospect">Prospect</SelectItem>
                      <SelectItem value="partner">Partner</SelectItem>
                      <SelectItem value="vendor">Vendor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Industry</Label>
                  <Select value={formData.industry} onValueChange={(value: IndustryType) => setFormData({ ...formData, industry: value })}>
                    <SelectTrigger className="border-2 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="manufacturing">Manufacturing</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="export">Export</SelectItem>
                      <SelectItem value="services">Services</SelectItem>
                      <SelectItem value="textile">Textile</SelectItem>
                      <SelectItem value="food">Food</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companySize" className="text-sm font-semibold">Company Size</Label>
                  <Input
                    id="companySize"
                    value={formData.companySize}
                    onChange={(e) => setFormData({ ...formData, companySize: e.target.value })}
                    placeholder="1-10, 11-50, 51-200, etc."
                    className="border-2 focus:border-blue-500 rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lifetimeValue" className="text-sm font-semibold">Lifetime Value (₹)</Label>
                <Input
                  id="lifetimeValue"
                  type="number"
                  value={formData.lifetimeValue}
                  onChange={(e) => setFormData({ ...formData, lifetimeValue: Number(e.target.value) })}
                  className="border-2 focus:border-blue-500 rounded-lg"
                />
              </div>
            </div>

            {/* Tax Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-foreground border-l-4 border-l-green-500 pl-3">Tax Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gstNumber" className="text-sm font-semibold">GST Number</Label>
                  <Input
                    id="gstNumber"
                    value={formData.gstNumber}
                    onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                    placeholder="22AAAAA0000A1Z5"
                    className="border-2 focus:border-blue-500 rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="panNumber" className="text-sm font-semibold">PAN Number</Label>
                  <Input
                    id="panNumber"
                    value={formData.panNumber}
                    onChange={(e) => setFormData({ ...formData, panNumber: e.target.value })}
                    placeholder="AAAAA0000A"
                    className="border-2 focus:border-blue-500 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-foreground border-l-4 border-l-amber-500 pl-3">Address</h3>
              <div className="space-y-2">
                <Label htmlFor="street" className="text-sm font-semibold">Street</Label>
                <Input
                  id="street"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  className="border-2 focus:border-blue-500 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-sm font-semibold">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="border-2 focus:border-blue-500 rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state" className="text-sm font-semibold">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="border-2 focus:border-blue-500 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pincode" className="text-sm font-semibold">Pincode</Label>
                  <Input
                    id="pincode"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    className="border-2 focus:border-blue-500 rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country" className="text-sm font-semibold">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="border-2 focus:border-blue-500 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Online Presence */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-foreground border-l-4 border-l-indigo-500 pl-3">Online Presence</h3>
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
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-foreground border-l-4 border-l-rose-500 pl-3">Additional Information</h3>
              <div className="space-y-2">
                <Label htmlFor="assignedTo" className="text-sm font-semibold">Assigned To</Label>
                <AssignmentDropdown
                  value={formData.assignedTo}
                  onChange={(value) => setFormData({ ...formData, assignedTo: value })}
                  placeholder="Select user to assign this contact"
                />
              </div>

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
                  placeholder="vip, high-value, recurring"
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
            {contact ? 'Update Contact' : 'Create Contact'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
