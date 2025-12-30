const nodemailer = require('nodemailer');
const { PrismaClient } = require('@prisma/client');
const { google } = require('googleapis');
const gmailIntegrationService = require('./gmailIntegration');
const { decrypt } = require('../utils/encryption');

const prisma = new PrismaClient();


class EmailService {

  /**
   * Get nodemailer transporter with tenant-specific Gmail OAuth2
   * ONLY works with user Gmail integration - no .env fallback
   *
   * @param {Object} user - User object with Gmail tokens
   * @param {Object} tenant - Tenant object with mail settings
   * @returns {Promise<Transporter>} - Nodemailer transporter
   */
  async getTransporter(user = null, tenant = null) {
    try {
      // Check if user has Gmail connected
      if (!user || !tenant || !gmailIntegrationService.isGmailConnected(user)) {
        throw new Error(
          'Gmail not connected. Please connect your Gmail account in Settings > Integrations to send emails.'
        );
      }

      console.log(`📧 [Tenant: ${tenant.id}] Using user-specific Gmail integration for ${user.email}`);

      // Check if tenant has mail OAuth configured
      if (!tenant.settings?.mail?.oauth?.clientId) {
        throw new Error(
          'Tenant mail OAuth not configured. Please ask your administrator to configure mail settings in Settings > API Config > Mail Integration.'
        );
      }

      // Get tenant OAuth client credentials
      const clientId = tenant.settings.mail.oauth.clientId;
      const clientSecret = decrypt(tenant.settings.mail.oauth.clientSecret);
      // IMPORTANT: Use same redirect URI as gmailIntegration service
      const redirectUri = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/integrations/gmail/callback`;

      console.log(`🔧 [Debug] OAuth Configuration:`, {
        clientIdPrefix: clientId?.substring(0, 20) + '...',
        hasClientSecret: !!clientSecret,
        redirectUri,
        frontendUrl: process.env.FRONTEND_URL,
      });

      // Create tenant-specific OAuth2 client
      const tenantOAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

      // Check if token is expired
      const tokenExpired = user.gmailTokenExpiry && new Date(user.gmailTokenExpiry) <= new Date();

      if (tokenExpired) {
        console.log(`🔄 [Tenant: ${tenant.id}] Gmail token expired for user ${user.id}, refreshing...`);
        await gmailIntegrationService.refreshUserTokens(user.id, tenant);

        // Reload user with fresh tokens
        const updatedUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            gmailAccessToken: true,
            gmailRefreshToken: true,
            gmailTokenExpiry: true,
            googleEmail: true,
          },
        });

        user = updatedUser;
      }

      // Set credentials
      tenantOAuth2Client.setCredentials({
        access_token: user.gmailAccessToken,
        refresh_token: user.gmailRefreshToken,
        expiry_date: user.gmailTokenExpiry ? new Date(user.gmailTokenExpiry).getTime() : undefined,
      });

      console.log(`🔧 [Debug] User Token Info:`, {
        userId: user.id,
        userEmail: user.googleEmail || user.email,
        hasAccessToken: !!user.gmailAccessToken,
        hasRefreshToken: !!user.gmailRefreshToken,
        tokenExpiry: user.gmailTokenExpiry,
        tokenExpired: tokenExpired,
      });

      let accessToken;
      try {
        accessToken = await tenantOAuth2Client.getAccessToken();
        console.log(`✅ [Debug] Successfully got access token`);
      } catch (tokenError) {
        console.error(`❌ [Debug] Failed to get access token:`, tokenError.message);
        console.error(`❌ [Debug] Token error details:`, {
          error: tokenError.message,
          code: tokenError.code,
          response: tokenError.response?.data
        });
        throw new Error(`Failed to get Gmail access token: ${tokenError.message}. This usually means the OAuth configuration doesn't match. Please reconnect Gmail in Settings > Integrations.`);
      }

      console.log(`🔧 [Debug] Creating transporter with:`, {
        user: user.googleEmail || user.email,
        hasAccessToken: !!accessToken.token,
      });

      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: user.googleEmail || user.email,
          clientId: clientId,
          clientSecret: clientSecret,
          refreshToken: user.gmailRefreshToken,
          accessToken: accessToken.token,
        },
      });
    } catch (error) {
      console.error(`❌ [Tenant: ${tenant?.id}] Error creating email transporter:`, error.message);

      // Check if it's a decryption error
      if (error.message && error.message.includes('decrypt')) {
        throw new Error(
          'Cannot decrypt mail configuration. Please ask your administrator to:\n' +
          '1. Set ENCRYPTION_KEY in .env file (run: node scripts/generate-encryption-key.js)\n' +
          '2. Reconfigure mail settings in Settings > API Config > Mail Integration'
        );
      }

      // Check if it's an authentication error
      if (error.message &&
          (error.message.includes('invalid_grant') ||
           error.message.includes('BadCredentials') ||
           error.message.includes('Username and Password not accepted'))) {
        throw new Error('Gmail authentication failed. Please reconnect your Gmail account in Settings > Integrations.');
      }

      throw error;
    }
  }


  /**
   * Get Gmail API client
   * Note: This method is deprecated as it relied on global OAuth credentials
   * Use tenant-specific Gmail integration instead
   */
  getGmailClient() {
    throw new Error('getGmailClient() is deprecated. Use tenant-specific Gmail integration.');
  }

  /**
   * Get thread ID from Gmail message ID
   * Note: Temporarily disabled - requires tenant-specific implementation
   */
  async getThreadIdFromMessageId(messageId) {
    console.warn('getThreadIdFromMessageId() temporarily disabled - requires tenant-specific OAuth implementation');
    return null;
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

    // Determine sender email (use Google email if available, otherwise fallback)
    const senderEmail = user.googleEmail || user.email || GMAIL_USER;

    // Create email log entry
    const emailLog = await prisma.emailLog.create({
      data: {
        to: toArray,
        cc: ccArray,
        bcc: bccArray,
        from: senderEmail,
        subject,
        body: text,
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
      // Use tenant-specific Gmail integration with automatic fallback
      const transporter = await this.getTransporter(user, user.tenant);

 

      const mailOptions = {

        from: `Bharat CRM <${senderEmail}>`,

        to: toArray.join(', '),

        cc: ccArray.length > 0 ? ccArray.join(', ') : undefined,

        bcc: bccArray.length > 0 ? bccArray.join(', ') : undefined,

        subject,

        text,

        html,

        attachments: attachments.length > 0 ? attachments : undefined,

      };

 

      const info = await transporter.sendMail(mailOptions);

 

      // Get Gmail thread ID (async, don't block the response)

      setTimeout(async () => {

        try {

          const gmailData = await this.getThreadIdFromMessageId(info.messageId);

          if (gmailData) {

            await prisma.emailLog.update({

              where: { id: emailLog.id },

              data: {

                gmailMessageId: gmailData.gmailMessageId,

                gmailThreadId: gmailData.gmailThreadId,

              },

            });

          }

        } catch (error) {

          console.error('Error updating Gmail thread ID:', error);

        }

      }, 3000); // Wait 3 seconds for Gmail to index the message

 

      // Update email log with success

      await prisma.emailLog.update({

        where: { id: emailLog.id },

        data: {

          status: 'sent',

          messageId: info.messageId,

          sentAt: new Date(),

        },

      });

 

      console.log('✅ Email sent successfully:', info.messageId);

      return { success: true, emailLogId: emailLog.id, messageId: info.messageId };

    } catch (error) {

      console.error('❌ Error sending email:', error);

 

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

   */

  async sendPasswordResetEmail(email, resetToken, userId) {
    console.log('📧 Sending password reset email:', { email, userId, hasToken: !!resetToken });

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/reset-password?token=${resetToken}`;



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

 

    const text = `

      Reset Your Password

 

      You recently requested to reset your password for your Bharat CRM account.

 

      Click the link below to reset it:

      ${resetUrl}

 

      This link will expire in 1 hour.

 

      If you didn't request a password reset, you can safely ignore this email.

 

      Bharat CRM - Built for Indian Businesses

    `;

 

    return await this.sendEmail({

      to: email,

      subject: 'Reset Your Bharat CRM Password',

      text,

      html,

      userId,

      entityType: 'PasswordReset',

    });

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
