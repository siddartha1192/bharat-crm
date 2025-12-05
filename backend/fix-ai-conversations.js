/**
 * Script to check and fix AI enabled status for existing conversations
 * Run with: node backend/fix-ai-conversations.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixConversations() {
  console.log('\n========================================');
  console.log('🔧 FIXING AI FOR EXISTING CONVERSATIONS');
  console.log('========================================\n');

  try {
    // Check all conversations
    const allConversations = await prisma.whatsAppConversation.findMany({
      select: {
        id: true,
        contactName: true,
        contactPhone: true,
        aiEnabled: true
      }
    });

    console.log(`📊 Total conversations found: ${allConversations.length}\n`);

    // Count by status
    const enabledCount = allConversations.filter(c => c.aiEnabled).length;
    const disabledCount = allConversations.filter(c => !c.aiEnabled).length;

    console.log(`✅ AI Enabled: ${enabledCount}`);
    console.log(`❌ AI Disabled: ${disabledCount}\n`);

    if (disabledCount > 0) {
      console.log('🔧 Conversations with AI disabled:');
      allConversations
        .filter(c => !c.aiEnabled)
        .forEach((c, i) => {
          console.log(`   ${i + 1}. ${c.contactName} (${c.contactPhone})`);
        });

      console.log('\n🔄 Enabling AI for all conversations...');

      const result = await prisma.whatsAppConversation.updateMany({
        where: {
          aiEnabled: false
        },
        data: {
          aiEnabled: true
        }
      });

      console.log(`✅ Updated ${result.count} conversations`);
    } else {
      console.log('✅ All conversations already have AI enabled!');
    }

    console.log('\n========================================');
    console.log('✅ COMPLETE');
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixConversations();
