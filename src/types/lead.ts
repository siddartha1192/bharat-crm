export type LeadSource = 'web-form' | 'whatsapp' | 'call' | 'email' | 'referral' | 'social-media' | 'missed-call';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
export type LeadPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  whatsapp?: string;
  source: LeadSource;
  status: LeadStatus;
  stageId?: string; // Reference to PipelineStage.id for dynamic stages
  dealId?: string; // Reference to Deal.id if lead has been converted
  priority: LeadPriority;
  estimatedValue: number;
  assignedTo: string;
  notes: string;
  createdAt: Date;
  lastContactedAt?: Date;
  nextFollowUpAt?: Date;
  tags: string[];
  website?: string;
  linkedIn?: string;
  twitter?: string;
  facebook?: string;
}
