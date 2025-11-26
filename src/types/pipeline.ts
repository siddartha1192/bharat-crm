export type PipelineStage =
  | 'lead'
  | 'qualified'
  | 'proposal'
  | 'negotiation'
  | 'closed-won'
  | 'closed-lost';

export interface Deal {
  id: string;
  title: string;
  company: string;
  contactName: string;
  stage: PipelineStage;
  value: number;
  probability: number; // 0-100
  expectedCloseDate: Date;
  createdAt: Date;
  updatedAt: Date;
  assignedTo: string;
  notes: string;
  tags: string[];
  nextAction: string;
  source: string;
}

export interface PipelineStageConfig {
  id: PipelineStage;
  name: string;
  color: string;
  order: number;
}

export const defaultPipelineStages: PipelineStageConfig[] = [
  { id: 'lead', name: 'Lead', color: 'bg-blue-500', order: 1 },
  { id: 'qualified', name: 'Qualified', color: 'bg-cyan-500', order: 2 },
  { id: 'proposal', name: 'Proposal', color: 'bg-amber-500', order: 3 },
  { id: 'negotiation', name: 'Negotiation', color: 'bg-orange-500', order: 4 },
  { id: 'closed-won', name: 'Closed Won', color: 'bg-green-500', order: 5 },
  { id: 'closed-lost', name: 'Closed Lost', color: 'bg-red-500', order: 6 },
];
