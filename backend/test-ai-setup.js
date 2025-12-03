/**
 * Test script to verify AI setup
 * Run with: node backend/test-ai-setup.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const openaiService = require('./services/openai');

const prisma = new PrismaClient();

async function testAISetup() {
  console.log('\n========================================');
  console.log('🔍 TESTING AI SETUP');
  console.log('========================================\n');

  // Test 1: Check environment variables
  console.log('📋 Step 1: Checking Environment Variables');
  console.log('-------------------------------------------');
  console.log('ENABLE_AI_FEATURE:', process.env.ENABLE_AI_FEATURE);
  console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ?
    `${process.env.OPENAI_API_KEY.substring(0, 10)}...` :
    '❌ NOT SET');
  console.log('OPENAI_MODEL:', process.env.OPENAI_MODEL || 'gpt-4o-mini (default)');
  console.log('OWNER_EMAIL:', process.env.OWNER_EMAIL);

  // Test 2: Check if AI service is enabled
  console.log('\n📋 Step 2: Checking AI Service Status');
  console.log('-------------------------------------------');
  const isEnabled = openaiService.isEnabled();
  console.log('AI Service Enabled:', isEnabled ? '✅ YES' : '❌ NO');

  if (!isEnabled) {
    console.log('\n⚠️  AI Service is disabled. Possible reasons:');
    console.log('   1. ENABLE_AI_FEATURE is set to "false"');
    console.log('   2. OPENAI_API_KEY is missing or invalid');
    console.log('   3. OpenAI client failed to initialize');
  }

  // Test 3: Check database schema
  console.log('\n📋 Step 3: Checking Database Schema');
  console.log('-------------------------------------------');

  try {
    // Check if aiEnabled field exists in WhatsAppConversation
    const conversations = await prisma.whatsAppConversation.findMany({
      take: 1,
      select: {
        id: true,
        contactName: true,
        aiEnabled: true
      }
    });

    console.log('✅ Database schema includes "aiEnabled" field');
    console.log(`   Found ${conversations.length} existing conversation(s)`);

    if (conversations.length > 0) {
      console.log(`   Sample: ${conversations[0].contactName} - AI Enabled: ${conversations[0].aiEnabled}`);
    }

    // Check if isAiGenerated field exists in WhatsAppMessage
    const messages = await prisma.whatsAppMessage.findMany({
      take: 1,
      select: {
        id: true,
        isAiGenerated: true
      }
    });

    console.log('✅ Database schema includes "isAiGenerated" field');

  } catch (error) {
    console.log('❌ Database schema issue:', error.message);
    console.log('\n⚠️  You may need to run database migration:');
    console.log('   cd backend');
    console.log('   npx prisma migrate dev --name add_whatsapp_ai_fields');
    console.log('   npx prisma generate');
  }

  // Test 4: Test OpenAI API connection
  console.log('\n📋 Step 4: Testing OpenAI API Connection');
  console.log('-------------------------------------------');

  if (isEnabled) {
    try {
      const testConversations = await prisma.whatsAppConversation.findMany({
        take: 1,
        where: {
          aiEnabled: true
        },
        include: {
          messages: {
            take: 5,
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      });

      if (testConversations.length > 0) {
        console.log('🧪 Testing AI response generation...');
        const testConv = testConversations[0];

        try {
          const result = await openaiService.processWhatsAppMessage(
            testConv.id,
            'Hello, can you tell me about Bharat CRM?',
            testConv.userId
          );

          if (result && result.response) {
            console.log('✅ AI API is working!');
            console.log('   Sample response:', result.response.substring(0, 100) + '...');
            console.log('   Tokens used:', result.tokensUsed);
          } else {
            console.log('❌ AI returned empty response');
          }
        } catch (apiError) {
          console.log('❌ OpenAI API Error:', apiError.message);

          if (apiError.message.includes('Incorrect API key')) {
            console.log('\n⚠️  Your API key is invalid. Please check:');
            console.log('   1. Get a valid key from https://platform.openai.com/api-keys');
            console.log('   2. Update OPENAI_API_KEY in backend/.env');
            console.log('   3. Restart the backend server');
          }
        }
      } else {
        console.log('⚠️  No conversations found to test with');
        console.log('   Send a WhatsApp message first to create a conversation');
      }
    } catch (error) {
      console.log('❌ Test failed:', error.message);
    }
  } else {
    console.log('⏭️  Skipping - AI service is not enabled');
  }

  console.log('\n========================================');
  console.log('✅ TEST COMPLETE');
  console.log('========================================\n');

  await prisma.$disconnect();
}

// Run the test
testAISetup().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
