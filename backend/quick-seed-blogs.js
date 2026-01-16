const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const simpleBlogPosts = [
  {
    slug: 'ai-powered-chatbot',
    title: 'AI-Powered Chatbot for Customer Service',
    excerpt: 'Transform your customer service with 24/7 AI-powered chatbots that understand and respond to customer queries instantly.',
    content: `# AI-Powered Chatbot for Customer Service

Transform your customer service with 24/7 AI-powered chatbots that understand and respond to customer queries instantly.

## Why AI Chatbots Matter

- 24/7 availability
- Instant responses
- Handle multiple conversations
- Reduce support costs
- Improve customer satisfaction

## Key Benefits

1. **Always Available**: Never miss a customer query
2. **Scalable**: Handle unlimited conversations simultaneously
3. **Cost-Effective**: Reduce support team workload
4. **Smart**: Learn from interactions
5. **Multilingual**: Support customers in any language`,
    category: 'AI',
    tags: ['AI', 'Chatbot', 'Customer Service'],
    author: 'Bharat CRM Team',
    status: 'published',
    publishedAt: new Date(),
    readTime: 5
  },
  {
    slug: 'whatsapp-business-integration',
    title: 'WhatsApp Business Integration for CRM',
    excerpt: 'Connect with 2 billion WhatsApp users directly from your CRM. Send messages, manage conversations, and close more deals.',
    content: `# WhatsApp Business Integration for CRM

Connect with 2 billion WhatsApp users directly from your CRM. Send messages, manage conversations, and close more deals.

## Why WhatsApp for Business?

- 98% open rate
- 2 billion active users
- Rich media support
- End-to-end encryption
- Business-friendly features

## Key Features

1. **Direct Messaging**: Send WhatsApp messages from CRM
2. **Template Messages**: Pre-approved message templates
3. **Media Sharing**: Share images, documents, videos
4. **Conversation History**: Track all customer interactions
5. **Automation**: Automated responses and workflows`,
    category: 'WhatsApp',
    tags: ['WhatsApp', 'Integration', 'Communication'],
    author: 'Bharat CRM Team',
    status: 'published',
    publishedAt: new Date(),
    readTime: 6
  },
  {
    slug: 'sales-pipeline-management',
    title: 'Visual Sales Pipeline Management',
    excerpt: 'Never lose a deal again with visual pipeline management. Track every opportunity from lead to close with ease.',
    content: `# Visual Sales Pipeline Management

Never lose a deal again with visual pipeline management. Track every opportunity from lead to close with ease.

## Pipeline Benefits

- Visual deal tracking
- Customizable stages
- Drag-and-drop interface
- Deal forecasting
- Team collaboration

## Key Features

1. **Kanban View**: Visual deal board
2. **Custom Stages**: Define your sales process
3. **Deal Scoring**: AI-powered priority ranking
4. **Forecasting**: Predict revenue accurately
5. **Reporting**: Real-time insights`,
    category: 'Sales',
    tags: ['Sales', 'Pipeline', 'CRM'],
    author: 'Bharat CRM Team',
    status: 'published',
    publishedAt: new Date(),
    readTime: 7
  },
  {
    slug: 'marketing-automation',
    title: 'Multi-Channel Marketing Automation',
    excerpt: 'Create powerful marketing campaigns across email, WhatsApp, and SMS. Automate your marketing and boost conversions.',
    content: `# Multi-Channel Marketing Automation

Create powerful marketing campaigns across email, WhatsApp, and SMS. Automate your marketing and boost conversions.

## Automation Benefits

- Save time
- Consistent messaging
- Better targeting
- Higher conversions
- Detailed analytics

## Key Features

1. **Campaign Builder**: Visual workflow designer
2. **Multi-Channel**: Email, WhatsApp, SMS
3. **Segmentation**: Target specific audiences
4. **A/B Testing**: Optimize campaigns
5. **Analytics**: Track performance`,
    category: 'Marketing',
    tags: ['Marketing', 'Automation', 'Campaigns'],
    author: 'Bharat CRM Team',
    status: 'published',
    publishedAt: new Date(),
    readTime: 8
  }
];

async function seedBlogs() {
  try {
    console.log('🌱 Starting blog seeding...\n');

    // Check if BlogPost model exists
    try {
      await prisma.blogPost.count();
    } catch (error) {
      console.error('❌ Error: BlogPost table not found. Run database migration first:');
      console.error('   cd backend && npx prisma migrate dev');
      process.exit(1);
    }

    // Delete existing posts
    const deleteResult = await prisma.blogPost.deleteMany({});
    console.log(`🗑️  Deleted ${deleteResult.count} existing blog posts\n`);

    // Insert new posts
    let created = 0;
    for (const post of simpleBlogPosts) {
      try {
        await prisma.blogPost.create({ data: post });
        console.log(`✅ Created: ${post.title}`);
        created++;
      } catch (error) {
        console.error(`❌ Failed to create: ${post.title}`);
        console.error(`   Error: ${error.message}`);
      }
    }

    console.log(`\n✨ Successfully created ${created}/${simpleBlogPosts.length} blog posts!`);

    // Verify
    const total = await prisma.blogPost.count();
    const published = await prisma.blogPost.count({ where: { status: 'published' } });
    console.log(`\n📊 Total posts: ${total}`);
    console.log(`📊 Published: ${published}`);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedBlogs();
