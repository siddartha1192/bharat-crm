# 🏗️ Dynamic Pipeline Stages Architecture

## Overview

Pipeline Stages are now the **single source of truth** for all stage management across the entire CRM system. This enterprise-level architecture ensures:

- ✅ **One place to manage stages**: Pipeline Stages UI
- ✅ **Dynamic stage updates**: Changes automatically reflect in Leads, Deals, AI, and Automation
- ✅ **Tenant isolation**: Each tenant has their own stages
- ✅ **No duplicate stages**: One default stage per tenant
- ✅ **Business flexibility**: Each business can define their own sales process

---

## Architecture

### Single Source of Truth

```
PipelineStage (Database)
    ↓
    ├── Leads use stageId
    ├── Deals use stageId
    ├── AI filtering queries from PipelineStage
    └── Automation uses available stages from PipelineStage
```

### Stage Types

Stages can be categorized using the `stageType` enum:

- **LEAD**: Stage applies only to leads
- **DEAL**: Stage applies only to deals
- **BOTH**: Stage applies to both leads and deals (default)

### Default Stage

Each tenant gets **ONE** system default stage upon creation:
- Name: "New Lead"
- Slug: "new-lead"
- Type: LEAD
- `isSystemDefault`: true

---

## Database Schema

### PipelineStage Model

```prisma
model PipelineStage {
  id              String    @id @default(uuid())
  name            String    // Display name (e.g., "Qualified")
  slug            String    // URL-friendly identifier (e.g., "qualified")
  color           String    // Tailwind color for UI (e.g., "blue")
  order           Int       // Display order (1, 2, 3...)
  isDefault       Boolean   // Backward compatibility flag
  isSystemDefault Boolean   // True for "New Lead" default stage
  isActive        Boolean   // Soft delete
  description     String?   // Optional stage description
  stageType       StageType // LEAD, DEAL, or BOTH
  tenantId        String    // Tenant isolation

  // Relations
  leads Lead[]
  deals Deal[]

  @@unique([tenantId, slug])
}
```

### Lead Model Changes

```prisma
model Lead {
  // ... existing fields ...

  status  String        // DEPRECATED: Keep for backward compatibility
  stageId String        // NEW: Foreign key to PipelineStage
  pipelineStage PipelineStage @relation(...)
}
```

### Deal Model Changes

```prisma
model Deal {
  // ... existing fields ...

  stage   String        // DEPRECATED: Keep for backward compatibility
  stageId String        // NEW: Foreign key to PipelineStage (REQUIRED)
  pipelineStage PipelineStage @relation(...)
}
```

---

## Migration Strategy

### Step 1: Run Prisma Migration

```bash
# This will apply the schema changes and migrate existing data
npx prisma migrate deploy
```

### Step 2: Automatic Data Migration

The migration automatically:

1. ✅ Creates `StageType` enum
2. ✅ Adds new fields to `PipelineStage`
3. ✅ Removes `userId` from `PipelineStage` (stages are tenant-level)
4. ✅ Creates default "New Lead" stage for each tenant
5. ✅ Migrates existing leads to use `stageId`
6. ✅ Migrates existing deals to use `stageId`
7. ✅ Creates indexes for performance

### Step 3: Verify Migration

```bash
# Check that each tenant has a default stage
npx prisma studio
# Query: SELECT * FROM "PipelineStage" WHERE "isSystemDefault" = true
```

---

## API Changes

### Pipeline Stages Routes

```javascript
// Get all stages for current tenant
GET /api/pipeline-stages?stageType=LEAD
GET /api/pipeline-stages?stageType=DEAL
GET /api/pipeline-stages?stageType=BOTH

// Create new stage
POST /api/pipeline-stages
{
  "name": "Proposal Sent",
  "slug": "proposal-sent",
  "color": "amber",
  "order": 3,
  "stageType": "BOTH",
  "description": "Proposal has been sent to client"
}

// Update stage
PUT /api/pipeline-stages/:id
{
  "name": "Updated Name",
  "color": "green",
  "order": 2
}

// Delete stage (soft delete)
DELETE /api/pipeline-stages/:id
// Note: Cannot delete if leads/deals are using this stage
```

### Lead Routes

```javascript
// Create lead (automatically uses default stage)
POST /api/leads
{
  "name": "John Doe",
  "email": "john@example.com",
  // stageId is auto-assigned to default "New Lead" stage
}

// Update lead stage
PATCH /api/leads/:id
{
  "stageId": "stage-uuid-here"
}

// Get leads by stage
GET /api/leads?stageId=stage-uuid
```

### Deal Routes

```javascript
// Create deal (must specify stageId)
POST /api/deals
{
  "title": "Big Deal",
  "value": 50000,
  "stageId": "stage-uuid-here"  // REQUIRED
}

// Update deal stage
PATCH /api/deals/:id
{
  "stageId": "new-stage-uuid"
}
```

---

## Code Examples

### Creating a New Lead (Auto-assigns Default Stage)

