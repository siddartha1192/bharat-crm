const express = require('express');
const router = express.Router();
const { normalizePhoneNumber } = require('../utils/phoneNormalization');
const roundRobinService = require('../services/roundRobin');
const prisma = require('../lib/prisma');

// POST promotional lead (public - no auth required)
router.post('/lead', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      phoneCountryCode,
      company,
      message
    } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({
        error: 'Name and email are required',
        success: false
      });
    }

    // Normalize phone number if provided
    let phoneNormalized = null;
    if (phone) {
      const countryCode = phoneCountryCode || '+91';
      const phoneResult = normalizePhoneNumber(phone, countryCode);
      phoneNormalized = phoneResult.normalized;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Please provide a valid email address',
        success: false
      });
    }

    // Get request metadata
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const referrer = req.headers['referer'] || req.headers['referrer'];

    // Find the first admin user to assign the lead to (or use a default user)
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      orderBy: { createdAt: 'asc' }
    });

    if (!adminUser) {
      return res.status(500).json({
        error: 'System configuration error. Please contact support.',
        success: false
      });
    }

    // Check if lead with this email already exists for this user
    const existingLead = await prisma.lead.findFirst({
      where: {
        userId: adminUser.id,
        email
      }
    });

    if (existingLead) {
      // Update existing lead with new information
      const updateData = {
        phone: phone || existingLead.phone,
        phoneCountryCode: phoneCountryCode || existingLead.phoneCountryCode || '+91',
        phoneNormalized: phoneNormalized || existingLead.phoneNormalized,
        company: company || existingLead.company,
        notes: existingLead.notes +
          `\n\n[${new Date().toISOString()}] Promotional page re-submission:\n` +
          `Message: ${message || 'N/A'}\n` +
          `IP: ${ipAddress}\n` +
          `Referrer: ${referrer || 'Direct'}`,
        priority: 'high', // Bump priority for re-submission
        updatedAt: new Date()
      };

      const updatedLead = await prisma.lead.update({
        where: { id: existingLead.id },
        data: updateData
      });

      return res.json({
        success: true,
        message: "Thank you for your interest! We'll be in touch shortly.",
        leadId: updatedLead.id,
        isUpdate: true
      });
    }

    // Get default lead stage
    let defaultStage = await prisma.pipelineStage.findFirst({
      where: {
        tenantId: adminUser.tenantId,
        isSystemDefault: true,
        stageType: { in: ['LEAD', 'BOTH'] }
      }
    });

    // Fallback: find any active lead stage
    if (!defaultStage) {
      defaultStage = await prisma.pipelineStage.findFirst({
        where: {
          tenantId: adminUser.tenantId,
          isActive: true,
          stageType: { in: ['LEAD', 'BOTH'] }
        },
        orderBy: { order: 'asc' }
      });
    }

    // Last resort: find the 'lead' slug stage
    if (!defaultStage) {
      defaultStage = await prisma.pipelineStage.findFirst({
        where: {
          tenantId: adminUser.tenantId,
          slug: 'lead',
          isActive: true
        }
      });
    }

    if (!defaultStage) {
      console.error('No lead stage found for tenant:', adminUser.tenantId);
      return res.status(500).json({
        error: 'System configuration error. Please contact support.',
        success: false
      });
    }

    // Determine assignment using round-robin if enabled, otherwise assign to admin
    let assignedToName = adminUser.name;
    let assignedToUserId = adminUser.id;
    let assignmentReason = 'promo_admin';

    // Check for round-robin assignment
    try {
      const nextAgent = await roundRobinService.getNextAgent(adminUser.tenantId, adminUser.id, adminUser.name);
      assignedToName = nextAgent.userName;
      assignedToUserId = nextAgent.userId;
      assignmentReason = nextAgent.reason;
    } catch (error) {
      console.error('Error getting next agent from round-robin:', error);
      // Fall back to admin (already set above)
    }

    // Create new lead
    const leadNotes = `Lead from promotional website\n\n` +
      `Name: ${name}\n` +
      `Email: ${email}\n` +
      `Phone: ${phone || 'Not provided'}\n` +
      `Company: ${company || 'Not provided'}\n` +
      `Message: ${message || 'No message provided'}\n\n` +
      `Source: Promotional Landing Page\n` +
      `IP Address: ${ipAddress}\n` +
      `User Agent: ${userAgent}\n` +
      `Referrer: ${referrer || 'Direct'}`;

    const lead = await prisma.lead.create({
      data: {
        name,
        email,
        phone: phone || '',
        phoneCountryCode: phoneCountryCode || '+91',
        phoneNormalized,
        company: company || '',
        source: 'promotional-website',
        status: 'new',
        priority: 'high', // Promo page leads are high priority
        estimatedValue: 0,
        assignedTo: assignedToName,
        createdBy: adminUser.id,
        notes: leadNotes,
        tags: ['promo-website', 'inbound', 'demo-request'],
        userId: adminUser.id,
        stageId: defaultStage.id,
        tenantId: adminUser.tenantId
      }
    });

    console.log(`✅ New promotional lead created: ${lead.id} (${email})`);

    // Log round-robin assignment if applicable
    if (assignmentReason && assignmentReason !== 'promo_admin') {
      try {
        const state = await roundRobinService.getState(adminUser.tenantId);
        await roundRobinService.logAssignment(
          adminUser.tenantId,
          lead.id,
          assignedToUserId,
          assignedToName,
          assignmentReason,
          state?.rotationCycle || 0
        );
        console.log(`✅ Round-robin assignment logged: ${assignedToName} (${assignmentReason})`);
      } catch (logError) {
        console.error('⚠️ Error logging round-robin assignment:', logError);
        // Don't fail the request if logging fails
      }
    }

    res.status(201).json({
      success: true,
      message: "Thank you for your interest! We'll be in touch shortly.",
      leadId: lead.id
    });

  } catch (error) {
    console.error('Error creating promotional lead:', error);
    res.status(500).json({
      error: 'Failed to submit your request. Please try again.',
      success: false,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
