const { PrismaClient } = require('@prisma/client');
const { normalizePhoneNumber } = require('../utils/phoneNormalization');

const prisma = new PrismaClient();

async function cleanupDuplicateConversations() {
  console.log('🔧 Starting conversation cleanup...\n');

  try {
    // Step 1: Backfill contactPhoneNormalized for existing conversations
    console.log('📋 Step 1: Backfilling contactPhoneNormalized...');

    const conversationsWithoutNormalized = await prisma.whatsAppConversation.findMany({
      where: {
        OR: [
          { contactPhoneNormalized: null },
          { contactPhoneNormalized: '' }
        ]
      }
    });

    console.log(`   Found ${conversationsWithoutNormalized.length} conversations without normalized phone numbers`);

    for (const conv of conversationsWithoutNormalized) {
      const normalizedResult = normalizePhoneNumber(
        conv.contactPhone,
        conv.contactPhoneCountryCode || '+91'
      );

      const normalizedPhone = normalizedResult.normalized || conv.contactPhone;

      await prisma.whatsAppConversation.update({
        where: { id: conv.id },
        data: { contactPhoneNormalized: normalizedPhone }
      });

      console.log(`   ✅ Updated conversation ${conv.id}: ${conv.contactPhone} -> ${normalizedPhone}`);
    }

    console.log(`\n✅ Backfilled ${conversationsWithoutNormalized.length} conversations\n`);

    // Step 2: Find and remove duplicates
    console.log('📋 Step 2: Finding duplicate conversations...');

    // Get all conversations grouped by userId and contactPhoneNormalized
    const allConversations = await prisma.whatsAppConversation.findMany({
      orderBy: [
        { userId: 'asc' },
        { contactPhoneNormalized: 'asc' },
        { lastMessageAt: 'desc' } // Most recent first
      ]
    });

    const duplicatesMap = new Map();
    const conversationsToDelete = [];

    // Group by userId + contactPhoneNormalized
    for (const conv of allConversations) {
      const key = `${conv.userId}_${conv.contactPhoneNormalized}`;

      if (!duplicatesMap.has(key)) {
        // First occurrence - keep this one
        duplicatesMap.set(key, conv);
      } else {
        // Duplicate - mark for deletion
        conversationsToDelete.push(conv);
        console.log(`   ⚠️  Found duplicate: User ${conv.userId}, Phone ${conv.contactPhoneNormalized}`);
        console.log(`       Keeping: ${duplicatesMap.get(key).id} (last message: ${duplicatesMap.get(key).lastMessageAt})`);
        console.log(`       Deleting: ${conv.id} (last message: ${conv.lastMessageAt})`);
      }
    }

    console.log(`\n   Found ${conversationsToDelete.length} duplicate conversations to delete\n`);

    // Step 3: Delete duplicate conversations and their messages
    if (conversationsToDelete.length > 0) {
      console.log('📋 Step 3: Deleting duplicate conversations...');

      for (const conv of conversationsToDelete) {
        // Delete messages first (foreign key constraint)
        const deletedMessages = await prisma.whatsAppMessage.deleteMany({
          where: { conversationId: conv.id }
        });

        // Delete conversation
        await prisma.whatsAppConversation.delete({
          where: { id: conv.id }
        });

        console.log(`   ✅ Deleted conversation ${conv.id} and ${deletedMessages.count} messages`);
      }

      console.log(`\n✅ Deleted ${conversationsToDelete.length} duplicate conversations\n`);
    } else {
      console.log('✅ No duplicate conversations found\n');
    }

    // Step 4: Show summary
    console.log('📊 Cleanup Summary:');
    console.log(`   - Backfilled normalized phones: ${conversationsWithoutNormalized.length}`);
    console.log(`   - Removed duplicates: ${conversationsToDelete.length}`);
    console.log(`   - Total conversations remaining: ${allConversations.length - conversationsToDelete.length}\n`);

    console.log('✅ Conversation cleanup completed successfully!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupDuplicateConversations()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
