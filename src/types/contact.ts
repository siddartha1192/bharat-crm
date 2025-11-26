export type ContactType = 'customer' | 'prospect' | 'partner' | 'vendor';
export type IndustryType = 'technology' | 'manufacturing' | 'retail' | 'export' | 'services' | 'textile' | 'food' | 'healthcare' | 'other';

export interface Contact {
  id: string;
  name: string;
  company: string;
  designation: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  whatsapp?: string;
  type: ContactType;
  industry: IndustryType;
  companySize: string;
  gstNumber?: string;
  panNumber?: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  website?: string;
  linkedIn?: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  assignedTo: string;
  lifetimeValue: number;
}
