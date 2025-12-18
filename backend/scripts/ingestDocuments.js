/**
 * Document Ingestion Script
 * Ingests documents from knowledge_base folder into vector database
 *
 * Usage:
 *   node scripts/ingestDocuments.js
 *   node scripts/ingestDocuments.js --clear  (to clear and re-ingest)
 */

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const vectorDBService = require('../services/ai/vectorDB.service');
const aiConfig = require('../config/ai.config');
const pdf = require('pdf-parse');

// Supported file types
const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.json', '.pdf'];

/**
 * Read all files from knowledge base directory
 */
async function readKnowledgeBase(dir) {
  const documents = [];

  async function readDirectory(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await readDirectory(fullPath);
      } else {
        const ext = path.extname(entry.name).toLowerCase();

        if (SUPPORTED_EXTENSIONS.includes(ext)) {
          try {
            let content;
            const relativePath = path.relative(aiConfig.knowledgeBase.path, fullPath);

            if (ext === '.pdf') {
              // Read PDF file as buffer and extract text
              const dataBuffer = await fs.readFile(fullPath);
              const pdfData = await pdf(dataBuffer);
              content = pdfData.text;
            } else {
              // Read text-based files as UTF-8
              content = await fs.readFile(fullPath, 'utf-8');
            }

            documents.push({
              content,
              metadata: {
                filename: entry.name,
                path: relativePath,
                type: ext.slice(1),
                category: path.dirname(relativePath),
                timestamp: new Date().toISOString(),
              },
            });

            console.log(`✅ Read: ${relativePath}`);
          } catch (error) {
            console.error(`❌ Error reading ${fullPath}:`, error.message);
          }
        }
      }
    }
  }

  await readDirectory(dir);
  return documents;
}

/**
 * Create default knowledge base with product information
 */
async function createDefaultKnowledge() {
  const knowledgeBasePath = aiConfig.knowledgeBase.path;

  try {
    await fs.mkdir(knowledgeBasePath, { recursive: true });

    // Create default product documentation
    const productDoc = `# ${aiConfig.company.name} - Product Documentation

## Overview
${aiConfig.company.description}

**Tagline:** ${aiConfig.company.tagline}

## Core Features

### 1. Lead Management
- Capture leads from multiple sources
- Track through sales pipeline: New → Contacted → Qualified → Proposal → Negotiation → Won/Lost
- Assign leads to team members
- Set priority levels and follow-up reminders
- Track estimated deal values

**Benefits:**
- Never lose a lead
- Improve conversion rates
- Clear visibility into sales pipeline
- Automated follow-up reminders

### 2. Contact Management
- Store complete customer information
- Track all interactions and communication history
- Link contacts to companies and deals
- Segment contacts by tags and categories
- Import/export contact data

**Benefits:**
- 360-degree customer view
- Better relationship management
- Quick access to customer history
- Personalized communication

### 3. WhatsApp Integration
- Direct WhatsApp messaging from CRM
- Complete message history
- AI-powered responses (optional)
- Link conversations to contacts
- Never miss customer messages

**Benefits:**
- Centralized communication
- Faster response times
- Better customer service
- WhatsApp Business API integration

### 4. Email Integration
- Gmail integration with OAuth2
- Send and receive emails from CRM
- Automatic reply tracking
- Email templates
- Thread history

**Benefits:**
- Professional email communication
- Track all customer emails
- Email templates for consistency
- Reply tracking

### 5. Calendar & Appointments
- Schedule appointments and meetings
- Google Calendar synchronization
- Meeting reminders
- AI-powered appointment booking from WhatsApp
- Attendee management

**Benefits:**
- Never miss appointments
- Automated scheduling
- Calendar sync across devices
- Meeting reminders

### 6. Task Management
- Create and assign tasks
- Set due dates and priorities
- Track task completion
- Task notifications
- Team collaboration

**Benefits:**
- Better team coordination
- Nothing falls through cracks
- Clear accountability
- Deadline tracking

### 7. Deal Pipeline
- Visual pipeline management
- Track deal stages
- Forecast revenue
- Win/loss analysis
- Deal notes and history

**Benefits:**
- Accurate sales forecasting
- Identify bottlenecks
- Improve win rates
- Revenue visibility

### 8. Invoice Generation
- Create professional invoices
- GST-compliant (CGST, SGST, IGST)
- PDF generation
- Payment tracking
- Multiple tax rates

**Benefits:**
- Get paid faster
- Professional invoicing
- GST compliance
- Payment history

### 9. Reporting & Analytics
- Sales performance reports
- Lead conversion metrics
- Team productivity
- Revenue analytics
- Custom reports

**Benefits:**
- Data-driven decisions
- Identify top performers
- Spot trends early
- Measure ROI

## Target Customers
- Small to medium businesses in India
- Sales teams needing better lead management
- Companies using WhatsApp for business
- Teams needing centralized communication
- GST-registered businesses

## Pricing
Custom plans available based on:
- Number of users
- Features required
- Storage needs
- Support level

Contact for personalized quote.

## Technical Details
- Web-based application
- Mobile responsive
- Cloud hosted
- Data encryption
- Regular backups
- API available

## Support
- Email support
- Knowledge base
- Video tutorials
- Onboarding assistance

## Getting Started
1. Sign up for demo
2. Schedule consultation
3. Configure your CRM
4. Import existing data
5. Train your team
6. Go live!
`;

    await fs.writeFile(path.join(knowledgeBasePath, 'product-documentation.md'), productDoc);
    console.log('✅ Created default product documentation');

    // Create API documentation
    const apiDoc = `# ${aiConfig.company.name} API Documentation

## Overview
The ${aiConfig.company.name} API allows you to integrate CRM functionality into your own applications.

## Authentication
All API requests require authentication using JWT tokens.

\`\`\`javascript
Authorization: Bearer <your_jwt_token>
\`\`\`

## Base URL
\`\`\`
http://localhost:3001/api
\`\`\`

## Endpoints

### Leads
- \`GET /leads\` - List all leads
- \`POST /leads\` - Create new lead
- \`GET /leads/:id\` - Get lead details
- \`PUT /leads/:id\` - Update lead
- \`DELETE /leads/:id\` - Delete lead

### Contacts
- \`GET /contacts\` - List all contacts
- \`POST /contacts\` - Create new contact
- \`GET /contacts/:id\` - Get contact details
- \`PUT /contacts/:id\` - Update contact
- \`DELETE /contacts/:id\` - Delete contact

### WhatsApp
- \`GET /whatsapp/conversations\` - List conversations
- \`POST /whatsapp/send\` - Send message
- \`GET /whatsapp/messages/:conversationId\` - Get messages

### Calendar
- \`GET /calendar/events\` - List events
- \`POST /calendar/events\` - Create event
- \`PUT /calendar/events/:id\` - Update event
- \`DELETE /calendar/events/:id\` - Delete event

### Tasks
- \`GET /tasks\` - List tasks
- \`POST /tasks\` - Create task
- \`PUT /tasks/:id\` - Update task
- \`DELETE /tasks/:id\` - Delete task

## Rate Limits
- 100 requests per minute per user
- 1000 requests per hour per user

## Error Codes
- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

## Webhooks
Configure webhooks to receive real-time updates:
- Lead created/updated
- New WhatsApp message
- Task completed
- Event scheduled
`;

    await fs.writeFile(path.join(knowledgeBasePath, 'api-documentation.md'), apiDoc);
    console.log('✅ Created API documentation');

    return true;
  } catch (error) {
    console.error('❌ Error creating default knowledge:', error);
    return false;
  }
}

