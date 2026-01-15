// PipelineStage type for backward compatibility
export type PipelineStage = string;

export interface PipelineStageConfig {
  id: string; // UUID from database
  name: string;
  slug: string; // Used as stage value (e.g., 'lead', 'qualified')
  color: string; // Tailwind color name (e.g., 'blue', 'green')
  order: number;
  isDefault: boolean;
  isActive: boolean;
  userId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Deal {
  id: string;
  title: string;
  company: string;
  contactName: string;
  email: string; // Synced with lead email
  phone: string; // Synced with lead phone
  phoneCountryCode?: string; // Synced with lead phoneCountryCode
  phoneNormalized?: string; // E.164 format, synced with lead
  contactId?: string; // Link to Contact
  stage: string; // References PipelineStageConfig.slug
  stageId?: string; // Direct reference to PipelineStageConfig.id
  value: number;
  probability: number; // 0-100
  expectedCloseDate: Date;
  createdAt: Date;
  updatedAt: Date;
  assignedTo: string;
  notes: string;
  tags: string[];
}

// NOTE: Pipeline stages are now dynamically loaded from the database.
// Each tenant creates their own custom stages through the Pipeline Settings UI.
// Default stages are created via database migration or the create-default-stages.js script.
