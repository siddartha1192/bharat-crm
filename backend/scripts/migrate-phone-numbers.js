/**
 * Data Migration Script: Normalize existing phone numbers
 *
 * This script normalizes all existing phone numbers in the database to E.164 format
 * for Contacts, Leads, and WhatsAppConversations.
 *
 * Usage: node scripts/migrate-phone-numbers.js
 */

const { PrismaClient } = require('@prisma/client');
const { normalizePhoneNumber } = require('../utils/phoneNormalization');

const prisma = new PrismaClient();

async function migrateContacts() {
  console.log('\n📞 Migrating Contact phone numbers...\n');

  const contacts = await prisma.contact.findMany({
    where: {
      OR: [
        { phoneNormalized: null },
        { phoneNormalized: '' }
      ]
    }
  });

  console.log(`Found ${contacts.length} contacts to migrate`);

  let successCount = 0;
  let errorCount = 0;

  for (const contact of contacts) {
    try {
      const phoneCountryCode = contact.phoneCountryCode || '+91';
      const phoneResult = normalizePhoneNumber(contact.phone, phoneCountryCode);

      let alternatePhoneNormalized = null;
      if (contact.alternatePhone) {
        const altCountryCode = contact.alternatePhoneCountryCode || '+91';
        const altResult = normalizePhoneNumber(contact.alternatePhone, altCountryCode);
        alternatePhoneNormalized = altResult.normalized;
      }

      let whatsappNormalized = null;
      if (contact.whatsapp) {
        const whatsappCountryCode = contact.whatsappCountryCode || '+91';
        const whatsappResult = normalizePhoneNumber(contact.whatsapp, whatsappCountryCode);
        whatsappNormalized = whatsappResult.normalized;
      }

      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          phoneNormalized: phoneResult.normalized,
          alternatePhoneNormalized,
          whatsappNormalized
        }
      });

      successCount++;
      console.log(`✅ ${contact.name} (${contact.company}): ${contact.phone} -> ${phoneResult.normalized}`);
    } catch (error) {
      errorCount++;
      console.error(`❌ Error migrating contact ${contact.id}:`, error.message);
    }
  }

  console.log(`\n✅ Contacts migration complete: ${successCount} success, ${errorCount} errors\n`);
}

async function migrateLeads() {
  console.log('\n📞 Migrating Lead phone numbers...\n');

  const leads = await prisma.lead.findMany({
    where: {
      OR: [
        { phoneNormalized: null },
        { phoneNormalized: '' }
      ]
    }
  });

  console.log(`Found ${leads.length} leads to migrate`);

  let successCount = 0;
  let errorCount = 0;

  for (const lead of leads) {
    try {
      const phoneCountryCode = lead.phoneCountryCode || '+91';
      const phoneResult = normalizePhoneNumber(lead.phone, phoneCountryCode);

      let whatsappNormalized = null;
      if (lead.whatsapp) {
        const whatsappCountryCode = lead.whatsappCountryCode || '+91';
        const whatsappResult = normalizePhoneNumber(lead.whatsapp, whatsappCountryCode);
        whatsappNormalized = whatsappResult.normalized;
      }

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          phoneNormalized: phoneResult.normalized,
          whatsappNormalized
        }
      });

      successCount++;
      console.log(`✅ ${lead.name} (${lead.company}): ${lead.phone} -> ${phoneResult.normalized}`);
    } catch (error) {
      errorCount++;
      console.error(`❌ Error migrating lead ${lead.id}:`, error.message);
    }
  }

  console.log(`\n✅ Leads migration complete: ${successCount} success, ${errorCount} errors\n`);
}

async function migrateWhatsAppConversations() {
  console.log('\n📞 Migrating WhatsApp Conversation phone numbers...\n');

  const conversations = await prisma.whatsAppConversation.findMany({
    where: {
      OR: [
        { contactPhoneNormalized: null },
        { contactPhoneNormalized: '' }
      ]
    }
  });

  console.log(`Found ${conversations.length} conversations to migrate`);

  let successCount = 0;
  let errorCount = 0;

  for (const conversation of conversations) {
    try {
      const phoneCountryCode = conversation.contactPhoneCountryCode || '+91';
      const phoneResult = normalizePhoneNumber(conversation.contactPhone, phoneCountryCode);

      await prisma.whatsAppConversation.update({
        where: { id: conversation.id },
        data: {
          contactPhoneNormalized: phoneResult.normalized
        }
      });

      successCount++;
      console.log(`✅ ${conversation.contactName}: ${conversation.contactPhone} -> ${phoneResult.normalized}`);
    } catch (error) {
      errorCount++;
      console.error(`❌ Error migrating conversation ${conversation.id}:`, error.message);
    }
  }

  console.log(`\n✅ Conversations migration complete: ${successCount} success, ${errorCount} errors\n`);
}

async function main() {
  console.log('🚀 Starting phone number normalization migration...\n');
  console.log('This will normalize all phone numbers to E.164 format\n');

  try {
    // Migrate contacts
    await migrateContacts();

    // Migrate leads
    await migrateLeads();

    // Migrate WhatsApp conversations
    await migrateWhatsAppConversations();

    console.log('\n✅ Migration completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
main();
