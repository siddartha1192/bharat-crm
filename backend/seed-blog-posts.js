const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const blogPosts = [
  {
    slug: 'ai-powered-chatbot-transform-customer-conversations',
    title: 'AI-Powered Chatbot: Transform Customer Conversations into Business Insights',
    excerpt: 'Discover how AI-powered chatbots revolutionize customer interactions with 24/7 availability, instant lead qualification, and personalized conversations at scale.',
    contentFile: '01-ai-powered-chatbot.md',
    category: 'features',
    tags: ['AI', 'Chatbot', 'Automation', 'Customer Service'],
    relatedFeature: 'ai-chat',
    readTime: 8,
  },
  {
    slug: 'whatsapp-business-integration-meet-customers-where-they-are',
    title: 'WhatsApp Business Integration: Meet Your Customers Where They Are',
    excerpt: 'With 98% open rates and 2 billion users, WhatsApp Business integration transforms customer communication. Learn how to leverage this powerful channel.',
    contentFile: '02-whatsapp-business-integration.md',
    category: 'features',
    tags: ['WhatsApp', 'Communication', 'Integration', 'Messaging'],
    relatedFeature: 'whatsapp',
    readTime: 10,
  },
  {
    slug: 'visual-sales-pipeline-never-lose-a-deal',
    title: 'Visual Sales Pipeline: Never Let a Deal Fall Through the Cracks Again',
    excerpt: 'Stop losing 79% of leads due to poor follow-up. Visual pipeline management with AI-powered deal scoring helps you close more deals faster.',
    contentFile: '03-sales-pipeline-management.md',
    category: 'features',
    tags: ['Sales Pipeline', 'Deal Management', 'Forecasting', 'CRM'],
    relatedFeature: 'pipeline',
    readTime: 9,
  },
  {
    slug: 'marketing-automation-that-converts',
    title: 'Marketing Automation That Actually Converts: From Email to WhatsApp',
    excerpt: 'Multi-channel marketing automation delivers the right message to the right person at the right time. Learn how to create campaigns that convert.',
    contentFile: '04-marketing-automation.md',
    category: 'features',
    tags: ['Marketing Automation', 'Campaigns', 'Email', 'WhatsApp'],
    relatedFeature: 'automation',
    readTime: 11,
  },
  {
    slug: 'ai-voice-calling-scale-outreach',
    title: 'AI Voice Calling: Scale Your Outreach Without Losing the Human Touch',
    excerpt: 'Make 10x more calls per day with AI-powered voice calling. Natural conversations, real-time transcription, and automatic summaries transform your sales outreach.',
    content: generateAICallingContent(),
    category: 'features',
    tags: ['AI Calling', 'Sales', 'Outreach', 'Automation'],
    relatedFeature: 'ai-calls',
    readTime: 7,
  },
  {
    slug: 'predictive-analytics-know-revenue-before-it-happens',
    title: 'Predictive Analytics: Know Your Revenue Before It Happens',
    excerpt: 'AI-driven forecasting and business intelligence help you predict revenue, identify trends, and make data-driven decisions with confidence.',
    content: generateAnalyticsContent(),
    category: 'tips',
    tags: ['Analytics', 'Forecasting', 'Business Intelligence', 'Data'],
    relatedFeature: 'analytics',
    readTime: 8,
  },
  {
    slug: 'embeddable-forms-landing-pages-lead-generation',
    title: 'Embeddable Forms & Landing Pages: Turn Visitors into Qualified Leads',
    excerpt: 'No-code form builder and landing pages that automatically create CRM leads. Capture, qualify, and convert more prospects effortlessly.',
    content: generateFormsContent(),
    category: 'features',
    tags: ['Forms', 'Landing Pages', 'Lead Generation', 'Conversion'],
    relatedFeature: 'forms',
    readTime: 6,
  },
  {
    slug: 'gmail-integration-inbox-crm-powerhouse',
    title: 'Gmail Integration: Your Inbox Becomes a CRM Powerhouse',
    excerpt: 'Two-way email sync, open tracking, and automatic logging transform your Gmail into a complete CRM communication hub.',
    content: generateEmailIntegrationContent(),
    category: 'integrations',
    tags: ['Gmail', 'Email', 'Integration', 'Productivity'],
    relatedFeature: 'email',
    readTime: 7,
  },
  {
    slug: 'document-management-contracts-to-closing',
    title: 'Document Management: From Contracts to Closing in Record Time',
    excerpt: 'Centralized document storage with version control, team collaboration, and instant sharing accelerates your sales process.',
    content: generateDocumentManagementContent(),
    category: 'features',
    tags: ['Documents', 'Collaboration', 'File Management', 'Productivity'],
    relatedFeature: 'documents',
    readTime: 6,
  },
  {
    slug: 'smart-task-management-ai-handle-followups',
    title: 'Smart Task Management: Let AI Handle the Follow-Ups',
    excerpt: 'Intelligent task creation, priority scoring, and automatic reminders ensure nothing falls through the cracks. Work smarter, not harder.',
    content: generateTaskManagementContent(),
    category: 'tips',
    tags: ['Task Management', 'Automation', 'Productivity', 'AI'],
    relatedFeature: 'tasks',
    readTime: 6,
  },
];

