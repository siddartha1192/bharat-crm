/**
 * Campaign TypeScript Types
 */

export type CampaignChannel = 'email' | 'whatsapp';
export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'completed' | 'paused' | 'failed';
export type CampaignTargetType = 'all' | 'leads' | 'contacts' | 'tags' | 'custom';
export type RecipientStatus = 'pending' | 'sent' | 'failed' | 'delivered' | 'opened';
export type RecipientType = 'lead' | 'contact' | 'custom';
export type WhatsAppMessageType = 'text' | 'media' | 'template';
export type WhatsAppMediaType = 'image' | 'document' | 'video' | 'audio';

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

  // WhatsApp-specific content (for media and template messages)
  whatsappMessageType?: WhatsAppMessageType;
  whatsappMediaType?: WhatsAppMediaType;
  whatsappMediaUrl?: string;
  whatsappCaption?: string;
  whatsappTemplateName?: string;
  whatsappTemplateLanguage?: string;
  whatsappTemplateParams?: string[];

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

  // UTM Configuration
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  platformUtmConfig?: Record<string, UtmParams>;

  // Link tracking configuration
  autoTagLinks: boolean;
  trackClicks: boolean;
  useShortLinks: boolean;

  // Metadata
  createdAt: string;
  updatedAt: string;
  userId: string;

  // Relations count (from Prisma)
  _count?: {
    recipients: number;
    logs: number;
    links?: number;
    clicks?: number;
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

  // Click tracking
  clickedCount: number;
  firstClickedAt?: string;
  lastClickedAt?: string;

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

  // WhatsApp-specific fields
  whatsappMessageType?: WhatsAppMessageType;
  whatsappMediaType?: WhatsAppMediaType;
  whatsappMediaUrl?: string;
  whatsappCaption?: string;
  whatsappTemplateName?: string;
  whatsappTemplateLanguage?: string;
  whatsappTemplateParams?: string[];

  // UTM Configuration
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  platformUtmConfig?: Record<string, UtmParams>;

  // Link tracking configuration
  autoTagLinks?: boolean;
  trackClicks?: boolean;
  useShortLinks?: boolean;
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

  // For custom list
  customList?: {
    emails?: string[];
    phones?: string[];
  };
}

// ============================================================================
// UTM TRACKING TYPES
// ============================================================================

export interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

export interface CampaignLink {
  id: string;
  tenantId: string;
  campaignId: string;

  // Link details
  originalUrl: string;
  taggedUrl: string;
  shortCode?: string;
  shortUrl?: string;

  // UTM Parameters
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;

  // Link metadata
  linkText?: string;
  linkPosition?: string;
  platform?: string;

  // Statistics
  totalClicks: number;
  uniqueClicks: number;
  lastClickedAt?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface CampaignClick {
  id: string;
  tenantId: string;
  campaignId: string;
  linkId: string;

  // Recipient tracking
  recipientId?: string;
  recipientType?: string;
  recipientEmail?: string;
  recipientPhone?: string;

  // Click metadata
  ipAddress?: string;
  userAgent?: string;
  device?: string;
  browser?: string;
  os?: string;

  // Location tracking
  country?: string;
  region?: string;
  city?: string;

  // Referrer and UTM passthrough
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;

  // Timestamp
  clickedAt: string;
}

export interface UtmTemplate {
  id: string;
  tenantId: string;

  name: string;
  description?: string;

  // Default UTM values
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;

  // Platform targeting
  platform?: string;

  // Status
  isDefault: boolean;
  isActive: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface LinkAnalytics {
  linkId: string;
  originalUrl: string;
  taggedUrl: string;
  shortUrl?: string;
  platform?: string;
  linkText?: string;
  linkPosition?: string;
  totalClicks: number;
  uniqueClicks: number;
  lastClickedAt?: string;
  utmParams: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  clicksByDevice: Record<string, number>;
  clicksByBrowser: Record<string, number>;
  clicksByOS: Record<string, number>;
  clicksByLocation: Record<string, number>;
  clickTimeline: Record<string, number>;
}

export interface CampaignAnalytics {
  links: LinkAnalytics[];
  summary: {
    totalLinks: number;
    totalClicks: number;
    totalUniqueClicks: number;
    averageClicksPerLink: string;
    topPerformingLink?: {
      url: string;
      clicks: number;
    };
  };
}

export interface CreateUtmTemplateData {
  name: string;
  description?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  platform?: string;
  isDefault?: boolean;
}
