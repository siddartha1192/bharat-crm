# Email Template Management System

## Overview

The **Email Template Management System** is an enterprise-level solution for managing all email templates in Bharat CRM from a centralized location. This system provides a professional, maintainable way to customize and manage email communications across your organization.

## 🎯 Features

- ✅ **Centralized Management** - All templates in one place
- ✅ **Version History** - Track all changes with full history
- ✅ **Dynamic Variables** - Support for personalized content
- ✅ **Live Preview** - See changes before deploying
- ✅ **Test Emails** - Send test emails before going live
- ✅ **Template Types** - Organized by purpose
- ✅ **Usage Analytics** - Track template performance
- ✅ **Multi-tenant Support** - Isolated per tenant
- ✅ **Admin-Only Access** - Secure permissions
- ✅ **Fallback System** - Graceful degradation

## 📋 Template Types

The system supports the following template types:

### 1. **Password Reset** (`password_reset`)
Sent when users request password reset
- **Variables**: `userName`, `resetLink`, `expiryTime`
- **Trigger**: Password reset request
- **Default**: Yes

### 2. **New User Welcome** (`new_user`)
Sent when new user accounts are created
- **Variables**: `userName`, `userEmail`, `loginUrl`, `companyName`, `role`
- **Trigger**: User creation
- **Default**: Yes

### 3. **Lead Created** (`lead_created`)
Automated email when new lead is created
- **Variables**: `leadName`, `company`, `email`, `phone`, `source`, `assignedTo`
- **Trigger**: Lead creation automation
- **Default**: Yes

### 4. **Stage Change** (`stage_change`)
Automated email when lead stage changes
- **Variables**: `leadName`, `company`, `fromStage`, `toStage`, `assignedTo`, `changedBy`
- **Trigger**: Lead stage change automation
- **Default**: Yes

### 5. **Reminder Notification** (`reminder`)
Email for lead reminders and follow-ups
- **Variables**: `leadName`, `leadCompany`, `reminderMessage`, `reminderDate`, `assignedTo`
- **Trigger**: Lead reminders
- **Default**: Yes

### 6. **Form Submission** (`form_embed`)
Confirmation email when lead submits embedded form
- **Variables**: `leadName`, `leadEmail`, `formName`, `submissionData`, `submissionDate`
- **Trigger**: Form submission
- **Default**: Yes

### 7. **Billing Invoice** (`invoice`)
Email sent with billing invoices
- **Variables**: `customerName`, `invoiceNumber`, `invoiceDate`, `dueDate`, `totalAmount`, `itemsList`
- **Trigger**: Invoice generation
- **Default**: Yes

### 8. **Custom** (`custom`)
Custom templates for manual use
- **Variables**: Custom variables
- **Trigger**: Manual
- **Default**: No

## 🚀 Getting Started

### Initial Setup

1. **Run Database Migration**
   ```bash
   cd backend
   npx prisma migrate dev
   ```

2. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

3. **Seed Default Templates**
   ```bash
   node prisma/seedEmailTemplates.js
   ```

   This will create default templates for all existing tenants.

### Accessing the Template Manager

1. Log in as an **Admin** user
2. Navigate to **Settings** → **Email Templates**
3. View and manage all email templates

## 📝 Managing Templates

### Creating a New Template

1. Click **"New Template"** button
2. Fill in the details:
   - **Name**: Descriptive name (e.g., "Password Reset Email")
   - **Description**: When this template is used
   - **Type**: Select from available types
   - **Subject**: Email subject with variables
   - **HTML Body**: Full HTML template with variables
3. Use the **Preview** button to see rendered output
4. Click **Save Template**

### Editing an Existing Template

1. Click the **Edit** icon (✏️) on any template
2. Modify the content
3. Add **Change Notes** to document what changed
4. Preview your changes
5. Save to create a new version

### Using Variables

Variables allow you to personalize emails. Use double curly braces:

