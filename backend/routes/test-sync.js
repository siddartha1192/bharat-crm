const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const prisma = require('../lib/prisma');

// Apply authentication
router.use(authenticate);

// Test endpoint to verify Lead-Deal sync
router.get('/verify-sync/:dealId', async (req, res) => {
  try {
    const dealId = req.params.dealId;
    const userId = req.user.id;

    // Get the deal
    const deal = await prisma.deal.findFirst({
      where: { id: dealId, userId }
    });

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Find linked lead
    const lead = await prisma.lead.findFirst({
      where: { dealId: deal.id }
    });

    res.json({
      deal: {
        id: deal.id,
        title: deal.title,
        stage: deal.stage,
        company: deal.company
      },
      lead: lead ? {
        id: lead.id,
        name: lead.name,
        status: lead.status,
        company: lead.company,
        dealId: lead.dealId
      } : null,
      synced: lead ? (
        deal.stage === 'lead' && ['new', 'contacted'].includes(lead.status) ||
        deal.stage === 'qualified' && lead.status === 'qualified' ||
        deal.stage === 'proposal' && lead.status === 'proposal' ||
        deal.stage === 'negotiation' && lead.status === 'negotiation' ||
        deal.stage === 'closed-won' && lead.status === 'won' ||
        deal.stage === 'closed-lost' && lead.status === 'lost'
      ) : false
    });
  } catch (error) {
    console.error('Error verifying sync:', error);
    res.status(500).json({ error: 'Failed to verify sync' });
  }
});

module.exports = router;
