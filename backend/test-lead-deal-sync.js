/**
 * Test script to verify Lead-Deal synchronization
 * Run with: node backend/test-lead-deal-sync.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testLeadDealSync() {
  console.log('🧪 Starting Lead-Deal Sync Test...\n');

  try {
    // Find a user to test with
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error('❌ No users found in database');
      return;
    }
    console.log(`✅ Testing with user: ${user.email}\n`);

    // Step 1: Create a new Lead (should auto-create Deal)
    console.log('📝 Step 1: Creating a new Lead...');
    const lead = await prisma.lead.create({
      data: {
        name: 'Test Lead for Sync',
        company: 'Test Company Ltd',
        email: 'test@example.com',
        phone: '1234567890',
        source: 'web-form',
        status: 'new',
        priority: 'medium',
        estimatedValue: 100000,
        assignedTo: user.name,
        userId: user.id
      }
    });
    console.log(`✅ Lead created: ${lead.id} (status: ${lead.status})`);
    console.log(`   dealId: ${lead.dealId || 'NULL - ⚠️ NO DEAL LINKED!'}\n`);

    if (!lead.dealId) {
      console.error('❌ TEST FAILED: Lead should have been auto-linked to a Deal!');
      console.error('   This means the POST /leads endpoint is not creating the Deal.');
      return;
    }

    // Step 2: Verify Deal was created
    console.log('📝 Step 2: Verifying Deal was auto-created...');
    const deal = await prisma.deal.findUnique({
      where: { id: lead.dealId }
    });

    if (!deal) {
      console.error(`❌ TEST FAILED: Deal ${lead.dealId} not found!`);
      return;
    }
    console.log(`✅ Deal found: ${deal.id} (stage: ${deal.stage})`);
    console.log(`   Expected stage 'lead' for status 'new': ${deal.stage === 'lead' ? '✅' : '❌'}\n`);

    // Step 3: Update Deal stage via "dropdown simulation" (send all fields)
    console.log('📝 Step 3: Updating Deal stage to "qualified" (simulating dropdown edit)...');
    const updatedDeal = await prisma.deal.update({
      where: { id: deal.id },
      data: {
        stage: 'qualified',
        title: deal.title,
        company: deal.company,
        contactName: deal.contactName,
        value: deal.value,
        probability: deal.probability,
        expectedCloseDate: deal.expectedCloseDate,
        assignedTo: deal.assignedTo,
        notes: deal.notes,
        tags: deal.tags
      }
    });
    console.log(`✅ Deal updated to stage: ${updatedDeal.stage}\n`);

    // Step 4: Check if Lead status was synced
    console.log('📝 Step 4: Checking if Lead status was synced...');
    const updatedLead = await prisma.lead.findUnique({
      where: { id: lead.id }
    });

    console.log(`   Lead status: ${updatedLead.status}`);
    console.log(`   Expected: 'qualified'`);

    if (updatedLead.status === 'qualified') {
      console.log('   ✅ SYNC SUCCESSFUL!\n');
    } else {
      console.log('   ❌ SYNC FAILED! Status did not update.\n');
      console.log('   This means the Deal PUT endpoint is NOT syncing to Lead.');
    }

    // Step 5: Test drag-and-drop simulation (only stage field)
    console.log('📝 Step 5: Updating Deal stage to "proposal" (simulating drag-and-drop)...');
    const dragDropUpdate = await prisma.deal.update({
      where: { id: deal.id },
      data: {
        stage: 'proposal'
      }
    });
    console.log(`✅ Deal updated to stage: ${dragDropUpdate.stage}\n`);

    // Step 6: Check if Lead status was synced again
    console.log('📝 Step 6: Checking if Lead status was synced again...');
    const finalLead = await prisma.lead.findUnique({
      where: { id: lead.id }
    });

    console.log(`   Lead status: ${finalLead.status}`);
    console.log(`   Expected: 'proposal'`);

    if (finalLead.status === 'proposal') {
      console.log('   ✅ DRAG-AND-DROP SYNC SUCCESSFUL!\n');
    } else {
      console.log('   ❌ DRAG-AND-DROP SYNC FAILED!\n');
    }

    // Cleanup
    console.log('🧹 Cleaning up test data...');
    await prisma.lead.delete({ where: { id: lead.id } });
    await prisma.deal.delete({ where: { id: deal.id } });
    console.log('✅ Cleanup complete\n');

    console.log('🎉 Test completed!');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLeadDealSync();