```html
<p>Hi {{userName}},</p>
<p>Your order {{orderNumber}} has been shipped!</p>
```

**Available Variables** are shown for each template type in the editor.

### Testing Templates

1. Click the **Send Test** icon (📧) on any template
2. Optionally enter a test email address (defaults to your email)
3. Click **Send Test**
4. Check your inbox

### Viewing Version History

1. Click the **History** icon (📜) on any template
2. View all changes over time
3. See who made each change and when
4. Read change notes

### Duplicating Templates

1. Click the **Copy** icon (📋) on any template
2. A copy will be created with " (Copy)" appended to the name
3. Edit the copy as needed

## 🔧 Technical Details

### Database Schema

#### EmailTemplate Model
```prisma
model EmailTemplate {
  id          String
  name        String
  description String?
  type        String // Template type
  subject     String
  htmlBody    String
  variables   Json? // Array of variable definitions
  isActive    Boolean
  isDefault   Boolean
  version     Int
  usageCount  Int
  testEmailCount Int
  lastUsedAt  DateTime?
  lastTestedAt DateTime?
  createdAt   DateTime
  updatedAt   DateTime
  tenantId    String
  createdBy   String
  lastEditedBy String?
  versions    EmailTemplateVersion[]
}
```

#### EmailTemplateVersion Model
```prisma
model EmailTemplateVersion {
  id          String
  templateId  String
  version     Int
  changeNotes String?
  subject     String
  htmlBody    String
  changedBy   String
  createdAt   DateTime
  tenantId    String
}
```

### API Endpoints

#### Template Management
- `GET /api/email-templates` - List all templates
- `GET /api/email-templates/:id` - Get specific template
- `POST /api/email-templates` - Create new template
- `PUT /api/email-templates/:id` - Update template
- `DELETE /api/email-templates/:id` - Delete template (non-default only)

#### Template Operations
- `POST /api/email-templates/preview` - Preview template
- `POST /api/email-templates/:id/test` - Send test email
- `POST /api/email-templates/:id/duplicate` - Duplicate template

#### Metadata
- `GET /api/email-templates/meta/types` - Get template types
- `GET /api/email-templates/meta/variables/:type` - Get variables for type
- `GET /api/email-templates/meta/analytics` - Get usage analytics

### Template Service Methods

```javascript
// Render template with variables
EmailTemplateService.renderTemplate(htmlBody, variables)

// Get template by type
EmailTemplateService.getTemplateByType(type, tenantId)

// Render template by type
EmailTemplateService.renderTemplateByType(type, tenantId, variables)

// Validate required variables
EmailTemplateService.validateTemplateVariables(template, variables)

// Track template usage
EmailTemplateService.trackUsage(templateId, isTest)

// Create version
EmailTemplateService.createVersion(templateId, updates, userId, tenantId, changeNotes)

// Get version history
EmailTemplateService.getVersionHistory(templateId)

// Preview with sample data
EmailTemplateService.previewTemplate(subject, htmlBody, type)

// Get available variables
EmailTemplateService.getAvailableVariablesByType(type)
```

### Integration Example

The system automatically integrates with email sending:

```javascript
// In email.js - Password Reset
const rendered = await EmailTemplateService.renderTemplateByType(
  'password_reset',
  user.tenantId,
  {
    userName: user.name,
    resetLink: resetUrl,
    expiryTime: '1 hour',
  }
);

await emailService.sendEmail({
  to: email,
  subject: rendered.subject,
  html: rendered.htmlBody,
  userId,
  entityType: 'PasswordReset',
});

// Track usage
await EmailTemplateService.trackUsage(rendered.templateId, false);
```

## 🎨 Template Design Guidelines

### Best Practices

1. **Keep it Simple**
   - Use clean, readable HTML
   - Avoid complex layouts
   - Test across email clients

2. **Use Variables Wisely**
   - Always provide fallbacks
   - Validate required variables
   - Use descriptive variable names

