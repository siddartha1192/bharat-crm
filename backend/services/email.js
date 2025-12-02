const nodemailer = require('nodemailer');
const { PrismaClient } = require('@prisma/client');
const { google } = require('googleapis');

const prisma = new PrismaClient();

// Gmail OAuth2 configuration
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GMAIL_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GMAIL_REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;
const GMAIL_REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || 'https://developers.google.com/oauthplayground';

const oauth2Client = new google.auth.OAuth2(
  GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET,
  GMAIL_REDIRECT_URI
);

// Set refresh token
if (GMAIL_REFRESH_TOKEN) {
  oauth2Client.setCredentials({
    refresh_token: GMAIL_REFRESH_TOKEN,
  });
}

class EmailService {
  /**
   * Get nodemailer transporter with Gmail OAuth2
   */
  async getTransporter() {
    try {
      const accessToken = await oauth2Client.getAccessToken();

      return nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: GMAIL_USER,
          clientId: GMAIL_CLIENT_ID,
          clientSecret: GMAIL_CLIENT_SECRET,
          refreshToken: GMAIL_REFRESH_TOKEN,
          accessToken: accessToken.token,
        },
      });
    } catch (error) {
      console.error('Error creating email transporter:', error);
      throw new Error('Failed to create email transporter');
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
    const toArray = Array.isArray(to) ? to : [to];
    const ccArray = Array.isArray(cc) ? cc : (cc ? [cc] : []);
    const bccArray = Array.isArray(bcc) ? bcc : (bcc ? [bcc] : []);

    // Create email log entry
    const emailLog = await prisma.emailLog.create({
      data: {
        to: toArray,
        cc: ccArray,
        bcc: bccArray,
        from: GMAIL_USER,
        subject,
        body: text,
        htmlBody: html || null,
        status: 'pending',
        userId,
        entityType,
        entityId,
        attachments: attachments.length > 0 ? attachments : null,
      },
    });

    try {
      const transporter = await this.getTransporter();

      const mailOptions = {
        from: `Bharat CRM <${GMAIL_USER}>`,
        to: toArray.join(', '),
        cc: ccArray.length > 0 ? ccArray.join(', ') : undefined,
        bcc: bccArray.length > 0 ? bccArray.join(', ') : undefined,
        subject,
        text,
        html,
        attachments: attachments.length > 0 ? attachments : undefined,
      };

      const info = await transporter.sendMail(mailOptions);

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
  async getEmailStats(userId) {
    const total = await prisma.emailLog.count({ where: { userId } });
    const sent = await prisma.emailLog.count({ where: { userId, status: 'sent' } });
    const failed = await prisma.emailLog.count({ where: { userId, status: 'failed' } });
    const pending = await prisma.emailLog.count({ where: { userId, status: 'pending' } });

    return { total, sent, failed, pending };
  }
}

module.exports = new EmailService();
