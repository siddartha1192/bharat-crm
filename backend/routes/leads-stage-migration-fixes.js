/**
 * LEAD-DEAL STAGE SYNC FIXES
 *
 * This file contains all the necessary updates to ensure lead-to-deal sync
 * works properly with the new dynamic pipeline stages system.
 *
 * CHANGES NEEDED IN /routes/leads.js:
 */

// ============================================================================
// FIX 1: Update Lead Creation to Set Default StageId
// ============================================================================

// REPLACE this in POST '/' endpoint (around line 145):
/*
OLD CODE:
const lead = await prisma.lead.create({
  data: {
    ...leadData,
    assignedTo,
    createdBy,
    userId,
    tenantId: req.tenant.id
  }
});
*/

// NEW CODE:
const lead = await prisma.lead.create({
  data: {
    ...leadData,
    assignedTo,
    createdBy,
    userId,
    tenantId: req.tenant.id,
    // Auto-assign default stage if not provided
    stageId: leadData.stageId || (await getDefaultLeadStage(req.tenant.id)).id,
    // Keep status in sync for backward compatibility
    status: leadData.status || 'new'
  }
});

// ============================================================================
// FIX 2: Update Lead-to-Deal Sync to Use StageId
// ============================================================================

// REPLACE the sync logic in PUT '/:id' endpoint (around line 278-281):
/*
OLD CODE:
// Sync status/stage if changed
if (updateData.status) {
  dealUpdateData.stage = mapLeadStatusToDealStage(updateData.status);
}
*/

// NEW CODE:
// Sync stage if stageId changed
if (updateData.stageId) {
  // Get the pipeline stage
  const pipelineStage = await tx.pipelineStage.findUnique({
    where: { id: updateData.stageId }
  });

  if (pipelineStage) {
    dealUpdateData.stageId = pipelineStage.id;
    // Keep old stage field in sync for backward compatibility
    dealUpdateData.stage = pipelineStage.slug;
  }
}

// Also sync status field for backward compatibility
if (updateData.status) {
  // Find matching stage by slug
  const matchingStage = await tx.pipelineStage.findFirst({
    where: {
      tenantId: req.tenant.id,
      slug: updateData.status.toLowerCase().replace(/\s+/g, '-')
    }
  });

  if (matchingStage) {
    updateData.stageId = matchingStage.id;
    dealUpdateData.stageId = matchingStage.id;
    dealUpdateData.stage = matchingStage.slug;
  }
}

// ============================================================================
// FIX 3: Update Automation Trigger to Use StageId
// ============================================================================

// REPLACE the automation trigger (around line 312-327):
/*
OLD CODE:
if (updateData.status && updateData.status !== existingLead.status) {
  await automationService.triggerAutomation('lead.stage_changed', {
    fromStage: existingLead.status,
    toStage: updateData.status,
  }, req.user);
}
*/

// NEW CODE:
if (updateData.stageId && updateData.stageId !== existingLead.stageId) {
  // Fetch stage details for better context
  const [fromStage, toStage] = await Promise.all([
    prisma.pipelineStage.findUnique({ where: { id: existingLead.stageId } }),
    prisma.pipelineStage.findUnique({ where: { id: updateData.stageId } })
  ]);

  try {
    await automationService.triggerAutomation('lead.stage_changed', {
      id: result.id,
      name: result.name,
      email: result.email,
      company: result.company,
      fromStage: fromStage?.name || existingLead.status,
      toStage: toStage?.name || updateData.status,
      fromStageId: existingLead.stageId,
      toStageId: updateData.stageId,
      entityType: 'Lead'
    }, req.user);
  } catch (automationError) {
    console.error('Error triggering lead stage change automation:', automationError);
  }
}

// ============================================================================
// FIX 4: Update Lead Stats to Query by Stage
// ============================================================================

// REPLACE in GET '/stats/summary' endpoint (around line 397-405):
/*
OLD CODE:
const [total, newLeads, qualified, totalValue] = await Promise.all([
  prisma.lead.count({ where }),
  prisma.lead.count({ where: { ...where, status: 'new' } }),
  prisma.lead.count({ where: { ...where, status: 'qualified' } }),
  prisma.lead.aggregate({ where, _sum: { estimatedValue: true } })
]);
*/

// NEW CODE:
// Get stage IDs for filtering
const [newLeadStage, qualifiedStage] = await Promise.all([
  prisma.pipelineStage.findFirst({
    where: {
      tenantId: req.tenant.id,
      OR: [
        { isSystemDefault: true },
        { slug: 'new-lead' },
        { slug: 'new' }
      ]
    }
  }),
  prisma.pipelineStage.findFirst({
    where: {
      tenantId: req.tenant.id,
      slug: { in: ['qualified', 'qualification'] }
    }
  })
]);

