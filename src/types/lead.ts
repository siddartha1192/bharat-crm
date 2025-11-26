export type LeadSource = 'web-form' | 'whatsapp' | 'call' | 'email' | 'referral' | 'social-media' | 'missed-call';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
export type LeadPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  source: LeadSource;
  status: LeadStatus;
  priority: LeadPriority;
  estimatedValue: number;
  assignedTo: string;
  notes: string;
  createdAt: Date;
  lastContactedAt?: Date;
  nextFollowUpAt?: Date;
  tags: string[];
}