/**
 * Main ingestion process
 */
async function main() {
  const args = process.argv.slice(2);
  const shouldClear = args.includes('--clear');

  console.log('\n========================================');
  console.log('📚 DOCUMENT INGESTION');
  console.log('========================================\n');

  try {
    // Initialize vector DB
    await vectorDBService.initialize();

    // Clear if requested
    if (shouldClear) {
      console.log('🗑️ Clearing existing documents...');
      await vectorDBService.clearCollection();
    }

    // Check if knowledge base exists, create if not
    const knowledgeBasePath = aiConfig.knowledgeBase.path;
    try {
      await fs.access(knowledgeBasePath);
    } catch {
      console.log('📁 Knowledge base not found, creating default...');
      await createDefaultKnowledge();
    }

    // Read all documents
    console.log(`\n📖 Reading documents from: ${knowledgeBasePath}`);
    const documents = await readKnowledgeBase(knowledgeBasePath);

    if (documents.length === 0) {
      console.log('\n⚠️ No documents found!');
      console.log(`Place your documents (.txt, .md, .json, .pdf) in: ${knowledgeBasePath}`);
      return;
    }

    console.log(`\n📄 Found ${documents.length} documents`);

    // Ingest into vector database
    console.log('\n📤 Ingesting into vector database...');
    const result = await vectorDBService.addDocuments(documents);

    console.log(`\n✅ Successfully ingested ${result.chunksAdded} document chunks`);

    // Get stats
    const stats = await vectorDBService.getStats();
    console.log('\n📊 Vector Database Stats:');
    console.log(`   Collection: ${stats.name}`);
    console.log(`   Total Points: ${stats.pointsCount}`);
    console.log(`   Vector Size: ${stats.vectorSize}`);
    console.log(`   Distance Metric: ${stats.distance}`);

    console.log('\n========================================');
    console.log('✅ INGESTION COMPLETE');
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ INGESTION FAILED:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { readKnowledgeBase, createDefaultKnowledge };