const [total, newLeads, qualified, totalValue] = await Promise.all([
  prisma.lead.count({ where }),
  newLeadStage ? prisma.lead.count({ where: { ...where, stageId: newLeadStage.id } }) : 0,
  qualifiedStage ? prisma.lead.count({ where: { ...where, stageId: qualifiedStage.id } }) : 0,
  prisma.lead.aggregate({ where, _sum: { estimatedValue: true } })
]);

// ============================================================================
// FIX 5: Add Helper Function for Default Stage
// ============================================================================

// ADD this helper function at the top of the file (after imports):

/**
 * Get default lead stage for tenant
 */
async function getDefaultLeadStage(tenantId) {
  const defaultStage = await prisma.pipelineStage.findFirst({
    where: {
      tenantId,
      isSystemDefault: true,
      stageType: { in: ['LEAD', 'BOTH'] }
    }
  });

  if (!defaultStage) {
    throw new Error('No default lead stage found for tenant');
  }

  return defaultStage;
}

// ============================================================================
// FIX 6: Update Bulk Import to Use StageId
// ============================================================================

// REPLACE in POST '/bulk' endpoint (around line 718):
/*
OLD CODE:
await tx.lead.create({
  data: {
    ...lead,
    status: lead.status,
    tenantId: req.tenant.id,
    dealId: deal.id
  }
});
*/

// NEW CODE:
// Get default stage or map from status
let stageId;
if (lead.status) {
  const matchingStage = await tx.pipelineStage.findFirst({
    where: {
      tenantId: req.tenant.id,
      slug: lead.status.toLowerCase().replace(/\s+/g, '-')
    }
  });
  stageId = matchingStage?.id;
}

if (!stageId) {
  const defaultStage = await tx.pipelineStage.findFirst({
    where: {
      tenantId: req.tenant.id,
      isSystemDefault: true
    }
  });
  stageId = defaultStage.id;
}

await tx.lead.create({
  data: {
    ...lead,
    status: lead.status, // Keep for backward compatibility
    stageId, // NEW: Required field
    tenantId: req.tenant.id,
    dealId: deal.id
  }
});

// ============================================================================
// FIX 7: Update Deal Creation from Lead
// ============================================================================

// REPLACE in POST '/bulk' deal creation (around line 693-708):
/*
OLD CODE:
const deal = await tx.deal.create({
  data: {
    stage: mapLeadStatusToDealStage(lead.status),
    probability: lead.status === 'qualified' ? 60 : 20,
    ...
  }
});
*/

// NEW CODE:
// Map lead stage to deal stage
let dealStageId;
if (lead.stageId) {
  // Try to find matching deal stage or use the same stage if it's BOTH type
  const leadStage = await tx.pipelineStage.findUnique({
    where: { id: lead.stageId }
  });

  if (leadStage && leadStage.stageType === 'BOTH') {
    dealStageId = lead.stageId;
  } else {
    // Find a suitable deal stage (first active deal stage)
    const dealStage = await tx.pipelineStage.findFirst({
      where: {
        tenantId: req.tenant.id,
        stageType: { in: ['DEAL', 'BOTH'] },
        isActive: true
      },
      orderBy: { order: 'asc' }
    });
    dealStageId = dealStage?.id;
  }
}

const deal = await tx.deal.create({
  data: {
    stage: mapLeadStatusToDealStage(lead.status), // Keep for backward compatibility
    stageId: dealStageId, // NEW: Required field
    probability: lead.status === 'qualified' ? 60 : 20,
    // ... rest of deal data
  }
});

// ============================================================================
// SUMMARY OF CHANGES
// ============================================================================

/**
 * To maintain lead-to-deal sync with new pipeline stages:
 *
 * 1. ✅ Lead creation sets stageId (default or specified)
 * 2. ✅ Lead updates sync stageId to linked deals
 * 3. ✅ Stage changes trigger automation with stageId
 * 4. ✅ Lead stats query by stageId
 * 5. ✅ Bulk import uses stageId
 * 6. ✅ Deal creation from lead uses stageId
 *
 * BACKWARD COMPATIBILITY:
 * - Keep 'status' field in sync for old code
 * - Keep 'stage' field in deals for old code
 * - Gradually migrate to using only stageId
 */

module.exports = {
  getDefaultLeadStage
};
