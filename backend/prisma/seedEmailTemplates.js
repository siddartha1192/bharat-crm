const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Email Template Seeder
 * Seeds default email templates for all tenants
 */

const defaultTemplates = [
  // ==========================================
  // PASSWORD RESET
  // ==========================================
  {
    name: 'Password Reset Email',
    description: 'Email sent when user requests password reset',
    type: 'password_reset',
    subject: 'Reset Your Password',
    htmlBody: `<!DOCTYPE html>
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
      <p>Hi {{userName}},</p>
      <p>You recently requested to reset your password for your Bharat CRM account. Click the button below to reset it:</p>
      <center>
        <a href="{{resetLink}}" class="button">Reset Password</a>
      </center>
      <p>Or copy and paste this URL into your browser:</p>
      <p style="word-break: break-all; color: #2563eb;">{{resetLink}}</p>
      <p><strong>This link will expire in {{expiryTime}}.</strong></p>
      <p>If you didn't request a password reset, you can safely ignore this email.</p>
      <div class="footer">
        <p>Bharat CRM - Built for Indian Businesses</p>
      </div>
    </div>
  </div>
</body>
</html>`,
    variables: [
      { name: 'userName', description: 'User\'s full name', example: 'John Doe', required: true },
      { name: 'resetLink', description: 'Password reset link', example: 'https://app.example.com/reset?token=...', required: true },
      { name: 'expiryTime', description: 'Link expiry time', example: '1 hour', required: true },
    ],
  },

  // ==========================================
  // NEW USER WELCOME
  // ==========================================
  {
    name: 'New User Welcome Email',
    description: 'Email sent when new user account is created',
    type: 'new_user',
    subject: 'Welcome to {{companyName}} - Your Account is Ready!',
    htmlBody: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .info-box { background: #e0f2fe; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Bharat CRM! 🎉</h1>
    </div>
    <div class="content">
      <p>Hi {{userName}},</p>
      <p>Your account has been created successfully for <strong>{{companyName}}</strong>!</p>

      <div class="info-box">
        <h3 style="margin-top: 0;">Your Login Details</h3>
        <p><strong>Email:</strong> {{userEmail}}</p>
        <p><strong>Role:</strong> {{role}}</p>
      </div>

      <p>Click the button below to log in and get started:</p>
      <center>
        <a href="{{loginUrl}}" class="button">Login to Your Account</a>
      </center>

      <h3>What's Next?</h3>
      <ul>
        <li>Complete your profile setup</li>
        <li>Explore the dashboard</li>
        <li>Connect your email and calendar</li>
        <li>Start managing your leads and deals</li>
      </ul>

      <p>If you have any questions, feel free to reach out to your administrator.</p>

      <div class="footer">
        <p>Bharat CRM - Built for Indian Businesses</p>
      </div>
    </div>
  </div>
</body>
</html>`,
    variables: [
      { name: 'userName', description: 'New user\'s full name', example: 'John Doe', required: true },
      { name: 'userEmail', description: 'User\'s email', example: 'john@example.com', required: true },
      { name: 'loginUrl', description: 'Login URL', example: 'https://app.example.com/login', required: true },
      { name: 'companyName', description: 'Company name', example: 'Acme Corp', required: false },
      { name: 'role', description: 'User\'s role', example: 'Sales Agent', required: false },
    ],
  },

  // ==========================================
  // LEAD CREATED
  // ==========================================
  {
    name: 'Lead Created Email',
    description: 'Automated email when new lead is created',
    type: 'lead_created',
    subject: 'Welcome! Let\'s Get Started',
    htmlBody: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #8b5cf6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome, {{leadName}}! 👋</h1>
    </div>
    <div class="content">
      <p>Hi {{leadName}},</p>
      <p>Thank you for your interest! We're excited to connect with you.</p>

      <h3>What Happens Next?</h3>
      <ul>
        <li>✅ We've received your information</li>
        <li>📞 Our team will reach out within 24 hours</li>
        <li>💼 We'll discuss how we can help your business</li>
        <li>🚀 Get started on your journey to success</li>
      </ul>

      <p>In the meantime, feel free to explore our resources or contact us directly.</p>

      <center>
        <a href="#" class="button">Learn More About Us</a>
      </center>

      <p>Looking forward to working with you!</p>
      <p><strong>{{assignedTo}}</strong></p>

      <div class="footer">
        <p>Bharat CRM - Built for Indian Businesses</p>
      </div>
    </div>
  </div>
</body>
</html>`,
    variables: [
      { name: 'leadName', description: 'Lead\'s full name', example: 'Jane Smith', required: true },
      { name: 'company', description: 'Lead\'s company', example: 'Acme Corp', required: false },
      { name: 'assignedTo', description: 'Assigned user name', example: 'John Doe', required: false },
    ],
  },

  // ==========================================
  // STAGE CHANGE
  // ==========================================
  {
    name: 'Stage Change Email',
    description: 'Automated email when lead stage changes',
    type: 'stage_change',
    subject: 'Update: Your Status Has Changed to {{toStage}}',
    htmlBody: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .stage-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
    .timeline { display: flex; align-items: center; justify-content: center; margin: 20px 0; }
    .stage { padding: 10px 20px; background: #e5e7eb; border-radius: 6px; margin: 0 10px; }
    .stage.active { background: #f59e0b; color: white; }
    .arrow { font-size: 20px; color: #9ca3af; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Status Update 📊</h1>
    </div>
    <div class="content">
      <p>Hi {{leadName}},</p>
      <p>Great news! Your status has been updated.</p>

      <div class="stage-box">
        <h3 style="margin-top: 0;">Your Journey</h3>
        <div class="timeline">
          <div class="stage">{{fromStage}}</div>
          <div class="arrow">→</div>
          <div class="stage active">{{toStage}}</div>
        </div>
      </div>

      <p>We're making progress together! Here's what this means:</p>
      <p><strong>Current Stage:</strong> {{toStage}}</p>
      <p>Your assigned representative, <strong>{{assignedTo}}</strong>, will be in touch with next steps.</p>

      <p>If you have any questions, feel free to reach out to us.</p>

      <div class="footer">
        <p>Bharat CRM - Built for Indian Businesses</p>
      </div>
    </div>
  </div>
</body>
</html>`,
    variables: [
      { name: 'leadName', description: 'Lead\'s full name', example: 'Jane Smith', required: true },
      { name: 'fromStage', description: 'Previous stage', example: 'Contacted', required: true },
      { name: 'toStage', description: 'New stage', example: 'Qualified', required: true },
      { name: 'assignedTo', description: 'Assigned user name', example: 'John Doe', required: false },
      { name: 'company', description: 'Lead\'s company', example: 'Acme Corp', required: false },
    ],
  },

  // ==========================================
  // REMINDER NOTIFICATION
  // ==========================================
  {
    name: 'Reminder Notification Email',
    description: 'Email sent for lead reminders and follow-ups',
    type: 'reminder',
    subject: 'Reminder: Follow Up with {{leadName}}',
    htmlBody: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .reminder-box { background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
    .button { display: inline-block; background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Reminder Alert</h1>
    </div>
    <div class="content">
      <p>Hi {{assignedTo}},</p>
      <p>This is a friendly reminder about your upcoming follow-up:</p>

      <div class="reminder-box">
        <h3 style="margin-top: 0;">Lead Details</h3>
        <p><strong>Name:</strong> {{leadName}}</p>
        <p><strong>Company:</strong> {{leadCompany}}</p>
        <p><strong>Due Date:</strong> {{reminderDate}}</p>
        <p><strong>Email:</strong> {{leadEmail}}</p>
        <p><strong>Phone:</strong> {{leadPhone}}</p>
      </div>

      <h3>Reminder Message:</h3>
      <p>{{reminderMessage}}</p>

      <center>
        <a href="#" class="button">View Lead Details</a>
      </center>

      <div class="footer">
        <p>Bharat CRM - Built for Indian Businesses</p>
      </div>
    </div>
  </div>
</body>
</html>`,
    variables: [
      { name: 'leadName', description: 'Lead\'s full name', example: 'Jane Smith', required: true },
      { name: 'leadCompany', description: 'Lead\'s company', example: 'Acme Corp', required: false },
      { name: 'reminderMessage', description: 'Reminder message content', example: 'Follow up on proposal', required: true },
      { name: 'reminderDate', description: 'When reminder is due', example: 'Jan 10, 2024', required: true },
      { name: 'assignedTo', description: 'User assigned to follow up', example: 'John Doe', required: false },
      { name: 'leadPhone', description: 'Lead\'s phone number', example: '+1234567890', required: false },
      { name: 'leadEmail', description: 'Lead\'s email', example: 'jane@acme.com', required: false },
    ],
  },

  // ==========================================
  // FORM SUBMISSION
  // ==========================================
  {
    name: 'Form Submission Confirmation',
    description: 'Email sent when lead submits embedded form',
    type: 'form_embed',
    subject: 'Thank You for Your Submission!',
    htmlBody: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #06b6d4; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Thank You! 🎉</h1>
    </div>
    <div class="content">
      <p>Hi {{leadName}},</p>
      <p>Thank you for submitting the <strong>{{formName}}</strong>. We've received your information and will get back to you shortly.</p>

      <h3>What We Received:</h3>
      {{submissionData}}

      <p><strong>Submitted on:</strong> {{submissionDate}}</p>

      <p>Our team will review your submission and reach out to you within 24-48 hours.</p>

      <center>
        <a href="#" class="button">Visit Our Website</a>
      </center>

      <div class="footer">
        <p>Bharat CRM - Built for Indian Businesses</p>
      </div>
    </div>
  </div>
</body>
</html>`,
    variables: [
      { name: 'leadName', description: 'Lead name from form', example: 'Jane Smith', required: true },
      { name: 'leadEmail', description: 'Lead email from form', example: 'jane@example.com', required: false },
      { name: 'formName', description: 'Name of the form submitted', example: 'Contact Us Form', required: true },
      { name: 'submissionData', description: 'All form data as HTML', example: '<ul><li>Name: Jane</li></ul>', required: false },
      { name: 'submissionDate', description: 'When form was submitted', example: 'January 8, 2024 10:30 AM', required: false },
    ],
  },

  // ==========================================
  // INVOICE
  // ==========================================
  {
    name: 'Billing Invoice Email',
    description: 'Email sent with billing invoices',
    type: 'invoice',
    subject: 'Invoice {{invoiceNumber}} from Bharat CRM',
    htmlBody: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .invoice-details { background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin: 20px 0; }
    .total { font-size: 24px; color: #059669; font-weight: bold; }
    .button { display: inline-block; background: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📄 Invoice</h1>
    </div>
    <div class="content">
      <p>Hi {{customerName}},</p>
      <p>Thank you for your business! Please find your invoice details below.</p>

      <div class="invoice-details">
        <h3 style="margin-top: 0;">Invoice Information</h3>
        <p><strong>Invoice Number:</strong> {{invoiceNumber}}</p>
        <p><strong>Invoice Date:</strong> {{invoiceDate}}</p>
        <p><strong>Due Date:</strong> {{dueDate}}</p>

        <h3>Items:</h3>
        {{itemsList}}

        <hr>
        <p class="total">Total: {{totalAmount}}</p>
      </div>

      <center>
        <a href="{{paymentLink}}" class="button">Pay Now</a>
      </center>

      <p>If you have any questions about this invoice, please don't hesitate to reach out.</p>

      <div class="footer">
        <p>{{companyName}}</p>
        <p>Bharat CRM - Built for Indian Businesses</p>
      </div>
    </div>
  </div>
</body>
</html>`,
    variables: [
      { name: 'customerName', description: 'Customer name', example: 'John Doe', required: true },
      { name: 'invoiceNumber', description: 'Invoice number', example: 'INV-2024-001', required: true },
      { name: 'invoiceDate', description: 'Invoice date', example: 'January 8, 2024', required: true },
      { name: 'dueDate', description: 'Payment due date', example: 'January 22, 2024', required: true },
      { name: 'totalAmount', description: 'Total invoice amount', example: '$1,234.56', required: true },
      { name: 'itemsList', description: 'HTML table of invoice items', example: '<table>...</table>', required: true },
      { name: 'paymentLink', description: 'Payment link', example: 'https://pay.example.com/...', required: false },
      { name: 'companyName', description: 'Your company name', example: 'Bharat CRM', required: false },
    ],
  },
];

async function seedEmailTemplates() {
  console.log('🌱 Starting email template seeding...');

  try {
    // Get all tenants
    const tenants = await prisma.tenant.findMany();

    if (tenants.length === 0) {
      console.log('⚠️  No tenants found. Please create tenants first.');
      return;
    }

    console.log(`📊 Found ${tenants.length} tenant(s)`);

    for (const tenant of tenants) {
      console.log(`\n🏢 Processing tenant: ${tenant.name} (${tenant.id})`);

      // Get first admin user for this tenant
      const adminUser = await prisma.user.findFirst({
        where: {
          tenantId: tenant.id,
          role: 'ADMIN',
        },
      });

      if (!adminUser) {
        console.log(`   ⚠️  No admin user found for tenant ${tenant.name}, skipping...`);
        continue;
      }

      console.log(`   👤 Using admin user: ${adminUser.name} (${adminUser.email})`);

      // Seed each template
      for (const templateData of defaultTemplates) {
        try {
          // Check if template already exists
          const existing = await prisma.emailTemplate.findFirst({
            where: {
              tenantId: tenant.id,
              type: templateData.type,
              isDefault: true,
            },
          });

          if (existing) {
            console.log(`   ⏭️  Template "${templateData.name}" already exists, skipping...`);
            continue;
          }

          // Create template
          const template = await prisma.emailTemplate.create({
            data: {
              ...templateData,
              isDefault: true,
              isActive: true,
              version: 1,
              tenantId: tenant.id,
              createdBy: adminUser.id,
            },
          });

          // Create initial version
          await prisma.emailTemplateVersion.create({
            data: {
              templateId: template.id,
              version: 1,
              subject: template.subject,
              htmlBody: template.htmlBody,
              changedBy: adminUser.id,
              tenantId: tenant.id,
              changeNotes: 'Initial default template',
            },
          });

          console.log(`   ✅ Created template: ${templateData.name}`);
        } catch (error) {
          console.error(`   ❌ Error creating template "${templateData.name}":`, error.message);
        }
      }
    }

    console.log('\n🎉 Email template seeding completed!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run seeder if called directly
if (require.main === module) {
  seedEmailTemplates()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { seedEmailTemplates, defaultTemplates };
