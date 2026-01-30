const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const gmailIntegrationService = require('./gmailIntegration');
const { decrypt } = require('../utils/encryption');
const EmailTemplateService = require('./emailTemplate');

const prisma = require('../lib/prisma');


class EmailService {

  /**
   * Get Gmail API client using Gmail integration service
   * This is the CORRECT way that matches how test emails work
   *
   * @param {Object} user - User object with Gmail tokens
   * @param {Object} tenant - Tenant object with mail settings
   * @returns {Promise<gmail_v1.Gmail>} - Authenticated Gmail API client
   */
  async getGmailClient(user, tenant) {
    if (!user || !tenant || !gmailIntegrationService.isGmailConnected(user)) {
      throw new Error(
        'Gmail not connected. Please connect your Gmail account in Settings > Integrations to send emails.'
      );
    }

    console.log(`📧 [Email Service] Getting Gmail client for user ${user.email}`);

    // Use the exact same method as test emails - this works!
    const gmail = await gmailIntegrationService.getAuthenticatedClient(user, tenant);

    console.log(`✅ [Email Service] Successfully got Gmail API client`);
    return gmail;
  }

  /**
   * Create RFC 2822 formatted email message
   *
   * @param {Object} options - Email options
   * @returns {string} - RFC 2822 formatted email
   */
  createEmailMessage({ from, to, cc, bcc, subject, text, html, attachments }) {
    const boundary = '===============' + Date.now() + '==';
    const lines = [];

    // Headers
    lines.push(`From: ${from}`);
    lines.push(`To: ${Array.isArray(to) ? to.join(', ') : to}`);
    if (cc && cc.length > 0) {
      lines.push(`Cc: ${Array.isArray(cc) ? cc.join(', ') : cc}`);
    }
    if (bcc && bcc.length > 0) {
      lines.push(`Bcc: ${Array.isArray(bcc) ? bcc.join(', ') : bcc}`);
    }
    lines.push(`Subject: ${subject}`);
    lines.push(`MIME-Version: 1.0`);

    if (attachments && attachments.length > 0) {
      // Multipart message with attachments
      lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
      lines.push('');
      lines.push(`--${boundary}`);
    }

    if (html) {
      // HTML email
      lines.push(`Content-Type: text/html; charset=UTF-8`);
      lines.push('Content-Transfer-Encoding: 7bit');
      lines.push('');
      lines.push(html);
    } else {
      // Plain text email
      lines.push(`Content-Type: text/plain; charset=UTF-8`);
      lines.push('Content-Transfer-Encoding: 7bit');
      lines.push('');
      lines.push(text);
    }

    // Add attachments
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        lines.push('');
        lines.push(`--${boundary}`);
        lines.push(`Content-Type: ${attachment.contentType || 'application/octet-stream'}; name="${attachment.filename}"`);
        lines.push(`Content-Disposition: attachment; filename="${attachment.filename}"`);
        lines.push('Content-Transfer-Encoding: base64');
        lines.push('');

        // Convert buffer to base64
        const base64Content = attachment.content.toString('base64');
        // Split into 76 character lines (RFC 2045)
        const base64Lines = base64Content.match(/.{1,76}/g) || [];
        lines.push(...base64Lines);
      }
      lines.push('');
      lines.push(`--${boundary}--`);
    }

    return lines.join('\r\n');
  }

  /**
   * Send email using Gmail API (same method as test emails)
   * This replaces the old nodemailer approach which was failing
   */
  async sendEmailViaGmailAPI({ gmail, from, to, cc, bcc, subject, text, html, attachments }) {
    try {
      console.log(`📧 [Gmail API] Sending email from ${from} to ${to}`);

      // Create RFC 2822 formatted message
      const emailContent = this.createEmailMessage({
        from,
        to,
        cc,
        bcc,
        subject,
        text,
        html,
        attachments,
      });

      // Base64 encode (URL-safe)
      const encodedEmail = Buffer.from(emailContent)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Send via Gmail API
      const result = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedEmail,
        },
      });

      console.log(`✅ [Gmail API] Email sent successfully, message ID: ${result.data.id}`);

      return {
        messageId: result.data.id,
        threadId: result.data.threadId,
      };
    } catch (error) {
      console.error(`❌ [Gmail API] Error sending email:`, error.message);
      throw error;
    }
  }

  /**
   * Send email and log to database
   */

  async sendEmail({
    to,
    cc = [],
    bcc = [],
    subject,
    text,
    html,
    userId,
    entityType = null,
    entityId = null,
    attachments = [],
  }) {
    console.log('📨 sendEmail called with params:', { to, userId, entityType, subject: subject?.substring(0, 50) });

    if (!userId) {
      console.error('❌ userId is missing in sendEmail');
      throw new Error('userId is required to send email');
    }

    // Fetch user with Gmail integration tokens and tenant with mail settings
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        googleEmail: true,
        gmailAccessToken: true,
        gmailRefreshToken: true,
        gmailTokenExpiry: true,
        gmailConnectedAt: true,
        gmailScopes: true,
        tenantId: true,
        tenant: {
          select: {
            id: true,
            name: true,
            settings: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if user has Gmail connected
    const hasUserGmail = gmailIntegrationService.isGmailConnected(user);
    const hasTenantConfig = user.tenant?.settings?.mail?.oauth?.clientId;

    console.log('📊 Email configuration status:', {
      hasUserGmail,
      hasTenantConfig,
      userId: user.id,
      tenantId: user.tenant?.id
    });

    // Validate configuration before attempting to send
    if (!hasUserGmail) {
      console.error('❌ Gmail not connected for user');
      throw new Error(
        'Gmail not connected. Please go to Settings > Integrations and connect your Gmail account before sending emails.'
      );
    }

    if (!hasTenantConfig) {
      console.error('⚠️ Tenant mail OAuth not configured');
      throw new Error(
        'Email system not configured. Please ask your administrator to configure mail settings in Settings > API Config > Mail Integration.'
      );
    }

    const toArray = Array.isArray(to) ? to : [to];
    const ccArray = Array.isArray(cc) ? cc : (cc ? [cc] : []);
    const bccArray = Array.isArray(bcc) ? bcc : (bcc ? [bcc] : []);

    // Determine sender email (use Google email if available)
    const senderEmail = user.googleEmail || user.email;

    // Create email log entry
    // If no text body provided, use html as fallback for the body field
    const emailLog = await prisma.emailLog.create({
      data: {
        to: toArray,
        cc: ccArray,
        bcc: bccArray,
        from: senderEmail,
        subject,
        body: text || html || '',
        htmlBody: html || null,
        status: 'pending',
        userId,
        entityType,
        entityId,
        attachments: attachments.length > 0 ? attachments : null,
        tenantId: user.tenantId,
      },
    });

    try {
      console.log(`📧 [Email Service] Starting email send process...`);

      // Get Gmail API client (same method as test emails - this works!)
      const gmail = await this.getGmailClient(user, user.tenant);

      // Send using Gmail API instead of nodemailer
      const result = await this.sendEmailViaGmailAPI({
        gmail,
        from: `${user.googleEmail || user.email}`,
        to: toArray,
        cc: ccArray.length > 0 ? ccArray : undefined,
        bcc: bccArray.length > 0 ? bccArray : undefined,
        subject,
        text,
        html,
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      // Update email log with success
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: 'sent',
          messageId: result.messageId,
          gmailMessageId: result.messageId,
          gmailThreadId: result.threadId,
          sentAt: new Date(),
        },
      });

      console.log(`✅ [Email Service] Email sent successfully, message ID: ${result.messageId}`);

      return {
        success: true,
        emailLogId: emailLog.id,
        messageId: result.messageId,
        threadId: result.threadId,
      };

    } catch (error) {
      console.error(`❌ [Email Service] Error sending email:`, error.message);

      // Update email log with failure
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: 'failed',
          errorMessage: error.message,
        },
      });

      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

 

  /**
   * Send password reset email
   * Now uses centralized template system
   */
  async sendPasswordResetEmail(email, resetToken, userId) {
    console.log('📧 Sending password reset email:', { email, userId, hasToken: !!resetToken });

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/reset-password?token=${resetToken}`;

    try {
      // Get user to find tenant
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, tenantId: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Try to get template from database
      const rendered = await EmailTemplateService.renderTemplateByType(
        'password_reset',
        user.tenantId,
        {
          userName: user.name,
          resetLink: resetUrl,
          expiryTime: '1 hour',
        }
      );

      // Track template usage
      if (rendered.templateId) {
        await EmailTemplateService.trackUsage(rendered.templateId, false);
      }

      return await this.sendEmail({
        to: email,
        subject: rendered.subject,
        html: rendered.htmlBody,
        userId,
        entityType: 'PasswordReset',
      });
    } catch (error) {
      console.error('Error using email template, falling back to default:', error.message);

      // Fallback to inline template if template system fails
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Reset Your Password</h1>
              </div>
              <div class="content">
                <p>Hi there,</p>
                <p>You recently requested to reset your password for your Bharat CRM account. Click the button below to reset it:</p>
                <center>
                  <a href="${resetUrl}" class="button">Reset Password</a>
                </center>
                <p>Or copy and paste this URL into your browser:</p>
                <p style="word-break: break-all; color: #2563eb;">${resetUrl}</p>
                <p><strong>This link will expire in 1 hour.</strong></p>
                <p>If you didn't request a password reset, you can safely ignore this email.</p>
                <div class="footer">
                  <p>Bharat CRM - Built for Indian Businesses</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

      return await this.sendEmail({
        to: email,
        subject: 'Reset Your Bharat CRM Password',
        html,
        userId,
        entityType: 'PasswordReset',
      });
    }
  }

 

  /**

   * Send email to lead

   */

  async sendLeadEmail({ leadId, to, subject, text, html, userId, cc, bcc, attachments }) {

    return await this.sendEmail({

      to,

      cc,

      bcc,

      subject,

      text,

      html,

      userId,

      entityType: 'Lead',

      entityId: leadId,

      attachments,

    });

  }

 

  /**

   * Send email to contact

   */

  async sendContactEmail({ contactId, to, subject, text, html, userId, cc, bcc, attachments }) {

    return await this.sendEmail({

      to,

      cc,

      bcc,

      subject,

      text,

      html,

      userId,

      entityType: 'Contact',

      entityId: contactId,

      attachments,

    });

  }

 

  /**

   * Send email to deal

   */

  async sendDealEmail({ dealId, to, subject, text, html, userId, cc, bcc, attachments }) {

    return await this.sendEmail({

      to,

      cc,

      bcc,

      subject,

      text,

      html,

      userId,

      entityType: 'Deal',

      entityId: dealId,

      attachments,

    });

  }

 

  /**

   * Send manual/custom email

   */

  async sendManualEmail({ to, subject, text, html, userId, cc, bcc, attachments }) {

    return await this.sendEmail({

      to,

      cc,

      bcc,

      subject,

      text,

      html,

      userId,

      entityType: 'Manual',

      attachments,

    });

  }

 

  /**

   * Get email logs with filters

   */

  async getEmailLogs({ userId, status, entityType, limit = 50, offset = 0 }) {

    const where = { userId };

    if (status) where.status = status;

    if (entityType) where.entityType = entityType;

 

    const logs = await prisma.emailLog.findMany({

      where,

      orderBy: { createdAt: 'desc' },

      take: limit,

      skip: offset,

    });

 

    const total = await prisma.emailLog.count({ where });

 

    return { logs, total };

  }

 

  /**

   * Get email log by ID

   */

  async getEmailLog(id, userId) {

    return await prisma.emailLog.findFirst({

      where: { id, userId },

    });

  }

 

  /**

   * Get email stats for user

   */

  async getEmailStats(userId, tenantId) {

    const where = tenantId ? { userId, tenantId } : { userId };

    const total = await prisma.emailLog.count({ where });

    const sent = await prisma.emailLog.count({ where: { ...where, status: 'sent' } });

    const failed = await prisma.emailLog.count({ where: { ...where, status: 'failed' } });

    const pending = await prisma.emailLog.count({ where: { ...where, status: 'pending' } });



    return { total, sent, failed, pending };

  }

 

  /**
   * Check for replies to sent emails
   * Note: Temporarily disabled - requires tenant-specific implementation
   */
  async checkForReplies(userId) {
    console.warn('checkForReplies() temporarily disabled - requires tenant-specific OAuth implementation');
    return { success: true, repliesFound: 0, message: 'Reply checking temporarily disabled' };
  }

  /**
   * OLD checkForReplies implementation - disabled
   */
  async _oldCheckForReplies(userId) {
    try {
      const gmail = this.getGmailClient();

 

      // Get all sent emails with thread IDs

      const sentEmails = await prisma.emailLog.findMany({

        where: {

          userId,

          status: 'sent',

          gmailThreadId: { not: null },

        },

        orderBy: { sentAt: 'desc' },

      });

 

      let totalRepliesFound = 0;

      const processedThreads = new Set();

 

      for (const email of sentEmails) {

        // Skip if we've already processed this thread

        if (processedThreads.has(email.gmailThreadId)) {

          continue;

        }

        processedThreads.add(email.gmailThreadId);

 

        // Get all messages in the thread

        const thread = await gmail.users.threads.get({

          userId: 'me',

          id: email.gmailThreadId,

        });

 

        // Count messages that are not from us (replies)

        const userEmail = GMAIL_USER.toLowerCase();

        const replies = [];

 

        for (const message of thread.data.messages) {

          const headers = message.payload.headers;

          const fromHeader = headers.find(h => h.name.toLowerCase() === 'from');

          const subjectHeader = headers.find(h => h.name.toLowerCase() === 'subject');

          const dateHeader = headers.find(h => h.name.toLowerCase() === 'date');

 

          if (fromHeader && !fromHeader.value.toLowerCase().includes(userEmail)) {

            // This is a reply from someone else

            const replyDate = dateHeader ? new Date(dateHeader.value) : new Date();

 

            // Only count replies that came after the original email

            if (replyDate > email.sentAt) {

              // Get email body

              let body = '';

              if (message.payload.body && message.payload.body.data) {

                body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');

              } else if (message.payload.parts) {

                const textPart = message.payload.parts.find(p => p.mimeType === 'text/plain' || p.mimeType === 'text/html');

                if (textPart && textPart.body && textPart.body.data) {

                  body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');

                }

              }

 

              replies.push({

                from: fromHeader.value,

                subject: subjectHeader ? subjectHeader.value : email.subject,

                body: body.substring(0, 1000), // Limit body length

                receivedAt: replyDate,

                gmailMessageId: message.id,

              });

            }

          }

        }

 

        // Update the email log with reply count and create reply records

        if (replies.length > 0) {

          const lastReply = replies[replies.length - 1];

 

          await prisma.emailLog.update({

            where: { id: email.id },

            data: {

              replyCount: replies.length,

              lastReplyAt: lastReply.receivedAt,

            },

          });

 

          // Create email log entries for replies

          for (const reply of replies) {

            // Check if we already have this reply

            const existingReply = await prisma.emailLog.findFirst({

              where: {

                gmailMessageId: reply.gmailMessageId,

                userId,

              },

            });

 

            if (!existingReply) {

              await prisma.emailLog.create({

                data: {

                  to: [email.from], // Reply goes to original sender

                  from: reply.from,

                  subject: reply.subject,

                  body: reply.body,

                  status: 'sent',

                  gmailMessageId: reply.gmailMessageId,

                  gmailThreadId: email.gmailThreadId,

                  parentEmailId: email.id,

                  sentAt: reply.receivedAt,

                  userId,

                  entityType: email.entityType,

                  entityId: email.entityId,

                },

              });

              totalRepliesFound++;

            }

          }

        }

      }

 

      console.log(`✅ Checked for replies: Found ${totalRepliesFound} new replies`);

      return { success: true, repliesFound: totalRepliesFound };

    } catch (error) {

      console.error('❌ Error checking for replies:', error);

      throw new Error(`Failed to check for replies: ${error.message}`);

    }

  }

 

  /**

   * Get email with its replies

   */

  async getEmailWithReplies(emailId, userId) {

    const email = await prisma.emailLog.findFirst({

      where: { id: emailId, userId },

      include: {

        replies: {

          orderBy: { sentAt: 'asc' },

        },

      },

    });

 

    return email;

  }

}

 

module.exports = new EmailService();
