const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { tenantContext, getTenantFilter, autoInjectTenantId } = require('../middleware/tenant');
const automationService = require('../services/automation');

// Apply authentication and tenant context to all routes
router.use(authenticate);
router.use(tenantContext);

/**
 * Get all automation rules
 * GET /api/automation/rules
 */
router.get('/rules', async (req, res) => {
  try {
    const rules = await automationService.getAutomationRules(req.user.id);
    res.json(rules);
  } catch (error) {
    console.error('Error fetching automation rules:', error);
    res.status(500).json({ error: 'Failed to fetch automation rules' });
  }
});

/**
 * Create automation rule
 * POST /api/automation/rules
 */
router.post('/rules', async (req, res) => {
  try {
    const ruleData = req.body;
    const rule = await automationService.saveAutomationRule(req.user.id, ruleData, req.tenant.id);
    res.json(rule);
  } catch (error) {
    console.error('Error creating automation rule:', error);
    res.status(500).json({ error: 'Failed to create automation rule' });
  }
});

/**
 * Update automation rule
 * PUT /api/automation/rules/:id
 */
router.put('/rules/:id', async (req, res) => {
  try {
    const ruleData = { ...req.body, id: req.params.id };
    const rule = await automationService.saveAutomationRule(req.user.id, ruleData, req.tenant.id);
    res.json(rule);
  } catch (error) {
    console.error('Error updating automation rule:', error);
    res.status(500).json({ error: 'Failed to update automation rule' });
  }
});

/**
 * Delete automation rule
 * DELETE /api/automation/rules/:id
 */
router.delete('/rules/:id', async (req, res) => {
  try {
    await automationService.deleteAutomationRule(req.params.id, req.user.id);
    res.json({ message: 'Automation rule deleted successfully' });
  } catch (error) {
    console.error('Error deleting automation rule:', error);
    res.status(500).json({ error: 'Failed to delete automation rule' });
  }
});

/**
 * Toggle automation rule enabled/disabled
 * PATCH /api/automation/rules/:id/toggle
 */
router.patch('/rules/:id/toggle', async (req, res) => {
  try {
    const { isEnabled } = req.body;
    const rule = await automationService.toggleAutomationRule(
      req.params.id,
      req.user.id,
      isEnabled
    );
    res.json(rule);
  } catch (error) {
    console.error('Error toggling automation rule:', error);
    res.status(500).json({ error: 'Failed to toggle automation rule' });
  }
});

/**
 * Get default email templates
 * GET /api/automation/templates
 */
router.get('/templates', async (req, res) => {
  try {
    res.json(automationService.DEFAULT_TEMPLATES);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

/**
 * Test automation rule (send test email)
 * POST /api/automation/rules/:id/test
 */
router.post('/rules/:id/test', async (req, res) => {
  try {
    const { testData } = req.body;

    // Trigger automation with test data
    await automationService.triggerAutomation(
      testData.event || 'lead.created',
      {
        ...testData,
        email: req.user.email, // Send test email to current user
        name: testData.name || 'Test User',
        company: testData.company || 'Test Company'
      },
      req.user
    );

    res.json({ message: 'Test email sent successfully' });
  } catch (error) {
    console.error('Error testing automation rule:', error);
    res.status(500).json({ error: 'Failed to test automation rule' });
  }
});

module.exports = router;