function generateAICallingContent() {
  return `# AI Voice Calling: Scale Your Outreach Without Losing the Human Touch

## Introduction
AI-powered voice calling is revolutionizing sales outreach. Instead of manually dialing hundreds of numbers, AI assistants conduct natural conversations, qualify leads, and schedule appointments—all while you focus on closing high-value deals.

## Key Benefits
- **10x More Calls**: Your team can reach 10x more prospects per day
- **Natural Conversations**: AI uses natural language processing for human-like interactions
- **Real-Time Transcription**: Every call is automatically transcribed and summarized
- **Sentiment Analysis**: Understand prospect mood and adjust strategy
- **Perfect Follow-Up**: AI never forgets to follow up or call back

## Use Cases
1. **Cold Calling**: Initial outreach to new prospects
2. **Appointment Setting**: Schedule demos and consultations
3. **Lead Qualification**: Ask qualifying questions before passing to sales
4. **Customer Surveys**: Gather feedback at scale
5. **Event Reminders**: Reduce no-shows with friendly reminders

## Real Results
Companies using AI calling report 3x more qualified leads, 50% faster sales cycles, and 40% cost reduction compared to traditional calling methods.`;
}

function generateAnalyticsContent() {
  return `# Predictive Analytics: Know Your Revenue Before It Happens

## Introduction
Stop guessing about your numbers. Predictive analytics uses AI and historical data to forecast revenue, identify trends, and give you the insights you need to make confident business decisions.

## Key Features
- **Real-Time Dashboards**: See KPIs updated live
- **Sales Velocity Metrics**: Track how fast deals move through your pipeline
- **Win Probability Scoring**: Know which deals are likely to close
- **Team Performance**: Benchmark individuals and identify top performers
- **Trend Analysis**: Spot patterns before they become problems

## Business Impact
With accurate forecasting, you can:
- Plan hiring and scaling with confidence
- Allocate marketing budget more effectively
- Identify revenue risks early
- Set realistic quotas and goals
- Make data-driven strategic decisions`;
}

function generateFormsContent() {
  return `# Embeddable Forms & Landing Pages: Turn Visitors into Qualified Leads

## Introduction
Every website visitor is a potential customer. Embeddable forms and landing pages make it effortless to capture leads and automatically create them in your CRM.

## Key Features
- **Drag-and-Drop Builder**: No coding required
- **Mobile Responsive**: Looks perfect on all devices
- **Auto-Lead Creation**: Submissions instantly become CRM leads
- **UTM Tracking**: Know which campaigns drive the most leads
- **Conditional Logic**: Show different fields based on responses

## Use Cases
- Product demo requests
- Quote inquiries
- Event registrations
- Newsletter signups
- Lead magnets (ebooks, whitepapers)

## Best Practices
Keep forms short (3-5 fields max), use clear CTAs, and always follow up within 5 minutes of submission for 10x higher conversion rates.`;
}

