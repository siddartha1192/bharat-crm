const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const emailService = require('../services/email');
const authService = require('../services/auth');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Send email to lead
 * POST /api/emails/lead/:leadId
 */
router.post('/lead/:leadId', authenticate, async (req, res) => {
  try {
    const { leadId } = req.params;
    const { subject, text, html, cc, bcc, attachments } = req.body;

    // Get lead details
    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        userId: req.user.id,
      },
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (!lead.email) {
      return res.status(400).json({ error: 'Lead has no email address' });
    }

    // Send email
    const result = await emailService.sendLeadEmail({
      leadId,
      to: lead.email,
      subject,
      text,
      html,
      userId: req.user.id,
      cc,
      bcc,
      attachments,
    });

    // Log activity
    await authService.logActivity(
      req.user.id,
      'EMAIL_SENT',
      'Lead',
      leadId,
      `Email sent to lead: ${lead.name}`,
      { subject, to: lead.email }
    );

    res.json(result);
  } catch (error) {
    console.error('Send lead email error:', error);
    res.status(500).json({ error: error.message || 'Failed to send email' });
  }
});

/**
 * Send email to contact
 * POST /api/emails/contact/:contactId
 */
router.post('/contact/:contactId', authenticate, async (req, res) => {
  try {
    const { contactId } = req.params;
    const { subject, text, html, cc, bcc, attachments } = req.body;

    // Get contact details
    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        userId: req.user.id,
      },
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    if (!contact.email) {
      return res.status(400).json({ error: 'Contact has no email address' });
    }

    // Send email
    const result = await emailService.sendContactEmail({
      contactId,
      to: contact.email,
      subject,
      text,
      html,
      userId: req.user.id,
      cc,
      bcc,
      attachments,
    });

    // Log activity
    await authService.logActivity(
      req.user.id,
      'EMAIL_SENT',
      'Contact',
      contactId,
      `Email sent to contact: ${contact.name}`,
      { subject, to: contact.email }
    );

    res.json(result);
  } catch (error) {
    console.error('Send contact email error:', error);
    res.status(500).json({ error: error.message || 'Failed to send email' });
  }
});

/**
 * Send email to deal
 * POST /api/emails/deal/:dealId
 */
router.post('/deal/:dealId', authenticate, async (req, res) => {
  try {
    const { dealId } = req.params;
    const { to, subject, text, html, cc, bcc, attachments } = req.body;

    // Get deal details
    const deal = await prisma.deal.findFirst({
      where: {
        id: dealId,
        userId: req.user.id,
      },
    });

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    if (!to) {
      return res.status(400).json({ error: 'Recipient email is required' });
    }

    // Send email
    const result = await emailService.sendDealEmail({
      dealId,
      to,
      subject,
      text,
      html,
      userId: req.user.id,
      cc,
      bcc,
      attachments,
    });

    // Log activity
    await authService.logActivity(
      req.user.id,
      'EMAIL_SENT',
      'Deal',
      dealId,
      `Email sent for deal: ${deal.title}`,
      { subject, to }
    );

    res.json(result);
  } catch (error) {
    console.error('Send deal email error:', error);
    res.status(500).json({ error: error.message || 'Failed to send email' });
  }
});

/**
 * Send manual/custom email
 * POST /api/emails/send
 */
router.post('/send', authenticate, async (req, res) => {
  try {
    const { to, subject, text, html, cc, bcc, attachments } = req.body;

    if (!to || !subject || !text) {
      return res.status(400).json({ error: 'To, subject, and text are required' });
    }

    // Send email
    const result = await emailService.sendManualEmail({
      to,
      subject,
      text,
      html,
      userId: req.user.id,
      cc,
      bcc,
      attachments,
    });

    // Log activity
    await authService.logActivity(
      req.user.id,
      'EMAIL_SENT',
      'Manual',
      null,
      `Manual email sent: ${subject}`,
      { to, subject }
    );

    res.json(result);
  } catch (error) {
    console.error('Send manual email error:', error);
    res.status(500).json({ error: error.message || 'Failed to send email' });
  }
});

/**
 * Get email logs
 * GET /api/emails
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, entityType, limit = 50, offset = 0 } = req.query;

    const result = await emailService.getEmailLogs({
      userId: req.user.id,
      status,
      entityType,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json(result);
  } catch (error) {
    console.error('Get email logs error:', error);
    res.status(500).json({ error: 'Failed to get email logs' });
  }
});

/**
 * Get email log by ID
 * GET /api/emails/:id
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const emailLog = await emailService.getEmailLog(id, req.user.id);

    if (!emailLog) {
      return res.status(404).json({ error: 'Email log not found' });
    }

    res.json(emailLog);
  } catch (error) {
    console.error('Get email log error:', error);
    res.status(500).json({ error: 'Failed to get email log' });
  }
});

/**
 * Get email stats
 * GET /api/emails/stats/summary
 */
router.get('/stats/summary', authenticate, async (req, res) => {
  try {
    const stats = await emailService.getEmailStats(req.user.id);
    res.json(stats);
  } catch (error) {
    console.error('Get email stats error:', error);
    res.status(500).json({ error: 'Failed to get email stats' });
  }
});

module.exports = router;