3. **Make it Responsive**
   - Use max-width: 600px for containers
   - Test on mobile devices
   - Use table layouts for compatibility

4. **Brand Consistency**
   - Use consistent colors
   - Include company logo
   - Match brand voice

5. **Accessibility**
   - Use semantic HTML
   - Include alt text for images
   - Ensure good color contrast

### Example Template Structure

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .content {
      background: #f9fafb;
      padding: 30px;
      border-radius: 0 0 8px 8px;
    }
    .button {
      display: inline-block;
      background: #2563eb;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      color: #6b7280;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{title}}</h1>
    </div>
    <div class="content">
      <p>Hi {{userName}},</p>
      <p>{{message}}</p>
      <center>
        <a href="{{actionLink}}" class="button">{{actionText}}</a>
      </center>
      <div class="footer">
        <p>Your Company Name</p>
      </div>
    </div>
  </div>
</body>
</html>
```

## 📊 Analytics & Monitoring

### Usage Metrics

The system tracks:
- **Total emails sent** per template
- **Test emails sent** per template
- **Last used date** for each template
- **Last tested date** for each template
- **Version count** per template

### Viewing Analytics

1. Navigate to **Settings** → **Email Templates**
2. View summary cards at the top:
   - Total Templates
   - Active Templates
   - Total Emails Sent
   - Tests Sent
3. Each template row shows:
   - Usage count
   - Test count
   - Last updated date

## 🔒 Security & Permissions

### Access Control

- **Admin Only**: Only users with ADMIN role can access template management
- **Tenant Isolation**: Templates are isolated per tenant
- **Version Tracking**: All changes are logged with user information

### Default Template Protection

- Default templates **cannot be deleted**
- Default templates **can be edited** (creates custom version)
- One default template per type per tenant

## 🐛 Troubleshooting

### Templates Not Showing

1. Ensure you're logged in as **Admin**
2. Check database connection
3. Verify templates were seeded: `node prisma/seedEmailTemplates.js`

### Email Not Using Template

1. Check template is **Active**
2. Verify template type matches email trigger
3. Check logs for fallback messages
4. Ensure all required variables are provided

### Template Variables Not Replacing

1. Use correct syntax: `{{variableName}}`
2. Ensure variable names match exactly
3. Check variable is provided in the data
4. Verify no typos in variable names

### Preview Not Working

1. Check template has valid HTML
2. Verify all required variables are defined
3. Check browser console for errors

## 🔄 Backup & Recovery

### Backing Up Templates

Templates are stored in your database. Use your standard database backup procedures:

```bash
# PostgreSQL example
pg_dump -U postgres -d bharat_crm -t "EmailTemplate" -t "EmailTemplateVersion" > email_templates_backup.sql
```

### Restoring Templates

```bash
# PostgreSQL example
psql -U postgres -d bharat_crm < email_templates_backup.sql
```

## 🚀 Advanced Usage

### Custom Template Types

To add a new template type:

1. Add the type to `EmailTemplateService.getAvailableVariablesByType()`
2. Add the type to the frontend type list in the API route
3. Update documentation

### Extending the System

The template system is designed to be extensible:

- Add new variables to `EmailTemplateService`
- Create custom rendering logic in `renderTemplate()`
- Add new template metadata fields as needed

## 📞 Support

For issues or questions:
- Check this documentation
- Review the codebase comments
- Create an issue in the repository

## 🎉 Summary

The Email Template Management System provides a professional, maintainable way to manage email communications in Bharat CRM. With features like version control, preview, testing, and analytics, you have complete control over your email templates from a single, intuitive interface.

**Key Benefits:**
- ⚡ Faster email template updates
- 🎯 Better control and consistency
- 📊 Usage insights and analytics
- 🔄 Version history and rollback capability
- 🧪 Test before deploying
- 👥 Multi-tenant support
- 🔒 Secure and auditable

Start managing your email templates like a pro today!
