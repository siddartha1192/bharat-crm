# Bharat CRM - Enterprise Features Demo Guide

## Overview
This document covers all enterprise-grade features implemented in Bharat CRM, organized by feature category for easy demonstration.

---

## 1. Sales Forecasting & Analytics

### Location
**Navigation:** Main Menu → Sales Forecast

### Features

#### 1.1 Revenue Trend Analysis
- **Line Chart** showing revenue trends over time
- Monthly revenue projections
- Visual trend indicators
- Historical data comparison

#### 1.2 Pipeline Analysis
- **Bar Chart** displaying deals by stage
- Value breakdown per pipeline stage
- Stage-wise revenue visualization
- Quick insights into deal distribution

#### 1.3 Team Performance Dashboard
- **Bar Chart** showing individual team member performance
- Revenue generated per team member
- Comparative performance metrics
- Team productivity insights

#### 1.4 Pipeline Health & Aging Analysis
- **Pie Chart** showing deal age distribution
- Categories: 0-30 days, 31-60 days, 61-90 days, 90+ days
- Visual health indicators
- Identify stale opportunities

### Demo Flow
1. Navigate to Sales Forecast page
2. Show revenue trends over time
3. Demonstrate pipeline stage breakdown
4. Highlight team performance metrics
5. Explain aging analysis for pipeline health

---

## 2. Lead Automation System

### Location
**Navigation:** Settings → Automation

### Features

#### 2.1 Lead Creation Automation
- **Trigger:** Automatic email when a new lead is created
- **Template:** Professional HTML email with branding
- **Variables:** Dynamic placeholders (name, company, email, stage)
- **Default Template Includes:**
  - Welcome header with gradient design
  - Personalized greeting using lead name
  - Next steps information
  - Professional footer with branding
  - Responsive design

#### 2.2 Stage Change Automation
- **Trigger:** Automatic email when lead moves between stages
- **Configurable From/To Stages:** Admin/Manager can select specific stage transitions
- **Template:** Status update email with timeline
- **Variables:** {{name}}, {{company}}, {{fromStage}}, {{toStage}}
- **Default Template Includes:**
  - Status update header
  - Progress badge showing new stage
  - Visual timeline (previous → current)
  - Encouraging message
  - Professional footer

#### 2.3 Automation Rule Management
- **Create Custom Rules:** Name, trigger type, email templates
- **Enable/Disable Toggle:** Turn rules on/off without deleting
- **Custom Templates:** Full HTML customization or use defaults
- **Template Variables:** Support for dynamic content replacement
  - `{{name}}` - Lead name
  - `{{company}}` - Company name
  - `{{email}}` - Lead email
  - `{{stage}}` - Current stage
  - `{{fromStage}}` - Previous stage
  - `{{toStage}}` - New stage

#### 2.4 Email Integration
- Uses existing Gmail OAuth2 integration
- Sends from authenticated user's email
- Full email logging in database
- Tracks sent status and delivery

### Demo Flow
1. Navigate to Settings → Automation
2. Show existing automation rules list
3. Create new "Lead Created" automation
   - Show enable/disable toggle
   - Demonstrate default template usage (leave fields empty)
4. Create "Stage Change" automation
   - Select From Stage: "new"
   - Select To Stage: "qualified"
   - Show custom template with variables
5. Create a test lead to trigger automation
6. Move lead to different stage to show stage change email
7. Check email logs to verify delivery

---

## 3. Document Management for Leads

### Location
**Navigation:** Leads → Open any lead → Documents tab

### Features

#### 3.1 Document Upload
- **File Upload:** Drag & drop or browse
- **File Size Limit:** 100MB maximum
- **Supported Formats:** All file types (PDF, DOC, XLS, images, etc.)
- **Unique Storage:** Each lead gets unique subfolder
  - Format: `documents/Lead/{leadId}/`
  - Organized and isolated storage

#### 3.2 Document Management
- **View Documents:** List all uploaded documents
- **File Details:** Name, size, upload date, uploaded by
- **Download:** Direct download functionality
- **Delete:** Remove documents (with confirmation)
- **Real-time Updates:** No backend restart required

#### 3.3 Storage Structure
- Organized by entity type (Lead, Contact, Deal, Task)
- Unique subfolders per lead ID
- Prevents file conflicts
- Easy backup and migration

### Demo Flow
1. Open any lead from Leads page
2. Navigate to Documents tab
3. Upload a sample document (PDF or image)
4. Show file appears immediately
5. Download the document
6. Upload another file to show multiple files
7. Delete a file with confirmation
8. Show unique folder structure in backend

---

## 4. Vector Database Management

### Location
**Navigation:** Settings → Vector Database

### Features

#### 4.1 Document Upload for AI
- **Upload Files:** Add documents to knowledge base
- **File Size Limit:** 50MB maximum
- **Supported Formats:** TXT, PDF, DOC, MD, etc.
- **Storage Location:** `knowledge_base/` folder
- **Automatic Organization:** Files ready for ingestion

