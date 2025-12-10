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

// Default stages - kept for backward compatibility
export const defaultPipelineStages: PipelineStageConfig[] = [
  {
    id: 'default-lead',
    name: 'Lead',
    slug: 'lead',
    color: 'blue',
    order: 1,
    isDefault: true,
    isActive: true,
    userId: null,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'default-qualified',
    name: 'Qualified',
    slug: 'qualified',
    color: 'cyan',
    order: 2,
    isDefault: true,
    isActive: true,
    userId: null,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'default-proposal',
    name: 'Proposal',
    slug: 'proposal',
    color: 'amber',
    order: 3,
    isDefault: true,
    isActive: true,
    userId: null,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'default-negotiation',
    name: 'Negotiation',
    slug: 'negotiation',
    color: 'orange',
    order: 4,
    isDefault: true,
    isActive: true,
    userId: null,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'default-closed-won',
    name: 'Closed Won',
    slug: 'closed-won',
    color: 'green',
    order: 5,
    isDefault: true,
    isActive: true,
    userId: null,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'default-closed-lost',
    name: 'Closed Lost',
    slug: 'closed-lost',
    color: 'red',
    order: 6,
    isDefault: true,
    isActive: true,
    userId: null,
    createdAt: new Date(),
    updatedAt: new Date()
  },
];
