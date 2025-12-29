/**
 * Lead Reminder Service
 * Sends WhatsApp and email reminders to defined users when leads are not contacted within 24 hours
 */

const { PrismaClient } = require('@prisma/client');
const whatsappService = require('./whatsapp');
const emailService = require('./email');

const prisma = new PrismaClient();

// Default reminder configuration
const DEFAULT_CONFIG = {
  enabled: false,
  checkIntervalHours: 24, // Check for leads older than 24 hours
  recipientUserIds: [], // List of user IDs to receive reminders
  recipientEmails: [], // Manual list of email addresses to receive reminders
  recipientPhones: [], // Manual list of WhatsApp phone numbers to receive reminders
  sendWhatsApp: true,
  sendEmail: true,
  includedStages: [], // Stage slugs to monitor (from PipelineStage table) - user-selectable in frontend
};

class LeadReminderService {
  /**
   * Get reminder configuration for a tenant
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Reminder configuration
   */
  async getConfig(tenantId) {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true }
      });

      const settings = tenant?.settings || {};
      const reminderConfig = settings.leadReminders || DEFAULT_CONFIG;

      // Merge with defaults to ensure all fields exist
      return { ...DEFAULT_CONFIG, ...reminderConfig };
    } catch (error) {
      console.error('Error getting reminder config:', error);
      return DEFAULT_CONFIG;
    }
  }

  /**
   * Update reminder configuration for a tenant
   * @param {string} tenantId - Tenant ID
   * @param {Object} config - New configuration
   * @returns {Object} Updated configuration
   */
  async updateConfig(tenantId, config) {
    try {
      // Validate config
      if (typeof config.enabled !== 'undefined' && typeof config.enabled !== 'boolean') {
        throw new Error('enabled must be a boolean');
      }

      if (config.checkIntervalHours && (config.checkIntervalHours < 1 || config.checkIntervalHours > 168)) {
        throw new Error('checkIntervalHours must be between 1 and 168 (1 week)');
      }

      // Get current settings
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true }
      });

      const currentSettings = tenant?.settings || {};
      const currentReminderConfig = currentSettings.leadReminders || DEFAULT_CONFIG;

      // Merge configurations
      const updatedReminderConfig = { ...currentReminderConfig, ...config };

      // Update tenant settings
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          settings: {
            ...currentSettings,
            leadReminders: updatedReminderConfig
          }
        }
      });

      console.log(`✅ Updated lead reminder config for tenant ${tenantId}:`, updatedReminderConfig);
      return updatedReminderConfig;
    } catch (error) {
      console.error('Error updating reminder config:', error);
      throw error;
    }
  }

  /**
   * Check for leads that need reminders and send them
   * @param {string} tenantId - Optional tenant ID to check (if not provided, checks all tenants)
   * @returns {Object} Results of reminder checks
   */
  async checkAndSendReminders(tenantId = null) {
    try {
      console.log('\n🔔 Lead Reminder Service: Checking for uncontacted leads...');

      // Get tenants to check
      const tenants = tenantId
        ? [await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, name: true, settings: true } })]
        : await prisma.tenant.findMany({ select: { id: true, name: true, settings: true } });

      const results = {
        tenantsChecked: 0,
        leadsFound: 0,
        remindersSent: 0,
        errors: []
      };

      for (const tenant of tenants) {
        if (!tenant) continue;

        const config = await this.getConfig(tenant.id);

        // Skip if reminders are disabled
        if (!config.enabled) {
          console.log(`   Tenant ${tenant.name}: Reminders disabled (skipping)`);
          continue;
        }

        // Skip if no recipients configured
        if (!config.recipientUserIds || config.recipientUserIds.length === 0) {
          console.log(`   Tenant ${tenant.name}: No recipients configured (skipping)`);
          continue;
        }

        results.tenantsChecked++;

        try {
          const remindersForTenant = await this.checkTenantLeads(tenant, config);
          results.leadsFound += remindersForTenant.leadsFound;
          results.remindersSent += remindersForTenant.remindersSent;
        } catch (error) {
          console.error(`   Error checking tenant ${tenant.name}:`, error.message);
          results.errors.push({
            tenantId: tenant.id,
            tenantName: tenant.name,
            error: error.message
          });
        }
      }

      console.log(`\n📊 Lead Reminder Summary:`);
      console.log(`   Tenants checked: ${results.tenantsChecked}`);
      console.log(`   Uncontacted leads found: ${results.leadsFound}`);
      console.log(`   Reminders sent: ${results.remindersSent}`);
      console.log(`   Errors: ${results.errors.length}`);

      return results;
    } catch (error) {
      console.error('❌ Error in checkAndSendReminders:', error);
      throw error;
    }
  }

  /**
   * Check leads for a specific tenant and send reminders
   * @param {Object} tenant - Tenant object
   * @param {Object} config - Reminder configuration
   * @returns {Object} Results
   */
  async checkTenantLeads(tenant, config) {
    console.log(`\n   Checking tenant: ${tenant.name}`);

    // Calculate cutoff time (leads created before this time need reminders)
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - config.checkIntervalHours);

    // Find leads that meet reminder criteria
    // Filter by stage slug (from centralized PipelineStage table)
    const uncontactedLeads = await prisma.lead.findMany({
      where: {
        tenantId: tenant.id,
        createdAt: {
          lte: cutoffTime  // Created before cutoff time
        },
        status: {
          slug: {
            in: config.includedStages  // Only include leads in selected stages (by slug)
          }
        }
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        pipelineStage: {
          select: { name: true, slug: true, color: true }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    console.log(`   Found ${uncontactedLeads.length} uncontacted leads older than ${config.checkIntervalHours} hours`);

    if (uncontactedLeads.length === 0) {
      return { leadsFound: 0, remindersSent: 0 };
    }

    // Get recipient users from database
    const userRecipients = config.recipientUserIds && config.recipientUserIds.length > 0
      ? await prisma.user.findMany({
          where: {
            id: { in: config.recipientUserIds },
            tenantId: tenant.id,
            isActive: true
          },
          select: {
            id: true,
            name: true,
            email: true
          }
        })
      : [];

    // Build complete recipient list (users + manual entries)
    const allRecipients = [
      ...userRecipients.map(u => ({
        type: 'user',
        userId: u.id, // Include user ID for email sending
        name: u.name,
        email: u.email,
        phone: null
      })),
      ...(config.recipientEmails || []).map(email => ({
        type: 'manual_email',
        userId: null, // Will be resolved later
        name: email.split('@')[0], // Use email prefix as name
        email: email,
        phone: null
      })),
      ...(config.recipientPhones || []).map(phone => ({
        type: 'manual_phone',
        userId: null, // Will be resolved later
        name: 'Admin', // Default name for phone recipients
        email: null,
        phone: phone
      }))
    ];

    if (allRecipients.length === 0) {
      console.log(`   No recipients configured for tenant ${tenant.name}`);
      return { leadsFound: uncontactedLeads.length, remindersSent: 0 };
    }

    console.log(`   Sending reminders to ${allRecipients.length} recipient(s) (${userRecipients.length} users, ${config.recipientEmails?.length || 0} emails, ${config.recipientPhones?.length || 0} phones)`);

    let remindersSent = 0;

    // Send reminders to each recipient
    for (const recipient of allRecipients) {
      try {
        const sent = await this.sendReminder(tenant, recipient, uncontactedLeads, config);
        if (sent) remindersSent++;
      } catch (error) {
        const identifier = recipient.email || recipient.phone || 'unknown';
        console.error(`   Error sending reminder to ${identifier}:`, error.message);
      }
    }

    return {
      leadsFound: uncontactedLeads.length,
      remindersSent
    };
  }

  /**
   * Send reminder to a single recipient
   * @param {Object} tenant - Tenant object
   * @param {Object} recipient - Recipient user
   * @param {Array} leads - Array of uncontacted leads
   * @param {Object} config - Reminder configuration
   * @returns {boolean} True if reminder was sent successfully
   */
  async sendReminder(tenant, recipient, leads, config) {
    const leadsCount = leads.length;
    const leadsList = leads.slice(0, 5).map(lead =>
      `• ${lead.name} (${lead.email || 'No email'}) - Created: ${lead.createdAt.toLocaleDateString()}`
    ).join('\n');

    const moreLeads = leadsCount > 5 ? `\n\n...and ${leadsCount - 5} more leads` : '';

    // Prepare message
    const message = `🔔 Lead Follow-up Reminder

Hello ${recipient.name},

You have ${leadsCount} lead${leadsCount > 1 ? 's' : ''} that ${leadsCount > 1 ? 'have' : 'has'} not been contacted in the last ${config.checkIntervalHours} hours:

${leadsList}${moreLeads}

Please follow up with these leads as soon as possible.

- ${tenant.name} CRM`;

    const htmlMessage = `<div style="font-family: Arial, sans-serif; max-width: 600px;">
  <h2 style="color: #2563eb;">🔔 Lead Follow-up Reminder</h2>
  <p>Hello <strong>${recipient.name}</strong>,</p>
  <p>You have <strong>${leadsCount}</strong> lead${leadsCount > 1 ? 's' : ''} that ${leadsCount > 1 ? 'have' : 'has'} not been contacted in the last <strong>${config.checkIntervalHours} hours</strong>:</p>
  <ul style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
    ${leads.slice(0, 5).map(lead => `
      <li style="margin-bottom: 8px;">
        <strong>${lead.name}</strong> (${lead.email || 'No email'})<br/>
        <span style="color: #6b7280; font-size: 12px;">Created: ${lead.createdAt.toLocaleDateString()}</span>
      </li>
    `).join('')}
  </ul>
  ${leadsCount > 5 ? `<p style="color: #6b7280;">...and ${leadsCount - 5} more leads</p>` : ''}
  <p style="margin-top: 20px;">Please follow up with these leads as soon as possible.</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
  <p style="color: #6b7280; font-size: 12px;">${tenant.name} CRM</p>
</div>`;

    let emailSent = false;
    let whatsappSent = false;

    // Send email reminder
    if (config.sendEmail && recipient.email) {
      try {
        // Get a system user ID for sending the email
        // If recipient is a user, use their ID; otherwise find first active admin
        let senderId = recipient.userId;
        if (!senderId) {
          const systemUser = await prisma.user.findFirst({
            where: {
              tenantId: tenant.id,
              isActive: true,
              role: 'ADMIN'
            },
            select: { id: true }
          });
          senderId = systemUser?.id;
        }

        if (!senderId) {
          // Fallback: find any active user in the tenant
          const anyUser = await prisma.user.findFirst({
            where: {
              tenantId: tenant.id,
              isActive: true
            },
            select: { id: true }
          });
          senderId = anyUser?.id;
        }

        if (!senderId) {
          throw new Error('No active user found in tenant to send email');
        }

        await emailService.sendEmail({
          to: recipient.email,
          subject: `🔔 ${leadsCount} Uncontacted Lead${leadsCount > 1 ? 's' : ''} - Follow-up Required`,
          text: message,
          html: htmlMessage,
          userId: senderId,
          entityType: 'LeadReminder'
        });
        console.log(`   ✅ Email reminder sent to ${recipient.email}`);
        emailSent = true;
      } catch (error) {
        console.error(`   ❌ Failed to send email to ${recipient.email}:`, error.message);
      }
    }

    // Send WhatsApp reminder (if configured and recipient has phone number)
    if (config.sendWhatsApp && recipient.phone) {
      try {
        // Get tenant's WhatsApp configuration
        const tenantSettings = tenant.settings || {};
        const whatsappConfig = tenantSettings.whatsapp || null;

        if (whatsappService.isConfigured(whatsappConfig)) {
          await whatsappService.sendMessage(recipient.phone, message, whatsappConfig);
          console.log(`   ✅ WhatsApp reminder sent to ${recipient.phone}`);
          whatsappSent = true;
        } else {
          console.log(`   ⚠️ WhatsApp not configured for tenant ${tenant.name}`);
        }
      } catch (error) {
        console.error(`   ❌ Failed to send WhatsApp to ${recipient.phone}:`, error.message);
      }
    }

    return emailSent || whatsappSent;
  }
}

// Export singleton instance
module.exports = new LeadReminderService();
