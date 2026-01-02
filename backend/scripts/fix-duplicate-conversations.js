require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { normalizePhoneNumber } = require('../utils/phoneNormalization');

const prisma = new PrismaClient();

async function fixDuplicateConversations() {
  console.log('\n🔍 Finding duplicate WhatsApp conversations...\n');

  try {
    // Get all conversations
    const allConversations = await prisma.whatsAppConversation.findMany({
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        },
        user: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'asc' } // Oldest first
    });

    console.log(`📊 Total conversations: ${allConversations.length}\n`);

    // Group conversations by userId + normalized phone number
    const conversationGroups = new Map();

    for (const conv of allConversations) {
      const normalizedResult = normalizePhoneNumber(conv.contactPhone);
      const normalizedPhone = normalizedResult.normalized || conv.contactPhone;
      const key = `${conv.userId}:${normalizedPhone}`;

      if (!conversationGroups.has(key)) {
        conversationGroups.set(key, []);
      }
      conversationGroups.get(key).push(conv);
    }

    // Find groups with duplicates
    const duplicateGroups = Array.from(conversationGroups.entries())
      .filter(([_, convs]) => convs.length > 1);

    console.log(`⚠️  Found ${duplicateGroups.length} groups with duplicate conversations:\n`);

    if (duplicateGroups.length === 0) {
      console.log('✅ No duplicate conversations found!\n');
      return;
    }

    let totalMerged = 0;
    let totalDeleted = 0;

    // Process each duplicate group
    for (const [key, conversations] of duplicateGroups) {
      const [userId, normalizedPhone] = key.split(':');
      const user = conversations[0].user;

      console.log(`\n📞 Processing duplicates for: ${normalizedPhone}`);
      console.log(`   User: ${user.name} (${user.email})`);
      console.log(`   Found ${conversations.length} conversations:\n`);

      conversations.forEach((conv, i) => {
        console.log(`   ${i + 1}. ID: ${conv.id}`);
        console.log(`      Phone: ${conv.contactPhone}`);
        console.log(`      Normalized: ${conv.contactPhoneNormalized}`);
        console.log(`      Messages: ${conv.messages.length}`);
        console.log(`      Created: ${conv.createdAt}`);
        console.log(`      AI Enabled: ${conv.aiEnabled}`);
      });

      // Keep the conversation with the most messages, or the oldest if tied
      const primaryConversation = conversations.reduce((prev, curr) => {
        if (curr.messages.length > prev.messages.length) {
          return curr;
        }
        if (curr.messages.length === prev.messages.length && curr.createdAt < prev.createdAt) {
          return curr;
        }
        return prev;
      });

      console.log(`\n   ✅ Keeping conversation: ${primaryConversation.id} (${primaryConversation.messages.length} messages)`);

      // Update primary conversation with normalized phone if not set
      if (primaryConversation.contactPhoneNormalized !== normalizedPhone) {
        const normalizedResult = normalizePhoneNumber(primaryConversation.contactPhone);
        await prisma.whatsAppConversation.update({
          where: { id: primaryConversation.id },
          data: {
            contactPhoneNormalized: normalizedResult.normalized || primaryConversation.contactPhone,
            contactPhoneCountryCode: normalizedResult.country ? `+${normalizedResult.country}` : primaryConversation.contactPhoneCountryCode
          }
        });
        console.log(`   📝 Updated normalized phone for primary conversation`);
      }

      // Merge messages from other conversations
      const duplicateConversations = conversations.filter(c => c.id !== primaryConversation.id);

      for (const duplicateConv of duplicateConversations) {
        console.log(`\n   🔄 Merging conversation: ${duplicateConv.id} (${duplicateConv.messages.length} messages)`);

        // Move messages to primary conversation
        let movedMessages = 0;
        for (const message of duplicateConv.messages) {
          try {
            // Check if this message already exists in primary conversation
            const existingMessage = await prisma.whatsAppMessage.findFirst({
              where: {
                conversationId: primaryConversation.id,
                whatsappMessageId: message.whatsappMessageId,
              }
            });

            if (!existingMessage) {
              // Move message to primary conversation
              await prisma.whatsAppMessage.update({
                where: { id: message.id },
                data: { conversationId: primaryConversation.id }
              });
              movedMessages++;
            }
          } catch (error) {
            console.log(`      ⚠️  Could not move message ${message.id}: ${error.message}`);
          }
        }

        console.log(`      ✅ Moved ${movedMessages} unique messages`);

        // Delete the duplicate conversation
        try {
          await prisma.whatsAppConversation.delete({
            where: { id: duplicateConv.id }
          });
          console.log(`      🗑️  Deleted duplicate conversation ${duplicateConv.id}`);
          totalDeleted++;
        } catch (error) {
          console.log(`      ❌ Could not delete conversation ${duplicateConv.id}: ${error.message}`);
        }
      }

      totalMerged++;
      console.log(`   ✅ Completed merging group for ${normalizedPhone}\n`);
    }

    console.log(`\n========================================`);
    console.log(`✅ Duplicate Cleanup Complete!`);
    console.log(`   Groups processed: ${totalMerged}`);
    console.log(`   Conversations deleted: ${totalDeleted}`);
    console.log(`========================================\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

fixDuplicateConversations();
