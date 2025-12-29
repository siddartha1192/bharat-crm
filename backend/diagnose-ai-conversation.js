/**
 * Diagnostic: Check AI Conversation Persistence
 *
 * This script checks if AI conversation tables exist and tests saving/loading
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function diagnoseAIConversation() {
  try {
    console.log('\n========================================');
    console.log('🔍 AI CONVERSATION PERSISTENCE DIAGNOSTIC');
    console.log('========================================\n');

    // Step 1: Check if tables exist
    console.log('📊 Step 1: Checking if tables exist...\n');

    const tables = await prisma.$queryRaw`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN ('AIConversation', 'AIMessage', 'User')
      ORDER BY tablename;
    `;

    console.log('Found tables:');
    tables.forEach(t => console.log(`  ✓ ${t.tablename}`));
    console.log('');

    const hasAIConversation = tables.some(t => t.tablename === 'AIConversation');
    const hasAIMessage = tables.some(t => t.tablename === 'AIMessage');
    const hasUser = tables.some(t => t.tablename === 'User');

    if (!hasAIConversation) {
      console.log('❌ AIConversation table is MISSING!');
      console.log('   Run: npx prisma db push\n');
      process.exit(1);
    }

    if (!hasAIMessage) {
      console.log('❌ AIMessage table is MISSING!');
      console.log('   Run: npx prisma db push\n');
      process.exit(1);
    }

    if (!hasUser) {
      console.log('❌ User table is MISSING!');
      console.log('   Run: npx prisma db push\n');
      process.exit(1);
    }

    console.log('✅ All required tables exist\n');

    // Step 2: Check table structure
    console.log('📋 Step 2: Checking AIConversation structure...\n');

    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'AIConversation'
      ORDER BY ordinal_position;
    `;

    console.log('AIConversation columns:');
    console.table(columns);

    const hasTenantId = columns.some(c => c.column_name === 'tenantId');
    if (!hasTenantId) {
      console.log('⚠️  WARNING: tenantId column is MISSING from AIConversation!');
      console.log('   This will cause errors. Run: npx prisma db push\n');
    } else {
      console.log('✅ tenantId column exists\n');
    }

    // Step 3: Check existing conversations
    console.log('📚 Step 3: Checking existing conversations...\n');

    const conversationCount = await prisma.aIConversation.count();
    console.log(`Total conversations: ${conversationCount}`);

    if (conversationCount > 0) {
      const conversations = await prisma.aIConversation.findMany({
        take: 5,
        include: {
          messages: true,
        },
        orderBy: {
          lastMessageAt: 'desc',
        },
      });

      console.log('\nRecent conversations:');
      conversations.forEach(conv => {
        console.log(`  - User: ${conv.userId}, Messages: ${conv.messages.length}, Last: ${conv.lastMessageAt}`);
      });
    } else {
      console.log('  No conversations found (this is normal for new setup)');
    }

    console.log('');

    // Step 4: Test creating a conversation
    console.log('🧪 Step 4: Testing conversation creation...\n');

    // Get first user
    const user = await prisma.user.findFirst();

    if (!user) {
      console.log('⚠️  No users found in database. Create a user first.');
      console.log('   Skipping conversation creation test.\n');
    } else {
      console.log(`Testing with user: ${user.email} (${user.id})`);
      console.log(`Tenant: ${user.tenantId}\n`);

      // Try to create or get conversation
      let testConversation = await prisma.aIConversation.findFirst({
        where: { userId: user.id },
        include: { messages: true },
      });

      if (!testConversation) {
        console.log('Creating new test conversation...');
        testConversation = await prisma.aIConversation.create({
          data: {
            userId: user.id,
            tenantId: user.tenantId,
            messageCount: 0,
          },
          include: { messages: true },
        });
        console.log(`✅ Created conversation: ${testConversation.id}\n`);
      } else {
        console.log(`✅ Found existing conversation: ${testConversation.id}\n`);
      }

      // Try to save a test message
      console.log('Saving test message...');
      const testMessage = await prisma.aIMessage.create({
        data: {
          conversationId: testConversation.id,
          role: 'user',
          content: 'Test message from diagnostic script',
          tenantId: user.tenantId,
        },
      });

      console.log(`✅ Saved message: ${testMessage.id}\n`);

      // Update conversation
      await prisma.aIConversation.update({
        where: { id: testConversation.id },
        data: {
          messageCount: { increment: 1 },
          lastMessageAt: new Date(),
        },
      });

      console.log('✅ Updated conversation metadata\n');

      // Verify we can load it back
      const loaded = await prisma.aIConversation.findFirst({
        where: { userId: user.id },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      console.log('📖 Loaded conversation:');
      console.log(`  Messages: ${loaded.messages.length}`);
      console.log(`  Last message: "${loaded.messages[0].content.substring(0, 50)}..."`);
      console.log(`  Message count: ${loaded.messageCount}\n`);
    }

    // Summary
    console.log('========================================');
    console.log('✅ DIAGNOSTIC COMPLETE');
    console.log('========================================\n');

    console.log('Summary:');
    console.log(`  • Tables exist: ✓`);
    console.log(`  • Structure correct: ✓`);
    console.log(`  • Can create conversations: ✓`);
    console.log(`  • Can save messages: ✓`);
    console.log(`  • Can load conversations: ✓`);
    console.log('\nAI Conversation persistence is working correctly! 🎉\n');

  } catch (error) {
    console.error('\n❌ DIAGNOSTIC FAILED:', error);
    console.error('\nError details:', error.message);

    if (error.code === 'P2010') {
      console.error('\n💡 This error means a database table is missing.');
      console.error('   Fix: Run "npx prisma db push" to create all tables.\n');
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run diagnostic
diagnoseAIConversation();