function generateEmailIntegrationContent() {
  return `# Gmail Integration: Your Inbox Becomes a CRM Powerhouse

## Introduction
Your inbox is your most important business tool. Gmail integration with your CRM means every email is automatically logged, tracked, and connected to the right contact.

## Key Features
- **Two-Way Sync**: Emails sent from Gmail appear in CRM
- **Open Tracking**: Know when prospects open your emails
- **Click Tracking**: See which links they click
- **Email Templates**: Save and reuse common messages
- **Thread History**: See entire conversation in contact record

## Productivity Boost
Sales teams using email integration save 2+ hours per day on manual data entry and never lose track of important conversations.`;
}

function generateDocumentManagementContent() {
  return `# Document Management: From Contracts to Closing in Record Time

## Introduction
Stop hunting through email attachments and shared drives. Centralized document management keeps everything organized, accessible, and secure.

## Key Features
- **Attach to Records**: Link documents to contacts, deals, or leads
- **Version Control**: Track changes and maintain history
- **Quick Sharing**: Send via WhatsApp or email instantly
- **Team Collaboration**: Multiple people can work on documents
- **Organized Structure**: Find what you need in seconds

## Security
All documents are encrypted, access-controlled, and backed up automatically. Audit trails show who accessed what and when.`;
}

function generateTaskManagementContent() {
  return `# Smart Task Management: Let AI Handle the Follow-Ups

## Introduction
Never forget a follow-up again. Intelligent task management automatically creates tasks based on triggers, prioritizes your work, and reminds you at the perfect time.

## Key Features
- **Automatic Creation**: Tasks generated from deal stages, emails, calls
- **Priority Scoring**: AI determines what's most important
- **Deadline Alerts**: Get notified before tasks are due
- **Recurring Tasks**: Set up systematic follow-up schedules
- **Mobile Sync**: Tasks on your phone, tablet, and desktop

## The Result
Teams using smart task management close 35% more deals because nothing falls through the cracks.`;
}

async function seedBlogPosts() {
  console.log('🌱 Seeding blog posts...');

  for (const post of blogPosts) {
    try {
      let content;

      if (post.contentFile) {
        const filePath = path.join(__dirname, 'blog-content', post.contentFile);
        if (fs.existsSync(filePath)) {
          content = fs.readFileSync(filePath, 'utf-8');
        } else {
          console.log(`⚠️  Content file not found: ${post.contentFile}, using excerpt as content`);
          content = post.excerpt;
        }
      } else {
        content = post.content;
      }

      // Check if post already exists
      const existing = await prisma.blogPost.findUnique({
        where: { slug: post.slug },
      });

      if (existing) {
        console.log(`   ⏭️  Skipping "${post.title}" (already exists)`);
        continue;
      }

      // Create blog post
      const created = await prisma.blogPost.create({
        data: {
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          content: content,
          category: post.category,
          tags: post.tags,
          relatedFeature: post.relatedFeature,
          status: 'published',
          publishedAt: new Date(),
          readTime: post.readTime,
          author: 'CLiM CRM Team',
          authorBio: 'We help businesses leverage AI and automation to accelerate growth.',
          metaTitle: post.title,
          metaDescription: post.excerpt,
          keywords: post.tags,
        },
      });

      console.log(`   ✅ Created: "${created.title}"`);
    } catch (error) {
      console.error(`   ❌ Error creating "${post.title}":`, error.message);
    }
  }

  console.log('\n✨ Blog posts seeded successfully!\n');
}

// Run seed
seedBlogPosts()
  .catch((error) => {
    console.error('Error seeding blog posts:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
