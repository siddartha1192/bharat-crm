/**
 * Campaign TypeScript Types
 */

export type CampaignChannel = 'email' | 'whatsapp';
export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'completed' | 'paused' | 'failed';
export type CampaignTargetType = 'all' | 'leads' | 'contacts' | 'custom' | 'tags' | 'stage';
export type RecipientStatus = 'pending' | 'sent' | 'failed' | 'delivered' | 'opened';
export type RecipientType = 'lead' | 'contact';

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  channel: CampaignChannel;
  status: CampaignStatus;

  // Content
  subject?: string;
  htmlContent?: string;
  textContent: string;

  // Scheduling
  scheduledAt?: string;
  completedAt?: string;

  // Target audience
  targetType: CampaignTargetType;
  targetFilters?: Record<string, any>;

  // Statistics
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  deliveredCount: number;
  openedCount: number;

  // Metadata
  createdAt: string;
  updatedAt: string;
  userId: string;

  // Relations count (from Prisma)
  _count?: {
    recipients: number;
    logs: number;
  };
}

export interface CampaignRecipient {
  id: string;
  campaignId: string;

  // Recipient details
  recipientType: RecipientType;
  recipientId: string;
  recipientName: string;
  recipientEmail?: string;
  recipientPhone?: string;

  // Delivery status
  status: RecipientStatus;
  sentAt?: string;
  deliveredAt?: string;
  openedAt?: string;
  failedAt?: string;
  errorMessage?: string;

  // External IDs
  messageId?: string;

  createdAt: string;
  updatedAt: string;
}

export interface CampaignLog {
  id: string;
  campaignId: string;
  action: string;
  message: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface CampaignStats {
  total: number;
  sent: number;
  failed: number;
  delivered: number;
  opened: number;
  byStatus: Record<RecipientStatus, number>;
}

export interface CampaignTemplate {
  id: string;
  name: string;
  channel: CampaignChannel;
  subject?: string;
  htmlContent?: string;
  textContent: string;
  targetType: CampaignTargetType;
}

export interface CreateCampaignData {
  name: string;
  description?: string;
  channel: CampaignChannel;
  subject?: string;
  htmlContent?: string;
  textContent: string;
  targetType: CampaignTargetType;
  targetFilters?: Record<string, any>;
  scheduledAt?: string;
}

export interface CampaignFilters {
  status?: CampaignStatus;
  channel?: CampaignChannel;
  search?: string;
}

export interface RecipientPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface TargetFilters {
  // For leads
  status?: string[];
  priority?: string[];
  tags?: string[];
  assignedTo?: string;
  createdAfter?: string;

  // For contacts
  type?: string[];
}