```javascript
router.post('/leads', authenticate, tenantContext, async (req, res) => {
  // Get default stage for this tenant
  const defaultStage = await prisma.pipelineStage.findFirst({
    where: {
      tenantId: req.tenant.id,
      isSystemDefault: true,
      stageType: { in: ['LEAD', 'BOTH'] }
    }
  });

  const lead = await prisma.lead.create({
    data: {
      ...req.body,
      stageId: req.body.stageId || defaultStage.id,  // Use default if not specified
      tenantId: req.tenant.id,
      userId: req.user.id
    }
  });

  return res.json(lead);
});
```

### Getting Available Stages for Dropdown

```javascript
// Frontend component
async function getLeadStages() {
  const response = await fetch('/api/pipeline-stages?stageType=LEAD&isActive=true');
  const stages = await response.json();

  return stages.map(stage => ({
    value: stage.id,
    label: stage.name,
    color: stage.color
  }));
}
```

### AI Filtering by Stage

```javascript
// AI can now query available stages dynamically
const availableStages = await prisma.pipelineStage.findMany({
  where: {
    tenantId: req.user.tenantId,
    isActive: true,
    stageType: { in: ['LEAD', 'BOTH'] }
  },
  orderBy: { order: 'asc' }
});

// AI response: "You have leads in these stages: New Lead, Qualified, Proposal..."
```

### Automation with Dynamic Stages

```javascript
// Automation rule: Move lead to next stage after 3 days
async function autoProgressLead(leadId) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { pipelineStage: true }
  });

  // Find next stage
  const nextStage = await prisma.pipelineStage.findFirst({
    where: {
      tenantId: lead.tenantId,
      stageType: { in: ['LEAD', 'BOTH'] },
      order: { gt: lead.pipelineStage.order },
      isActive: true
    },
    orderBy: { order: 'asc' }
  });

  if (nextStage) {
    await prisma.lead.update({
      where: { id: leadId },
      data: { stageId: nextStage.id }
    });
  }
}
```

---

## UI/UX Recommendations

### Pipeline Stages Management UI

Create a drag-and-drop interface for managing stages:

```
┌─────────────────────────────────────────┐
│ Pipeline Stages                [+ New]  │
├─────────────────────────────────────────┤
│ 1. ● New Lead        [Edit] [Delete]    │
│    Type: LEAD  |  Default: Yes          │
│                                         │
│ 2. ● Qualified       [Edit] [Delete]    │
│    Type: BOTH  |  Default: No           │
│                                         │
│ 3. ● Proposal Sent   [Edit] [Delete]    │
│    Type: DEAL  |  Default: No           │
└─────────────────────────────────────────┘
```

### Lead/Deal Kanban Board

```
┌──────────┬──────────┬──────────┬──────────┐
│ New Lead │ Qualified│ Proposal │   Won    │
│    (5)   │    (3)   │    (2)   │   (1)    │
├──────────┼──────────┼──────────┼──────────┤
│ Lead A   │ Lead C   │ Deal X   │ Deal Z   │
│ Lead B   │ Lead D   │ Deal Y   │          │
│ ...      │ ...      │          │          │
└──────────┴──────────┴──────────┴──────────┘
```

---

## Best Practices

### 1. **Never Delete System Default Stage**
```javascript
// Prevent deletion of system default
if (stage.isSystemDefault) {
  throw new Error('Cannot delete system default stage');
}
```

### 2. **Check for Dependencies Before Deletion**
```javascript
// Check if leads/deals are using this stage
const leadsCount = await prisma.lead.count({ where: { stageId } });
const dealsCount = await prisma.deal.count({ where: { stageId } });

if (leadsCount > 0 || dealsCount > 0) {
  throw new Error(`Cannot delete stage: ${leadsCount} leads and ${dealsCount} deals are using it`);
}
```

### 3. **Maintain Order Integrity**
```javascript
// When reordering, ensure no gaps
async function reorderStages(stages) {
  for (let i = 0; i < stages.length; i++) {
    await prisma.pipelineStage.update({
      where: { id: stages[i].id },
      data: { order: i + 1 }
    });
  }
}
```

### 4. **Slug Uniqueness**
```javascript
// Generate unique slug
function generateSlug(name, existingSlugs) {
  let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  let counter = 1;

  while (existingSlugs.includes(slug)) {
    slug = `${slug}-${counter++}`;
  }

  return slug;
}
```

---

## Benefits

✅ **Business Flexibility**: Each tenant defines their own sales process
✅ **No Code Changes**: Add/remove/modify stages without deploying code
✅ **Consistency**: Same stages across leads, deals, AI, automation
✅ **Performance**: Indexed foreign keys for fast queries
✅ **Audit Trail**: Track stage changes with timestamps
✅ **Type Safety**: Prisma ensures data integrity

---

## Migration Checklist

- [x] Update Prisma schema
- [x] Create migration SQL
- [x] Migrate existing data
- [x] Update seed script
- [x] Create documentation
- [ ] Update frontend components to query stages dynamically
- [ ] Update lead/deal forms to use stage dropdowns
- [ ] Update AI to query available stages
- [ ] Update automation to use dynamic stages
- [ ] Add stage management UI
- [ ] Add validation rules
- [ ] Test with multiple tenants

---

## Support

For questions or issues with pipeline stages:
1. Check this documentation
2. Review migration logs
3. Verify in Prisma Studio
4. Check tenant-specific stage configuration

**Last Updated**: 2025-01-26