#### 4.2 GUI-Based Ingest Process
- **Run Ingest Button:** Execute script from interface
- **Command:** Runs `node scripts/ingestDocuments.js --clear`
- **Background Process:** Non-blocking execution
- **Admin Only:** Restricted to admin users
- **Clear Flag:** Removes old embeddings before adding new

#### 4.3 Backend Management
- **Restart Backend Button:** Graceful server restart
- **Admin Only:** Security restriction
- **Safe Restart:** Gives 1 second for cleanup
- **Use Case:** Apply configuration changes without SSH

#### 4.4 Upload History
- View all uploaded files
- File metadata (name, size, date)
- Upload status tracking
- Uploaded by user information

### Demo Flow
1. Navigate to Settings → Vector Database
2. Upload a knowledge base document (under 50MB)
3. Show file appears in uploaded files list
4. Click "Run Ingest Process" button
   - Explain it runs in background
   - Show success notification
5. Show "Restart Backend" button (Admin only)
   - Explain when to use it
   - Warning about server restart

---

## 5. Supporting Features & Infrastructure

### 5.1 Email Service Integration
- **OAuth2 Authentication:** Secure Gmail integration
- **Email Logging:** All emails logged to database
- **Status Tracking:** Pending, sent, failed
- **Entity Linking:** Emails linked to leads/contacts/deals
- **Attachment Support:** Send files with emails

### 5.2 User Roles & Permissions
- **ADMIN:** Full access to all features
- **MANAGER:** Automation management, document access
- **AGENT:** Basic lead management
- **VIEWER:** Read-only access

### 5.3 Database Schema
New models added:
- `AutomationRule` - Stores automation configurations
- `Document` - Document metadata and references
- `SalesForecast` - Forecast data and calculations
- `VectorDataUpload` - Knowledge base upload tracking

---

## 6. Demo Script (Recommended Order)

### Part 1: Analytics (5 minutes)
1. Start with Sales Forecast page
2. Explain business value of each chart
3. Show how data updates with real deals
4. Highlight actionable insights

### Part 2: Automation (10 minutes)
1. Show automation settings
2. Create "Welcome Email" rule
3. Create "Stage Change" rule with specific stages
4. Test by creating new lead
5. Test by moving lead to different stage
6. Check email inbox for automated emails
7. Show email logs in system

### Part 3: Document Management (5 minutes)
1. Open a lead
2. Upload multiple documents
3. Show organization in unique folders
4. Download and delete examples
5. Explain no-restart architecture

### Part 4: Vector Database (5 minutes)
1. Upload knowledge base document
2. Run ingest process from GUI
3. Explain AI/chatbot integration potential
4. Show admin-only restart feature

---

## 7. Technical Highlights

### Architecture Benefits
- **No Restart Required:** File uploads don't require backend restart
- **Background Processing:** Long-running tasks don't block UI
- **Scalable Storage:** Organized folder structure
- **Secure:** Role-based access control
- **Integrated:** Uses existing email service
- **Efficient:** Minimal database queries

### Technologies Used
- **Frontend:** React 18.3, TypeScript, Tailwind CSS
- **UI Components:** Shadcn UI, Recharts
- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL with Prisma ORM
- **File Upload:** Multer middleware
- **Email:** Gmail OAuth2 with Nodemailer
- **Charts:** Recharts library

---

## 8. Common Demo Questions & Answers

**Q: Can we customize the email templates?**
A: Yes! You can create fully custom HTML templates with CSS styling, or use the beautiful defaults.

**Q: What happens if the email fails?**
A: All emails are logged with status. Failed emails are tracked and can be retried.

**Q: Can we limit which stages trigger emails?**
A: Absolutely! For stage change automation, you select exactly which from→to stage transitions trigger emails.

**Q: Are documents backed up?**
A: Documents are stored in organized folders that can be easily backed up or migrated.

**Q: Can regular users restart the backend?**
A: No, only ADMIN users can restart the backend for security reasons.

**Q: How long does the ingest process take?**
A: It runs in the background, typically completing in 1-5 minutes depending on file size.

**Q: Can we track who uploaded documents?**
A: Yes, every document upload is tracked with user ID and timestamp.

**Q: Does automation work for contacts and deals too?**
A: Currently implemented for leads, but the architecture supports easy expansion to contacts and deals.

---

## 9. Future Enhancement Opportunities

Based on this foundation, you can easily add:
- SMS automation triggers
- Webhook integrations
- Slack/Teams notifications
- Custom automation actions (create tasks, assign leads)
- Scheduled automation (time-based triggers)
- A/B testing for email templates
- Analytics on automation performance
- Document versioning
- Document sharing with clients
- OCR for document search

---

## 10. Setup Verification Checklist

Before demo, verify:
- [ ] Database migrations are run
- [ ] Gmail OAuth2 is configured
- [ ] At least one automation rule exists
- [ ] Sample leads with valid email addresses
- [ ] Sample documents ready for upload
- [ ] Admin user account available
- [ ] All environment variables set
- [ ] Backend server is running
- [ ] Frontend is running
- [ ] Knowledge base folder exists

---

## Contact & Support

For questions about these features or to request enhancements, contact your development team.

**Version:** 1.0
**Last Updated:** December 2025
**Features Implemented By:** Claude (Anthropic AI Assistant)
